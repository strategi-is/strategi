import axios, { AxiosError } from 'axios';
import { config } from '../config';
import { prisma } from '../prisma/client';
import { OlostepResponse, HtmlQualityResult } from '../types';

const MAX_RETRIES = 3;
const RETRY_DELAYS = [2000, 5000, 10000]; // exponential backoff in ms

export class OlostepService {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor() {
    this.apiKey = config.olostep.apiKey;
    this.baseUrl = config.olostep.baseUrl;
  }

  async scrapeUrl(url: string, attempt = 1): Promise<OlostepResponse> {
    const startTime = Date.now();

    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          token: this.apiKey,
          url,
          waitBeforeScraping: 1,
          saveHtml: 'true',
          removeCSSselectors: 'default',
          htmlTransformer: 'none',
        },
        timeout: 30000,
      });

      const responseTimeMs = Date.now() - startTime;
      // New Olostep API returns result nested under .result; fall back to markdown when html is null
      const data = response.data?.result ?? response.data;
      const html: string = data?.html_content || data?.markdown_content || '';
      const creditsUsed: number = response.data?.credits_consumed ?? response.data?.credits_used ?? undefined;

      await this.logApiCall(url, 200, responseTimeMs, creditsUsed, true);

      return { html, url, responseTimeMs, creditsUsed };
    } catch (err) {
      const responseTimeMs = Date.now() - startTime;
      const error = err as AxiosError;
      const status = error.response?.status || 0;
      const errorMsg = error.message;

      await this.logApiCall(url, status, responseTimeMs, undefined, false, errorMsg);

      // Retry logic
      if (attempt <= MAX_RETRIES) {
        const isRetryable = status === 0 || status >= 500 || status === 429;
        if (isRetryable) {
          const delay = status === 429
            ? 60000  // rate limited — wait 60s
            : RETRY_DELAYS[attempt - 1];

          console.warn(`[Olostep] Attempt ${attempt} failed for ${url}. Retrying in ${delay}ms...`);
          await sleep(delay);
          return this.scrapeUrl(url, attempt + 1);
        }
      }

      throw new Error(`Olostep scrape failed for ${url} after ${attempt} attempts: ${errorMsg}`);
    }
  }

  async scrapeMultiple(
    urls: Array<{ url: string; type: 'CUSTOMER_SITE' | 'COMPETITOR_SITE'; scrapeJobId: string }>,
    analysisId: string,
  ): Promise<void> {
    // Parallel with concurrency limit of 3
    const concurrencyLimit = 3;
    const chunks = chunkArray(urls, concurrencyLimit);

    for (const chunk of chunks) {
      await Promise.allSettled(
        chunk.map(async ({ url, scrapeJobId }) => {
          await prisma.scrapeJob.update({
            where: { id: scrapeJobId },
            data: { status: 'IN_PROGRESS', attempts: { increment: 1 } },
          });

          try {
            const result = await this.scrapeUrl(url);

            // Assess HTML quality
            const quality = assessHtmlQuality(result.html);

            await prisma.scrapeJob.update({
              where: { id: scrapeJobId },
              data: {
                status: 'SUCCESS',
                htmlContent: scrubPii(result.html),
                htmlQuality: quality.quality.toUpperCase() as any,
                qualityScore: quality.confidence,
                qualityIssues: quality.issues,
                responseTimeMs: result.responseTimeMs,
                creditsUsed: result.creditsUsed,
                scrapedAt: new Date(),
              },
            });
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Unknown error';
            console.error(`[Olostep] Scrape FAILED for ${url}: ${msg}`);
            await prisma.scrapeJob.update({
              where: { id: scrapeJobId },
              data: { status: 'FAILED', errorMsg: msg },
            });
          }
        }),
      );
    }
  }

  private async logApiCall(
    url: string,
    status: number,
    responseTimeMs: number,
    creditsUsed: number | undefined,
    success: boolean,
    errorMsg?: string,
  ): Promise<void> {
    try {
      await prisma.olostepApiLog.create({
        data: { url, status, responseTimeMs, creditsUsed, success, errorMsg },
      });
    } catch {
      // Don't let logging failure break the main flow
      console.error('[Olostep] Failed to write API log');
    }
  }

  async getUsageStats(days = 30): Promise<{
    totalCalls: number;
    successRate: number;
    avgResponseTimeMs: number;
    p95ResponseTimeMs: number;
    totalCreditsUsed: number;
    estimatedCost: number;
  }> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const logs = await prisma.olostepApiLog.findMany({
      where: { calledAt: { gte: since } },
      orderBy: { calledAt: 'desc' },
    });

    if (logs.length === 0) {
      return {
        totalCalls: 0, successRate: 0, avgResponseTimeMs: 0,
        p95ResponseTimeMs: 0, totalCreditsUsed: 0, estimatedCost: 0,
      };
    }

    const successCount = logs.filter((l) => l.success).length;
    const responseTimes = logs.map((l) => l.responseTimeMs).sort((a, b) => a - b);
    const totalCredits = logs.reduce((sum, l) => sum + (l.creditsUsed ?? 0), 0);

    const p95Index = Math.floor(responseTimes.length * 0.95);

    return {
      totalCalls: logs.length,
      successRate: (successCount / logs.length) * 100,
      avgResponseTimeMs: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
      p95ResponseTimeMs: responseTimes[p95Index] || 0,
      totalCreditsUsed: totalCredits,
      estimatedCost: totalCredits * 1.0, // ~$1 per credit, adjust based on actual pricing
    };
  }
}

// ─── HELPERS ────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/**
 * Basic HTML quality assessment without calling LLM
 * (LLM-based quality check runs separately in the scoring phase)
 */
function assessHtmlQuality(html: string): HtmlQualityResult {
  const issues: string[] = [];

  if (!html || html.length < 500) {
    return {
      quality: 'poor',
      issues: ['HTML content is empty or too short'],
      recommendation: 'rescrape',
      confidence: 10,
    };
  }

  // Check for loading indicators
  if (/loading\.\.\.|please wait|spinner/i.test(html)) {
    issues.push('Page may not have fully loaded (loading indicators detected)');
  }

  // Check for CAPTCHA / anti-bot
  if (/captcha|access denied|403 forbidden|bot detection/i.test(html)) {
    issues.push('CAPTCHA or anti-bot block detected');
  }

  // Check for minimal content
  const textLength = html.replace(/<[^>]+>/g, '').trim().length;
  if (textLength < 1000) {
    issues.push('Very little text content extracted');
  }

  // Check for body tag
  if (!/<body/i.test(html)) {
    issues.push('No <body> tag found');
  }

  // Check for nav/footer (complete page indicators)
  const hasNav = /<nav|<header/i.test(html);
  const hasFooter = /<footer/i.test(html);
  if (!hasNav) issues.push('No navigation found');
  if (!hasFooter) issues.push('No footer found');

  const quality =
    issues.length === 0 ? 'excellent'
    : issues.length <= 1 ? 'good'
    : issues.length <= 2 ? 'fair'
    : 'poor';

  const confidence =
    quality === 'excellent' ? 95
    : quality === 'good' ? 75
    : quality === 'fair' ? 50
    : 20;

  const recommendation =
    quality === 'poor' ? 'rescrape'
    : quality === 'fair' ? 'manual_review'
    : 'proceed_with_analysis';

  return { quality, issues, recommendation, confidence };
}

/**
 * Scrub PII from HTML before storing
 */
function scrubPii(html: string): string {
  // Email addresses
  let scrubbed = html.replace(
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    '[EMAIL_REDACTED]',
  );

  // Phone numbers (common formats)
  scrubbed = scrubbed.replace(
    /(\+?1?\s?)?(\(?\d{3}\)?[\s.\-]?)(\d{3}[\s.\-]?\d{4})/g,
    '[PHONE_REDACTED]',
  );

  // SSN-like patterns
  scrubbed = scrubbed.replace(/\d{3}-\d{2}-\d{4}/g, '[SSN_REDACTED]');

  return scrubbed;
}

export const olostepService = new OlostepService();
