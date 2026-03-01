import { Worker, Job } from 'bullmq';
import { redisConnection } from './queue';
import { prisma } from '../prisma/client';
import { olostepService } from '../services/olostep.service';
import { queryGenerationService } from '../services/queryGeneration.service';
import { aiQueryingService } from '../services/aiQuerying.service';
import { geoScoringService } from '../services/geoScoring.service';
import { contentGenerationService } from '../services/contentGeneration.service';
import { emailService } from '../services/email.service';
import { AnalysisJobData } from '../types';

export function startAnalysisWorker() {
  const worker = new Worker<AnalysisJobData>(
    'analysis',
    async (job: Job<AnalysisJobData>) => {
      const { analysisId, companyId } = job.data;

      console.log(`[Worker] Starting analysis ${analysisId}`);

      // ── Load company data ────────────────────────────────────────────────
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        include: { competitors: true, user: true },
      });

      if (!company) throw new Error(`Company ${companyId} not found`);

      const competitorNames = company.competitors
        .map((c) => c.name)
        .filter((n): n is string => !!n);

      try {
        // ── STEP 1: Update status → SCRAPING ─────────────────────────────
        await updateStatus(analysisId, 'SCRAPING');
        await job.updateProgress(10);

        // Create scrape jobs for customer site + all competitor sites
        const urlsToScrape = [
          { url: company.websiteUrl, type: 'CUSTOMER_SITE' as const },
          ...company.competitors.map((c) => ({
            url: c.websiteUrl,
            type: 'COMPETITOR_SITE' as const,
          })),
        ];

        const scrapeJobs = await Promise.all(
          urlsToScrape.map((u) =>
            prisma.scrapeJob.create({
              data: { analysisId, url: u.url, type: u.type, status: 'PENDING' },
            }),
          ),
        );

        await olostepService.scrapeMultiple(
          scrapeJobs.map((sj, i) => ({
            url: urlsToScrape[i].url,
            type: urlsToScrape[i].type,
            scrapeJobId: sj.id,
          })),
          analysisId,
        );

        await job.updateProgress(30);

        // ── STEP 2: Generate target queries ──────────────────────────────
        await updateStatus(analysisId, 'QUERYING_AI');

        // Only generate if none already exist (custom queries may have been added)
        const existingQueries = await prisma.targetQuery.count({ where: { analysisId } });
        if (existingQueries === 0) {
          await queryGenerationService.generateQueries(companyId, analysisId, {
            name: company.name,
            websiteUrl: company.websiteUrl,
            industry: company.industry,
            targetAudience: company.targetAudience,
            productsServices: company.productsServices,
            keyDifferentiators: company.keyDifferentiators,
            competitors: company.competitors,
          });
        }

        // Query AI engines
        await aiQueryingService.runAnalysisQueries(analysisId, company.name, competitorNames);
        await job.updateProgress(60);

        // ── STEP 3: GEO Scoring ───────────────────────────────────────────
        await updateStatus(analysisId, 'SCORING');

        const customerScrape = await prisma.scrapeJob.findFirst({
          where: { analysisId, type: 'CUSTOMER_SITE', status: 'SUCCESS' },
        });

        if (customerScrape?.htmlContent) {
          await geoScoringService.scoreWebsite(
            analysisId,
            customerScrape.htmlContent,
            company.websiteUrl,
            company.industry,
            customerScrape.scrapedAt ?? new Date(),
          );
        } else {
          console.warn(`[Worker] No successful customer scrape for analysis ${analysisId}. Skipping scoring.`);
        }

        await job.updateProgress(80);

        // ── STEP 4: Content Generation ────────────────────────────────────
        await updateStatus(analysisId, 'GENERATING_CONTENT');

        const geoScore = await prisma.geoScore.findUnique({ where: { analysisId } });
        const geoNotes = geoScore
          ? `Overall: ${geoScore.overallScore}/100. Priority actions: ${geoScore.priorityActions.join(', ')}`
          : 'No GEO score available';

        const companyCtx = {
          name: company.name,
          websiteUrl: company.websiteUrl,
          industry: company.industry,
          targetAudience: company.targetAudience,
          productsServices: company.productsServices,
          keyDifferentiators: company.keyDifferentiators,
          brandVoiceNotes: company.brandVoiceNotes,
        };

        // Check for existing content to avoid duplicates on job retry
        const [existingRecs, existingPosts] = await Promise.all([
          prisma.pageRecommendation.count({ where: { analysisId } }),
          prisma.blogPost.count({ where: { analysisId } }),
        ]);

        const contentTasks = [
          existingRecs === 0
            ? contentGenerationService.generatePageRecommendations(
                analysisId,
                companyCtx,
                geoNotes,
                customerScrape?.htmlContent ?? '',
              )
            : Promise.resolve(),
          existingPosts === 0
            ? contentGenerationService.generateBlogSuite(analysisId, companyCtx)
            : Promise.resolve(),
        ];

        const contentResults = await Promise.allSettled(contentTasks);
        contentResults.forEach((r, i) => {
          if (r.status === 'rejected') {
            const task = i === 0 ? 'generatePageRecommendations' : 'generateBlogSuite';
            console.error(`[Worker] ${task} failed for analysis ${analysisId}:`, r.reason);
          }
        });

        await job.updateProgress(100);

        // ── STEP 5: Mark completed ────────────────────────────────────────
        await prisma.analysis.update({
          where: { id: analysisId },
          data: { status: 'COMPLETED', completedAt: new Date() },
        });

        // Notify user — fire-and-forget, never block the pipeline
        emailService
          .sendAnalysisCompleteEmail(company.user.email, company.user.name, company.name, analysisId)
          .catch(() => {});

        console.log(`[Worker] Analysis ${analysisId} completed successfully`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        console.error(`[Worker] Analysis ${analysisId} failed:`, msg);

        await prisma.analysis.update({
          where: { id: analysisId },
          data: { status: 'FAILED', errorMsg: msg },
        });

        throw err; // Let BullMQ handle retry logic
      }
    },
    {
      connection: redisConnection,
      concurrency: 2, // process 2 analyses at a time
      limiter: { max: 10, duration: 60000 }, // max 10 jobs/minute
    },
  );

  worker.on('failed', (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed permanently:`, err.message);
  });

  worker.on('completed', (job) => {
    console.log(`[Worker] Job ${job.id} completed`);
  });

  console.log('✅ Analysis worker started');
  return worker;
}

async function updateStatus(analysisId: string, status: string) {
  await prisma.analysis.update({
    where: { id: analysisId },
    data: {
      status: status as any,
      startedAt: status === 'SCRAPING' ? new Date() : undefined,
    },
  });
}
