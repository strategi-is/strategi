import crypto from 'crypto';
import { prisma } from '../prisma/client';
import { config } from '../config';

const ALGORITHM = 'aes-256-gcm';

// Derive a stable 32-byte key from ENCRYPTION_KEY (which may be any hex length)
function deriveKey(): Buffer {
  return crypto.createHash('sha256').update(config.auth.encryptionKey).digest();
}

function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, deriveKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

function decrypt(stored: string): string {
  const [ivHex, tagHex, encryptedHex] = stored.split(':');
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    deriveKey(),
    Buffer.from(ivHex, 'hex'),
  );
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return decipher.update(Buffer.from(encryptedHex, 'hex')).toString('utf8') + decipher.final('utf8');
}

// Credentials are stored as "username:appPassword" (encrypted together)
function encodeCredentials(username: string, appPassword: string): string {
  return encrypt(`${username}\n${appPassword}`);
}

function decodeCredentials(encryptedKey: string): { username: string; appPassword: string } {
  const decrypted = decrypt(encryptedKey);
  const newline = decrypted.indexOf('\n');
  return {
    username: decrypted.slice(0, newline),
    appPassword: decrypted.slice(newline + 1),
  };
}

function wpAuth(username: string, appPassword: string): string {
  return `Basic ${Buffer.from(`${username}:${appPassword}`).toString('base64')}`;
}

class WordPressService {
  async saveConnection(
    companyId: string,
    siteUrl: string,
    username: string,
    appPassword: string,
  ): Promise<void> {
    const normalizedUrl = siteUrl.replace(/\/+$/, '');
    const encryptedKey = encodeCredentials(username, appPassword);

    await prisma.cmsConnection.upsert({
      where: { companyId },
      create: { companyId, type: 'WORDPRESS', siteUrl: normalizedUrl, encryptedKey },
      update: { siteUrl: normalizedUrl, encryptedKey, isActive: true },
    });
  }

  async getStatus(companyId: string) {
    const conn = await prisma.cmsConnection.findUnique({
      where: { companyId },
      select: { siteUrl: true, isActive: true, lastTestedAt: true, createdAt: true },
    });
    return conn; // null if no connection saved
  }

  async removeConnection(companyId: string): Promise<void> {
    await prisma.cmsConnection.deleteMany({ where: { companyId } });
  }

  async testConnection(companyId: string): Promise<{ ok: boolean; error?: string }> {
    const conn = await prisma.cmsConnection.findUnique({ where: { companyId } });
    if (!conn) return { ok: false, error: 'No WordPress connection saved for this company' };

    const { username, appPassword } = decodeCredentials(conn.encryptedKey);

    try {
      const res = await fetch(`${conn.siteUrl}/wp-json/wp/v2/users/me`, {
        headers: { Authorization: wpAuth(username, appPassword) },
      });

      if (!res.ok) return { ok: false, error: `WordPress returned HTTP ${res.status}` };

      await prisma.cmsConnection.update({
        where: { companyId },
        data: { lastTestedAt: new Date() },
      });

      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Connection failed' };
    }
  }

  async publishPost(
    blogPostId: string,
    userId: string,
  ): Promise<{ wpUrl: string }> {
    // Load post — must be APPROVED and belong to the requesting user
    const post = await prisma.blogPost.findFirst({
      where: {
        id: blogPostId,
        status: 'APPROVED',
        analysis: { company: { userId } },
      },
      include: { analysis: { include: { company: true } } },
    });

    if (!post) throw new Error('Blog post not found or not in APPROVED status');

    const { company } = post.analysis;

    const conn = await prisma.cmsConnection.findUnique({ where: { companyId: company.id } });
    if (!conn || !conn.isActive) throw new Error('No active WordPress connection for this company');

    const { username, appPassword } = decodeCredentials(conn.encryptedKey);

    const wpRes = await fetch(`${conn.siteUrl}/wp-json/wp/v2/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: wpAuth(username, appPassword),
      },
      body: JSON.stringify({
        title: post.title,
        slug: post.slug,
        content: post.content,
        status: 'publish',
      }),
    });

    if (!wpRes.ok) {
      const body = await wpRes.text();
      throw new Error(`WordPress publish failed (${wpRes.status}): ${body.slice(0, 300)}`);
    }

    const wpPost = (await wpRes.json()) as { link: string };

    await prisma.blogPost.update({
      where: { id: blogPostId },
      data: { status: 'PUBLISHED', publishedUrl: wpPost.link },
    });

    return { wpUrl: wpPost.link };
  }
}

export const wordPressService = new WordPressService();
