import { prisma } from '../prisma/client';
import { llmService } from './llm.service';

interface GeneratedQuery {
  query: string;
  buyerStage: 'AWARENESS' | 'CONSIDERATION' | 'DECISION';
  relevanceScore: number;
}

interface CompanyContext {
  name: string;
  websiteUrl: string;
  industry: string;
  targetAudience: string;
  productsServices: string;
  keyDifferentiators: string;
  competitors: { name?: string | null; websiteUrl: string }[];
}

export class QueryGenerationService {
  async generateQueries(
    companyId: string,
    analysisId: string,
    context: CompanyContext,
  ): Promise<void> {
    const prompt = buildQueryGenerationPrompt(context);

    const result = await llmService.completeJson<{ queries: GeneratedQuery[] }>(prompt, {
      maxTokens: 3000,
      temperature: 0.4,
      systemPrompt: QUERY_SYSTEM_PROMPT,
    });

    const queries = result.queries.slice(0, 50); // cap at 50 per PRD

    // Persist to DB
    await prisma.targetQuery.createMany({
      data: queries.map((q) => ({
        companyId,
        analysisId,
        query: q.query,
        buyerStage: q.buyerStage,
        relevanceScore: q.relevanceScore,
        isCustom: false,
      })),
    });
  }
}

export const queryGenerationService = new QueryGenerationService();

// ─── PROMPTS ──────────────────────────────────────────────────────────────────

const QUERY_SYSTEM_PROMPT = `You are a B2B market research expert specializing in how buyers
search for solutions using AI search engines like ChatGPT, Perplexity, and Gemini.
You generate highly relevant, realistic search queries that B2B buyers actually ask AI systems.`;

function buildQueryGenerationPrompt(ctx: CompanyContext): string {
  const competitorList = ctx.competitors
    .map((c) => `- ${c.name || 'Unknown'} (${c.websiteUrl})`)
    .join('\n');

  return `Generate 40-50 target queries for the following B2B company. These are queries that
their ideal buyers would ask an AI search engine (ChatGPT, Perplexity, Gemini) when researching solutions.

COMPANY PROFILE:
- Company: ${ctx.name}
- Website: ${ctx.websiteUrl}
- Industry: ${ctx.industry}
- Target Audience: ${ctx.targetAudience}
- Products/Services: ${ctx.productsServices}
- Key Differentiators: ${ctx.keyDifferentiators}
- Competitors:
${competitorList || 'None provided'}

REQUIREMENTS:
- Cover all 3 buyer journey stages: AWARENESS (30%), CONSIDERATION (40%), DECISION (30%)
- Queries should sound natural, like real questions asked to an AI assistant
- Mix question formats: "what is...", "how to...", "best [solution] for...", "compare...", "[company] vs..."
- Include industry-specific terminology
- Include competitor comparison queries
- Avoid generic queries with no industry context
- Relevance score (0-1): how likely this query would surface the company if they had great GEO

Return ONLY valid JSON in this exact format:
{
  "queries": [
    {
      "query": "what is the best [solution type] for [target audience]?",
      "buyerStage": "AWARENESS",
      "relevanceScore": 0.85
    }
  ]
}`;
}
