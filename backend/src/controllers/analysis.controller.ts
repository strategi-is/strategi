import { Response } from 'express';
import { z } from 'zod';
import { analysisService } from '../services/analysis.service';
import { AuthenticatedRequest } from '../types';
import { ok, created, notFound, unauthorized } from '../utils/response';
import { param } from '../utils/params';

// Accept either "instructions" (frontend) or "feedback" (legacy)
const revisionSchema = z
  .object({
    instructions: z.string().min(1).optional(),
    feedback: z.string().min(1).optional(),
  })
  .transform((d) => ({ text: d.instructions ?? d.feedback ?? '' }))
  .refine((d) => d.text.length >= 1, { message: 'Revision text is required' });

const recStatusSchema = z.object({
  status: z.enum(['PENDING', 'IN_PROGRESS', 'IMPLEMENTED', 'SKIPPED']),
});

// Helper: resolve blog post id from either :postId or :blogId param
function blogId(req: AuthenticatedRequest) {
  return param(req, 'postId') || param(req, 'blogId');
}

export const analysisController = {
  async create(req: AuthenticatedRequest, res: Response) {
    if (!req.userId) return unauthorized(res);
    const analysis = await analysisService.create(param(req, 'companyId'), req.userId);
    if (!analysis) return notFound(res, 'Company not found');
    return created(res, analysis, 'Analysis started');
  },

  async getForCompany(req: AuthenticatedRequest, res: Response) {
    if (!req.userId) return unauthorized(res);
    const analyses = await analysisService.getForCompany(param(req, 'companyId'), req.userId);
    if (analyses === null) return notFound(res, 'Company not found');
    return ok(res, analyses);
  },

  async getOne(req: AuthenticatedRequest, res: Response) {
    if (!req.userId) return unauthorized(res);
    const analysis = await analysisService.getOne(param(req, 'id'), req.userId);
    if (!analysis) return notFound(res, 'Analysis not found');
    return ok(res, analysis);
  },

  async getShareOfVoice(req: AuthenticatedRequest, res: Response) {
    if (!req.userId) return unauthorized(res);
    const data = await analysisService.getShareOfVoice(param(req, 'id'), req.userId);
    if (!data) return notFound(res, 'Analysis not found');
    return ok(res, data);
  },

  async getBlogPost(req: AuthenticatedRequest, res: Response) {
    if (!req.userId) return unauthorized(res);
    const post = await analysisService.getBlogPost(blogId(req), req.userId);
    if (!post) return notFound(res, 'Blog post not found');
    return ok(res, post);
  },

  async requestRevision(req: AuthenticatedRequest, res: Response) {
    if (!req.userId) return unauthorized(res);
    const { text } = revisionSchema.parse(req.body);
    const post = await analysisService.requestRevision(blogId(req), req.userId, text);
    if (!post) return notFound(res, 'Blog post not found');
    return ok(res, post, 'Revision in progress');
  },

  async approveBlog(req: AuthenticatedRequest, res: Response) {
    if (!req.userId) return unauthorized(res);
    const post = await analysisService.approveBlogPost(blogId(req), req.userId);
    if (!post) return notFound(res, 'Blog post not found');
    return ok(res, post, 'Blog post approved');
  },

  async updateRecStatus(req: AuthenticatedRequest, res: Response) {
    if (!req.userId) return unauthorized(res);
    const { status } = recStatusSchema.parse(req.body);
    const rec = await analysisService.updateRecommendationStatus(
      param(req, 'recId'),
      req.userId,
      status,
    );
    if (!rec) return notFound(res, 'Recommendation not found');
    return ok(res, rec, 'Status updated');
  },
};
