import { Response } from 'express';
import { z } from 'zod';
import { companyService } from '../services/company.service';
import { AuthenticatedRequest } from '../types';
import { ok, created, notFound, unauthorized } from '../utils/response';
import { param } from '../utils/params';

const competitorSchema = z
  .object({
    name: z.string().trim().max(200).optional(),
    websiteUrl: z.string().url().max(2048),
  })
  .strict();

const createSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    websiteUrl: z.string().url().max(2048),
    industry: z.string().trim().min(1).max(100),
    targetAudience: z.string().trim().min(10).max(2000),
    productsServices: z.string().trim().min(10).max(5000),
    keyDifferentiators: z.string().trim().min(10).max(5000),
    brandVoiceNotes: z.string().trim().max(2000).optional(),
    brandVoiceFileUrl: z.string().url().max(2048).optional(),
    competitors: z.array(competitorSchema).max(5).default([]),
  })
  .strict();

const updateSchema = createSchema.partial();

const querySchema = z
  .object({
    query: z.string().trim().min(5).max(500),
    buyerStage: z.enum(['AWARENESS', 'CONSIDERATION', 'DECISION']),
  })
  .strict();

export const companyController = {
  async create(req: AuthenticatedRequest, res: Response) {
    if (!req.userId) return unauthorized(res);
    const data = createSchema.parse(req.body);
    const company = await companyService.create({ ...data, userId: req.userId });
    return created(res, company, 'Company profile created');
  },

  async getAll(req: AuthenticatedRequest, res: Response) {
    if (!req.userId) return unauthorized(res);
    const companies = await companyService.getAll(req.userId);
    return ok(res, companies);
  },

  async getOne(req: AuthenticatedRequest, res: Response) {
    if (!req.userId) return unauthorized(res);
    const company = await companyService.getOne(param(req, 'id'), req.userId);
    if (!company) return notFound(res, 'Company not found');
    return ok(res, company);
  },

  async update(req: AuthenticatedRequest, res: Response) {
    if (!req.userId) return unauthorized(res);
    const data = updateSchema.parse(req.body);
    const company = await companyService.update(param(req, 'id'), req.userId, data);
    if (!company) return notFound(res, 'Company not found');
    return ok(res, company, 'Company updated');
  },

  async delete(req: AuthenticatedRequest, res: Response) {
    if (!req.userId) return unauthorized(res);
    const deleted = await companyService.delete(param(req, 'id'), req.userId);
    if (!deleted) return notFound(res, 'Company not found');
    return ok(res, null, 'Company deleted');
  },

  async getQueries(req: AuthenticatedRequest, res: Response) {
    if (!req.userId) return unauthorized(res);
    const queries = await companyService.getQueries(param(req, 'id'), req.userId);
    if (queries === null) return notFound(res, 'Company not found');
    return ok(res, queries);
  },

  async addQuery(req: AuthenticatedRequest, res: Response) {
    if (!req.userId) return unauthorized(res);
    const { query, buyerStage } = querySchema.parse(req.body);
    const result = await companyService.addCustomQuery(param(req, 'id'), req.userId, query, buyerStage);
    if (!result) return notFound(res, 'Company not found');
    return created(res, result, 'Query added');
  },

  async deleteQuery(req: AuthenticatedRequest, res: Response) {
    if (!req.userId) return unauthorized(res);
    const deleted = await companyService.deleteQuery(param(req, 'queryId'), req.userId);
    if (!deleted) return notFound(res, 'Query not found');
    return ok(res, null, 'Query deleted');
  },
};
