import { prisma } from '../prisma/client';
import { llmService } from './llm.service';
import { GeoScoreResult } from '../types';

// Weights per PRD: extractability and entityClarity are 2x
const WEIGHTS = {
  extractability: 2,
  entityClarity: 2,
  specificity: 1,
  corroboration: 1,
  coverage: 1,
  freshness: 1,
  indexability: 1,
  machineReadability: 1,
};
const TOTAL_WEIGHT = Object.values(WEIGHTS).reduce((a, b) => a + b, 0); // 10
const MAX_RAW = 5 * TOTAL_WEIGHT; // 50

export class GeoScoringService {
  async scoreWebsite(
    analysisId: string,
    html: string,
    websiteUrl: string,
    industry: string,
    scrapedAt: Date,
  ): Promise<void> {
    const prompt = buildScoringPrompt(html, websiteUrl, industry, scrapedAt);

    const result = await llmService.completeJson<GeoScoreResult>(prompt, {
      maxTokens: 4000,
      temperature: 0.1, // low temp for consistent scoring
      systemPrompt: SCORING_SYSTEM_PROMPT,
    });

    // Recalculate overall score with weights to ensure consistency
    const attrs = result.attributes;
    const weightedSum =
      attrs.extractability.score * WEIGHTS.extractability +
      attrs.entityClarity.score * WEIGHTS.entityClarity +
      attrs.specificity.score * WEIGHTS.specificity +
      attrs.corroboration.score * WEIGHTS.corroboration +
      attrs.coverage.score * WEIGHTS.coverage +
      attrs.freshness.score * WEIGHTS.freshness +
      attrs.indexability.score * WEIGHTS.indexability +
      attrs.machineReadability.score * WEIGHTS.machineReadability;

    const overallScore = Math.round((weightedSum / MAX_RAW) * 100);

    await prisma.geoScore.create({
      data: {
        analysisId,
        overallScore,
        industryBenchmark: result.industryBenchmark ?? null,
        scrapeQuality: result.scrapeQuality ?? null,
        extractabilityScore: attrs.extractability.score,
        extractabilityNotes: formatNotes(attrs.extractability),
        entityClarityScore: attrs.entityClarity.score,
        entityClarityNotes: formatNotes(attrs.entityClarity),
        specificityScore: attrs.specificity.score,
        specificityNotes: formatNotes(attrs.specificity),
        corroborationScore: attrs.corroboration.score,
        corroborationNotes: formatNotes(attrs.corroboration),
        coverageScore: attrs.coverage.score,
        coverageNotes: formatNotes(attrs.coverage),
        freshnessScore: attrs.freshness.score,
        freshnessNotes: formatNotes(attrs.freshness),
        indexabilityScore: attrs.indexability.score,
        indexabilityNotes: formatNotes(attrs.indexability),
        machineReadabilityScore: attrs.machineReadability.score,
        machineReadabilityNotes: formatNotes(attrs.machineReadability),
        priorityActions: result.priorityActions,
      },
    });
  }
}

export const geoScoringService = new GeoScoringService();

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function formatNotes(attr: { justification: string; examples: string[]; improvements: string[] }): string {
  return JSON.stringify({
    justification: attr.justification,
    examples: attr.examples,
    improvements: attr.improvements,
  });
}

// ─── PROMPTS ──────────────────────────────────────────────────────────────────

const SCORING_SYSTEM_PROMPT = `You are a GEO (Generative Engine Optimization) analyst.
You evaluate websites on how well they are optimized to appear in AI-generated search responses
from systems like ChatGPT, Perplexity, and Gemini.
Be objective, specific, and base all scoring on the actual HTML content provided.
Do not hallucinate features or content that isn't present in the HTML.`;

function buildScoringPrompt(
  html: string,
  websiteUrl: string,
  industry: string,
  scrapedAt: Date,
): string {
  // Truncate HTML to ~25k chars to stay within context limits
  const truncatedHtml = html.length > 25000
    ? html.slice(0, 25000) + '\n... [HTML TRUNCATED FOR LENGTH]'
    : html;

  return `You are evaluating the GEO readiness of a website for the ${industry} industry.

IMPORTANT CONTEXT:
- Website URL: ${websiteUrl}
- Industry: ${industry}
- Content scraped at: ${scrapedAt.toISOString()}
- This HTML was rendered by a headless browser (Olostep), so dynamic content IS included.
- Analyze the actual content, not just the HTML structure.

WEBSITE HTML:
${truncatedHtml}

SCORING TASK:
Score this website across 8 GEO attributes on a 0-5 scale:

1. EXTRACTABILITY: Are there quote-ready answer blocks, structured data, clear Q&A sections,
   numbered lists, definition boxes, and tables that AI can directly extract?

2. ENTITY_CLARITY: Is it unambiguous who/what/where this company is? Clear company name,
   what they do, location, founding info, key people — without needing context?

3. SPECIFICITY: Are there specific numbers, statistics, constraints, timelines, pricing ranges,
   named examples, and concrete claims (not vague "we help you grow")?

4. CORROBORATION: Are claims backed by proof? Case studies, testimonials with specifics,
   awards, certifications, methodology explanations, named clients?

5. COVERAGE: Does the site cover the full topic map for its category? Comprehensive FAQs,
   use cases, comparison pages, category pages? Minimal content cannibalization?

6. FRESHNESS: Is content recently updated? Are there dated blog posts, changelogs,
   "updated" timestamps, recent case studies?

7. INDEXABILITY: Is the site crawlable and renderable? Clean URLs, proper sitemap signals,
   no obvious JavaScript rendering issues in the HTML, stable page structure?

8. MACHINE_READABILITY: Does it use semantic HTML (h1-h6 hierarchy, schema.org markup,
   Open Graph tags, proper meta descriptions, article/section tags)?

For each attribute provide:
- score: 0-5 (0=completely missing, 5=excellent)
- justification: 2-3 sentences explaining the score
- examples: 2-3 specific examples FROM the HTML (quote actual text or element names)
- improvements: 2-3 concrete, actionable improvements

Also estimate the industry benchmark score (0-100 overall) for ${industry} companies.

Return ONLY valid JSON:
{
  "overall_score": 0-100,
  "industry_benchmark": 0-100,
  "scrape_quality": "good|fair|poor",
  "attributes": {
    "extractability": { "score": 0-5, "justification": "...", "examples": ["..."], "improvements": ["..."] },
    "entityClarity": { "score": 0-5, "justification": "...", "examples": ["..."], "improvements": ["..."] },
    "specificity": { "score": 0-5, "justification": "...", "examples": ["..."], "improvements": ["..."] },
    "corroboration": { "score": 0-5, "justification": "...", "examples": ["..."], "improvements": ["..."] },
    "coverage": { "score": 0-5, "justification": "...", "examples": ["..."], "improvements": ["..."] },
    "freshness": { "score": 0-5, "justification": "...", "examples": ["..."], "improvements": ["..."] },
    "indexability": { "score": 0-5, "justification": "...", "examples": ["..."], "improvements": ["..."] },
    "machineReadability": { "score": 0-5, "justification": "...", "examples": ["..."], "improvements": ["..."] }
  },
  "priorityActions": ["action 1", "action 2", "action 3", "action 4", "action 5"]
}`;
}
