import { Router, Response, Request } from 'express';
import { requireAdmin } from '../middleware/auth';
import { olostepService } from '../services/olostep.service';
import { prisma } from '../prisma/client';
import { ok } from '../utils/response';

const router = Router();
router.use(requireAdmin);

// Olostep usage stats
router.get('/olostep/stats', async (req: Request, res: Response) => {
  const days = parseInt(req.query.days as string || '30', 10);
  const stats = await olostepService.getUsageStats(days);
  return ok(res, stats);
});

// Olostep recent logs
router.get('/olostep/logs', async (req: Request, res: Response) => {
  const logs = await prisma.olostepApiLog.findMany({
    orderBy: { calledAt: 'desc' },
    take: 100,
  });
  return ok(res, logs);
});

// Platform overview
router.get('/overview', async (_req: Request, res: Response) => {
  const [userCount, companyCount, analysisCount, completedCount] = await Promise.all([
    prisma.user.count(),
    prisma.company.count(),
    prisma.analysis.count(),
    prisma.analysis.count({ where: { status: 'COMPLETED' } }),
  ]);

  const avgScore = await prisma.geoScore.aggregate({ _avg: { overallScore: true } });

  return ok(res, {
    users: userCount,
    companies: companyCount,
    analyses: analysisCount,
    completedAnalyses: completedCount,
    avgGeoScore: Math.round(avgScore._avg.overallScore ?? 0),
  });
});

export default router;
