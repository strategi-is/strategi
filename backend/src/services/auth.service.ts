import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../prisma/client';
import { config } from '../config';

const SALT_ROUNDS = 12;

export class AuthService {
  async register(email: string, password: string, name: string, companyName: string) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new Error('Email already in use');

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const verifyToken = crypto.randomBytes(32).toString('hex');

    const user = await prisma.user.create({
      data: { email, passwordHash, name, companyName, verifyToken },
      select: { id: true, email: true, name: true, companyName: true, role: true, emailVerified: true },
    });

    return { user, verifyToken };
  }

  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new Error('Invalid credentials');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new Error('Invalid credentials');

    const token = this.signToken(user.id, user.role);

    await prisma.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        companyName: user.companyName,
        role: user.role,
        emailVerified: user.emailVerified,
      },
    };
  }

  async logout(token: string) {
    await prisma.session.deleteMany({ where: { token } });
  }

  async verifyEmail(token: string) {
    const user = await prisma.user.findFirst({ where: { verifyToken: token } });
    if (!user) throw new Error('Invalid or expired verification token');

    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true, verifyToken: null },
    });
  }

  async forgotPassword(email: string): Promise<{ resetToken: string; name: string } | null> {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return null; // don't reveal if email exists

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExp = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExp },
    });

    return { resetToken, name: user.name };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExp: { gt: new Date() },
      },
    });
    if (!user) throw new Error('Invalid or expired reset token');

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, resetToken: null, resetTokenExp: null },
    });

    // Invalidate all sessions
    await prisma.session.deleteMany({ where: { userId: user.id } });
  }

  async getMe(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, name: true,
        companyName: true, role: true, emailVerified: true, createdAt: true,
      },
    });
  }

  private signToken(userId: string, role: string): string {
    return jwt.sign({ userId, role }, config.auth.jwtSecret, {
      expiresIn: config.auth.jwtExpiresIn as jwt.SignOptions['expiresIn'],
    });
  }
}

export const authService = new AuthService();
