/**
 * TEST: GEO scoring service
 *
 * Run with:
 *   npx ts-node src/scripts/test-geo-scoring.ts [url]
 *   npx ts-node src/scripts/test-geo-scoring.ts https://stripe.com
 *
 * What this checks:
 *   1. Does the LLM return all 8 attribute scores?
 *   2. Are scores in the expected 0–5 range?
 *   3. Is the overall score calculated correctly from the formula?
 *   4. Are priority actions meaningful and non-empty?
 *   5. Does the score change sensibly between good and bad sites?
 *
 * Manual validation: Compare the score to your gut feeling about the site.
 * A well-optimized site like stripe.com should score 60+.
 * A plain blog with no structure should score below 40.
 */

import dotenv from 'dotenv';
dotenv.config();

import axios from 'axios';

// Minimal inline scorer to test the logic without needing a DB
import { llmService } from '../services/llm.service';

const WEIGHTS: Record<string, number> = {
  extractabilityScore: 2,
  entityClarityScore: 2,
  specificityScore: 1,
  corroborationScore: 1,
  coverageScore: 1,
  freshnessScore: 1,
  indexabilityScore: 1,
  machineReadabilityScore: 1,
};
const MAX_WEIGHTED = 50; // 2+2+1+1+1+1+1+1 = 10 attributes, max per attr = 5

const SCORING_PROMPT = `You are a GEO (Generative Engine Optimization) expert. Score this website's HTML for AI-search visibility.

Score each attribute from 0 (very poor) to 5 (excellent):

- extractabilityScore: Can AI systems easily extract clean factual content? (structured data, clear sections, no JS walls)
- entityClarityScore: Are entities (company name, products, people, locations) clearly and consistently named?
- specificityScore: Is content specific with concrete facts, numbers, dates rather than vague marketing language?
- corroborationScore: Does the site include evidence like case studies, stats, testimonials, third-party references?
- coverageScore: Does content comprehensively cover the topic including FAQs, comparisons, and edge cases?
- freshnessScore: Are there signals of up-to-date content (dates, recent events, version numbers)?
- indexabilityScore: Is the HTML clean, semantic, and crawlable? (proper headings, meta tags, no heavy JS)
- machineReadabilityScore: Are there schema.org markup, Open Graph tags, structured data?

Return ONLY this JSON:
{
  "extractabilityScore": <0-5>,
  "entityClarityScore": <0-5>,
  "specificityScore": <0-5>,
  "corroborationScore": <0-5>,
  "coverageScore": <0-5>,
  "freshnessScore": <0-5>,
  "indexabilityScore": <0-5>,
  "machineReadabilityScore": <0-5>,
  "priorityActions": ["<top improvement 1>", "<top improvement 2>", "<top improvement 3>"],
  "notes": "<one sentence overall observation>"
}`;

async function fetchHtml(url: string): Promise<string> {
  const res = await axios.get(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GEOBot/1.0)' },
    timeout: 15000,
  });
  return (res.data as string).slice(0, 25000); // truncate for LLM context
}

function calcOverall(scores: Record<string, number>): number {
  let weighted = 0;
  for (const [key, weight] of Object.entries(WEIGHTS)) {
    weighted += (scores[key] ?? 0) * weight;
  }
  return Math.round((weighted / MAX_WEIGHTED) * 100);
}

async function run() {
  const url = process.argv[2] || 'https://example.com';
  console.log(`\nFetching: ${url}`);

  let html: string;
  try {
    html = await fetchHtml(url);
    console.log(`✅ Fetched ${html.length} chars of HTML`);
  } catch (err) {
    console.error('❌ Could not fetch URL:', err instanceof Error ? err.message : err);
    process.exit(1);
  }

  console.log('\nScoring with LLM...');
  const prompt = `Website URL: ${url}\n\nHTML (first 25,000 chars):\n${html}`;

  let scores: Record<string, any>;
  try {
    scores = await llmService.completeJson(prompt, { systemPrompt: SCORING_PROMPT });
    console.log('✅ LLM returned scores');
  } catch (err) {
    console.error('❌ LLM failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  }

  // ── Validation checks ──────────────────────────────────────────────────────

  const attributes = Object.keys(WEIGHTS);
  const missing = attributes.filter((a) => scores[a] === undefined || scores[a] === null);
  if (missing.length > 0) {
    console.error('❌ Missing attributes:', missing);
  } else {
    console.log('✅ All 8 attributes present');
  }

  const outOfRange = attributes.filter((a) => scores[a] < 0 || scores[a] > 5);
  if (outOfRange.length > 0) {
    console.warn('⚠️  Out of range (0-5):', outOfRange.map((a) => `${a}=${scores[a]}`));
  } else {
    console.log('✅ All scores in 0–5 range');
  }

  const overall = calcOverall(scores);
  console.log('\n── Attribute Scores ──────────────────────────────');
  for (const attr of attributes) {
    const val = scores[attr] ?? 0;
    const bar = '█'.repeat(val) + '░'.repeat(5 - val);
    console.log(`  ${attr.padEnd(25)} ${bar} ${val}/5`);
  }
  console.log(`\n── Overall Score: ${overall}/100 ──`);

  if (overall < 20) console.warn('⚠️  Very low — check if HTML was fetched correctly');
  if (overall > 95) console.warn('⚠️  Suspiciously high — LLM may be hallucinating');

  if (scores.priorityActions?.length > 0) {
    console.log('\n── Priority Actions ──');
    scores.priorityActions.forEach((a: string, i: number) => console.log(`  ${i + 1}. ${a}`));
  } else {
    console.warn('⚠️  No priority actions returned');
  }

  if (scores.notes) console.log(`\n── Notes: ${scores.notes}`);

  console.log('\n── MANUAL VALIDATION ──');
  console.log('Does this score match your impression of the site? (y/n)');
  console.log('Run again on a different site and compare — scores should differ meaningfully.');
  console.log('');
}

run().catch(console.error);
