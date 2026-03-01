import cron from 'node-cron';
import { prisma } from '../prisma/client';
import { enqueueAnalysis } from './queue';

/**
 * Weekly re-analysis cron — runs every Monday at 02:00 UTC.
 * Finds all companies with at least one COMPLETED analysis and
 * kicks off a fresh analysis for each one.
 */
export function startCronWorker() {
  cron.schedule('0 2 * * 1', runWeeklyReanalysis, { timezone: 'UTC' });
  console.log('✅ Cron worker started (weekly re-analysis: Mon 02:00 UTC)');
}

async function runWeeklyReanalysis() {
  console.log('[Cron] Starting weekly re-analysis run');

  // Find companies that have had at least one successful analysis
  const companies = await prisma.company.findMany({
    where: {
      analyses: {
        some: { status: 'COMPLETED' },
      },
    },
    select: { id: true, userId: true, name: true },
  });

  if (companies.length === 0) {
    console.log('[Cron] No eligible companies — skipping');
    return;
  }

  console.log(`[Cron] Scheduling re-analysis for ${companies.length} company/companies`);

  for (const company of companies) {
    try {
      const analysis = await prisma.analysis.create({
        data: {
          companyId: company.id,
          status: 'PENDING',
        },
        select: { id: true },
      });

      await enqueueAnalysis(analysis.id, company.id, company.userId);
      console.log(`[Cron] Queued analysis ${analysis.id} for company "${company.name}"`);
    } catch (err) {
      // Log and continue — don't let one failure block the rest
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[Cron] Failed to queue re-analysis for company ${company.id}:`, msg);
    }
  }

  console.log('[Cron] Weekly re-analysis run complete');
}
