import { prisma } from '../prisma/client';
import { enqueueAnalysis } from '../workers/queue';
import { contentGenerationService } from './contentGeneration.service';

export class AnalysisService {
  async create(companyId: string, userId: string) {
    // Verify company ownership
    const company = await prisma.company.findFirst({ where: { id: companyId, userId } });
    if (!company) return null;

    const analysis = await prisma.analysis.create({
      data: { companyId, status: 'PENDING', triggeredBy: 'MANUAL' },
    });

    await enqueueAnalysis(analysis.id, companyId, userId);
    return analysis;
  }

  async getForCompany(companyId: string, userId: string) {
    const company = await prisma.company.findFirst({ where: { id: companyId, userId } });
    if (!company) return null;

    return prisma.analysis.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      include: {
        geoScore: {
          select: {
            overallScore: true, industryBenchmark: true,
            extractabilityScore: true, entityClarityScore: true,
            specificityScore: true, corroborationScore: true,
            coverageScore: true, freshnessScore: true,
            indexabilityScore: true, machineReadabilityScore: true,
            priorityActions: true,
          },
        },
        _count: {
          select: {
            aiQueryResults: true,
            pageRecommendations: true,
            blogPosts: true,
          },
        },
      },
    });
  }

  async getOne(analysisId: string, userId: string) {
    return prisma.analysis.findFirst({
      where: { id: analysisId, company: { userId } },
      include: {
        company: { select: { id: true, name: true, websiteUrl: true, industry: true } },
        geoScore: true,
        scrapeJobs: {
          select: { id: true, url: true, type: true, status: true, htmlQuality: true, responseTimeMs: true },
        },
        pageRecommendations: { orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }] },
        blogPosts: {
          select: {
            id: true, title: true, slug: true, targetQuery: true, buyerStage: true,
            content: true, wordCount: true, geoComplianceScore: true, status: true,
            revisionCount: true, customerApproved: true, createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        _count: { select: { aiQueryResults: true } },
      },
    });
  }

  async getShareOfVoice(analysisId: string, userId: string) {
    const analysis = await prisma.analysis.findFirst({
      where: { id: analysisId, company: { userId } },
      include: { company: { include: { competitors: true } } },
    });
    if (!analysis) return null;

    const results = await prisma.aiQueryResult.findMany({
      where: { analysisId },
      select: {
        engine: true, companyMentioned: true, mentionCount: true, shareOfVoice: true,
      },
    });

    const totalQueries = results.length;
    const mentionedCount = results.filter((r) => r.companyMentioned).length;
    const avgShareOfVoice =
      totalQueries > 0
        ? results.reduce((sum, r) => sum + (r.shareOfVoice ?? 0), 0) / totalQueries
        : 0;

    const byEngine = groupByEngine(results);

    return {
      totalQueries,
      mentionFrequency: totalQueries > 0 ? (mentionedCount / totalQueries) * 100 : 0,
      avgShareOfVoice: Math.round(avgShareOfVoice * 100) / 100,
      byEngine,
    };
  }

  async getBlogPost(blogPostId: string, userId: string) {
    return prisma.blogPost.findFirst({
      where: { id: blogPostId, analysis: { company: { userId } } },
      include: { revisions: { orderBy: { createdAt: 'desc' } } },
    });
  }

  async requestRevision(blogPostId: string, userId: string, feedback: string) {
    const post = await prisma.blogPost.findFirst({
      where: { id: blogPostId, analysis: { company: { userId } } },
    });
    if (!post) return null;

    await prisma.blogPost.update({
      where: { id: blogPostId },
      data: { status: 'REVISION_REQUESTED' },
    });

    await contentGenerationService.reviseBlogPost(blogPostId, feedback);
    return prisma.blogPost.findUnique({ where: { id: blogPostId } });
  }

  async approveBlogPost(blogPostId: string, userId: string) {
    const post = await prisma.blogPost.findFirst({
      where: { id: blogPostId, analysis: { company: { userId } } },
    });
    if (!post) return null;

    return prisma.blogPost.update({
      where: { id: blogPostId },
      data: { status: 'APPROVED', customerApproved: true },
    });
  }

  async updateRecommendationStatus(
    recId: string,
    userId: string,
    status: 'PENDING' | 'IN_PROGRESS' | 'IMPLEMENTED' | 'SKIPPED',
  ) {
    const rec = await prisma.pageRecommendation.findFirst({
      where: { id: recId, analysis: { company: { userId } } },
    });
    if (!rec) return null;
    return prisma.pageRecommendation.update({ where: { id: recId }, data: { status } });
  }
}

export const analysisService = new AnalysisService();

function groupByEngine(results: { engine: string; companyMentioned: boolean; shareOfVoice: number | null }[]) {
  const engines: Record<string, { total: number; mentioned: number; avgSov: number }> = {};

  for (const r of results) {
    if (!engines[r.engine]) engines[r.engine] = { total: 0, mentioned: 0, avgSov: 0 };
    engines[r.engine].total++;
    if (r.companyMentioned) engines[r.engine].mentioned++;
    engines[r.engine].avgSov += r.shareOfVoice ?? 0;
  }

  for (const engine of Object.keys(engines)) {
    const e = engines[engine];
    e.avgSov = e.total > 0 ? Math.round((e.avgSov / e.total) * 100) / 100 : 0;
  }

  return engines;
}
