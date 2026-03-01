import { Response } from 'express';
import { z } from 'zod';
import { wordPressService } from '../services/wordpress.service';
import { AuthenticatedRequest } from '../types';
import { ok, badRequest, notFound, unauthorized } from '../utils/response';
import { param } from '../utils/params';

const connectSchema = z
  .object({
    siteUrl: z.string().trim().url().max(2048),
    username: z.string().trim().min(1).max(200),
    appPassword: z.string().min(1).max(500),
  })
  .strict();

export const cmsController = {
  async getStatus(req: AuthenticatedRequest, res: Response) {
    if (!req.userId) return unauthorized(res);
    const status = await wordPressService.getStatus(param(req, 'companyId'));
    return ok(res, status);
  },

  async connect(req: AuthenticatedRequest, res: Response) {
    if (!req.userId) return unauthorized(res);
    const { siteUrl, username, appPassword } = connectSchema.parse(req.body);
    await wordPressService.saveConnection(param(req, 'companyId'), siteUrl, username, appPassword);
    return ok(res, null, 'WordPress connection saved');
  },

  async disconnect(req: AuthenticatedRequest, res: Response) {
    if (!req.userId) return unauthorized(res);
    await wordPressService.removeConnection(param(req, 'companyId'));
    return ok(res, null, 'WordPress connection removed');
  },

  async test(req: AuthenticatedRequest, res: Response) {
    if (!req.userId) return unauthorized(res);
    const result = await wordPressService.testConnection(param(req, 'companyId'));
    if (!result.ok) return badRequest(res, result.error ?? 'Connection test failed');
    return ok(res, null, 'WordPress connection is working');
  },

  async publish(req: AuthenticatedRequest, res: Response) {
    if (!req.userId) return unauthorized(res);
    try {
      const { wpUrl } = await wordPressService.publishPost(
        param(req, 'postId') || param(req, 'blogId'),
        req.userId,
      );
      return ok(res, { wpUrl }, 'Blog post published to WordPress');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Publish failed';
      if (msg.includes('not found')) return notFound(res, msg);
      return badRequest(res, msg);
    }
  },
};
