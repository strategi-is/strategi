import OpenAI from 'openai';
import axios from 'axios';
import { prisma } from '../prisma/client';
import { config } from '../config';

const openai = new OpenAI({ apiKey: config.llm.openaiKey });

interface QueryResult {
  engine: 'CHATGPT' | 'PERPLEXITY' | 'GEMINI';
  rawResponse: string;
  companyMentioned: boolean;
  mentionCount: number;
  mentionContext: string | null;
  citations: string[];
  shareOfVoice: number;
}

export class AiQueryingService {
  /**
   * Query all configured AI engines for a single query.
   * Returns results for each engine that responds.
   */
  async queryAllEngines(
    query: string,
    companyName: string,
    competitorNames: string[],
  ): Promise<QueryResult[]> {
    const results = await Promise.allSettled([
      this.queryChatGpt(query, companyName, competitorNames),
      this.queryPerplexity(query, companyName, competitorNames),
    ]);

    return results
      .filter((r): r is PromiseFulfilledResult<QueryResult> => r.status === 'fulfilled')
      .map((r) => r.value);
  }

  async queryChatGpt(
    query: string,
    companyName: string,
    competitorNames: string[],
  ): Promise<QueryResult> {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: query }],
      max_tokens: 1000,
    });

    const rawResponse = response.choices[0]?.message?.content ?? '';
    return analyzeResponse(rawResponse, 'CHATGPT', companyName, competitorNames);
  }

  async queryPerplexity(
    query: string,
    companyName: string,
    competitorNames: string[],
  ): Promise<QueryResult> {
    if (!config.llm.perplexityKey) {
      throw new Error('Perplexity API key not configured');
    }

    const response = await axios.post(
      'https://api.perplexity.ai/chat/completions',
      {
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [{ role: 'user', content: query }],
        max_tokens: 1000,
      },
      {
        headers: {
          Authorization: `Bearer ${config.llm.perplexityKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      },
    );

    const rawResponse = response.data?.choices?.[0]?.message?.content ?? '';
    const citations: string[] = response.data?.citations ?? [];
    return analyzeResponse(rawResponse, 'PERPLEXITY', companyName, competitorNames, citations);
  }

  /**
   * Run all queries for an analysis, saving results to DB.
   * Batches requests to respect rate limits.
   */
  async runAnalysisQueries(
    analysisId: string,
    companyName: string,
    competitorNames: string[],
  ): Promise<void> {
    const queries = await prisma.targetQuery.findMany({
      where: { analysisId },
    });

    // Process in batches of 5 to avoid rate limits
    const batchSize = 5;
    for (let i = 0; i < queries.length; i += batchSize) {
      const batch = queries.slice(i, i + batchSize);

      await Promise.allSettled(
        batch.map(async (q) => {
          try {
            const results = await this.queryAllEngines(q.query, companyName, competitorNames);

            await prisma.aiQueryResult.createMany({
              data: results.map((r) => ({
                analysisId,
                queryId: q.id,
                engine: r.engine,
                rawResponse: r.rawResponse,
                companyMentioned: r.companyMentioned,
                mentionCount: r.mentionCount,
                mentionContext: r.mentionContext,
                citations: r.citations,
                shareOfVoice: r.shareOfVoice,
              })),
            });
          } catch (err) {
            console.error(`[AiQuerying] Failed for query "${q.query}":`, err);
          }
        }),
      );

      // Small delay between batches to respect rate limits
      if (i + batchSize < queries.length) {
        await sleep(1000);
      }
    }
  }
}

export const aiQueryingService = new AiQueryingService();

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function analyzeResponse(
  rawResponse: string,
  engine: 'CHATGPT' | 'PERPLEXITY' | 'GEMINI',
  companyName: string,
  competitorNames: string[],
  citations: string[] = [],
): QueryResult {
  const lower = rawResponse.toLowerCase();
  const companyLower = companyName.toLowerCase();

  // Count company mentions
  const mentionRegex = new RegExp(escapeRegex(companyLower), 'gi');
  const mentionMatches = rawResponse.match(mentionRegex);
  const mentionCount = mentionMatches?.length ?? 0;
  const companyMentioned = mentionCount > 0;

  // Extract context around first mention
  let mentionContext: string | null = null;
  if (companyMentioned) {
    const idx = lower.indexOf(companyLower);
    mentionContext = rawResponse.slice(Math.max(0, idx - 100), idx + 200).trim();
  }

  // Calculate Share of Voice: company mentions vs total brand mentions
  const allBrands = [companyName, ...competitorNames];
  let totalMentions = 0;
  for (const brand of allBrands) {
    const regex = new RegExp(escapeRegex(brand.toLowerCase()), 'gi');
    const matches = rawResponse.match(regex);
    totalMentions += matches?.length ?? 0;
  }
  const shareOfVoice = totalMentions > 0 ? (mentionCount / totalMentions) * 100 : 0;

  return {
    engine,
    rawResponse,
    companyMentioned,
    mentionCount,
    mentionContext,
    citations,
    shareOfVoice: Math.round(shareOfVoice * 100) / 100,
  };
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
