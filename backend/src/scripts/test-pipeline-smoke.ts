/**
 * TEST: End-to-end pipeline smoke test (no DB required)
 *
 * Run with:
 *   npx ts-node src/scripts/test-pipeline-smoke.ts
 *
 * This runs each AI service in isolation with a real company context
 * so you can verify output quality before running a full analysis.
 *
 * Uses YOUR OWN SITE as the test subject so you can judge if results are accurate.
 * Change COMPANY below to your actual company details.
 */

import dotenv from 'dotenv';
dotenv.config();

import { llmService } from '../services/llm.service';

// ── CONFIGURE THIS ───────────────────────────────────────────────────────────
const COMPANY = {
  name: 'Strategi',
  websiteUrl: 'https://strategi.ai',
  industry: 'B2B SaaS / GEO Analytics',
  targetAudience: 'Marketing teams and SEO professionals at B2B companies',
  productsServices: 'GEO analytics platform that tracks and improves AI search visibility',
  keyDifferentiators: 'First platform to specifically target generative AI search engines',
  competitors: ['BrightEdge', 'Semrush', 'Ahrefs'],
};
// ─────────────────────────────────────────────────────────────────────────────

async function testQueryGeneration() {
  console.log('\n=== STEP 1: Query Generation ===');
  console.log('Generating target queries...\n');

  const prompt = `Generate 10 search queries that ${COMPANY.targetAudience} would type into an AI engine like ChatGPT when looking for solutions related to: ${COMPANY.productsServices}.

Mix across buyer stages:
- 3 AWARENESS queries (general problem/education)
- 4 CONSIDERATION queries (comparing solutions)
- 3 DECISION queries (specific to buying/choosing)

Return JSON array:
[{"query": "...", "buyerStage": "AWARENESS|CONSIDERATION|DECISION", "relevanceScore": 0.0-1.0}]`;

  try {
    const queries = await llmService.completeJson<
      { query: string; buyerStage: string; relevanceScore: number }[]
    >(prompt, { systemPrompt: 'You are a B2B marketing expert. Return only valid JSON.' });

    console.log(`✅ Generated ${queries.length} queries\n`);

    const byStage = queries.reduce((acc: Record<string, number>, q) => {
      acc[q.buyerStage] = (acc[q.buyerStage] || 0) + 1;
      return acc;
    }, {});
    console.log('Distribution:', byStage);
    console.log('');

    queries.forEach((q, i) => {
      console.log(`  ${i + 1}. [${q.buyerStage}] ${q.query}`);
      console.log(`     Relevance: ${q.relevanceScore}`);
    });

    // Validation
    if (queries.length < 5) console.warn('⚠️  Too few queries generated');
    if (!byStage['AWARENESS']) console.warn('⚠️  No AWARENESS queries');
    if (!byStage['DECISION']) console.warn('⚠️  No DECISION queries');
    const lowRelevance = queries.filter((q) => q.relevanceScore < 0.5);
    if (lowRelevance.length > 3) console.warn(`⚠️  ${lowRelevance.length} queries with low relevance`);

    return queries.slice(0, 3); // return 3 for next steps
  } catch (err) {
    console.error('❌ Failed:', err instanceof Error ? err.message : err);
    return [];
  }
}

async function testAiQuerySimulation(query: string) {
  console.log(`\n=== STEP 2: AI Response Simulation ===`);
  console.log(`Query: "${query}"\n`);

  // Instead of calling real ChatGPT/Perplexity (costs money), simulate a response
  // and test our parsing logic on it
  const simulatedResponse = await llmService.complete(
    `Answer this question as if you are ChatGPT: "${query}"

    In your response, naturally mention some or all of these companies where relevant:
    ${[COMPANY.name, ...COMPANY.competitors].join(', ')}

    Write 2-3 paragraphs as a helpful AI assistant would.`,
    { systemPrompt: 'You are simulating an AI assistant response for testing purposes.' },
  );

  console.log('Simulated AI response:\n');
  console.log(simulatedResponse);
  console.log('\n--- Mention Analysis ---');

  const lower = simulatedResponse.toLowerCase();
  const companyMentioned = lower.includes(COMPANY.name.toLowerCase());
  const competitorMentions = COMPANY.competitors.filter((c) =>
    lower.includes(c.toLowerCase()),
  );

  console.log(`"${COMPANY.name}" mentioned: ${companyMentioned ? '✅ YES' : '❌ NO'}`);
  console.log(`Competitors mentioned: ${competitorMentions.length > 0 ? competitorMentions.join(', ') : 'none'}`);

  if (!companyMentioned && competitorMentions.length > 0) {
    console.warn(`\n⚠️  PROBLEM: Competitors mentioned but not ${COMPANY.name}`);
    console.warn('This is exactly what GEO optimization should fix.');
  }

  return simulatedResponse;
}

async function testBlogGeneration() {
  console.log('\n=== STEP 3: Blog Post Generation ===');
  console.log('Generating a sample blog post...\n');

  const targetQuery = `best tools to improve AI search visibility for B2B companies`;

  const prompt = `Write a GEO-optimized blog post for this target query: "${targetQuery}"

Company context:
- Name: ${COMPANY.name}
- Industry: ${COMPANY.industry}
- Audience: ${COMPANY.targetAudience}
- Product: ${COMPANY.productsServices}

Requirements:
- 400-600 words (abbreviated for testing)
- Include a definition of GEO near the top
- Include 1 FAQ section with 2 questions
- Mention the company name naturally 2-3 times
- Use concrete facts and numbers where possible

Return JSON:
{
  "title": "...",
  "slug": "...",
  "content": "...",
  "wordCount": 123,
  "geoComplianceScore": 0.0-1.0
}`;

  try {
    const post = await llmService.completeJson<{
      title: string;
      slug: string;
      content: string;
      wordCount: number;
      geoComplianceScore: number;
    }>(prompt, { systemPrompt: 'You are a GEO content expert. Return only valid JSON.' });

    console.log(`✅ Blog post generated`);
    console.log(`Title: ${post.title}`);
    console.log(`Slug: ${post.slug}`);
    console.log(`Word count: ${post.wordCount}`);
    console.log(`GEO compliance score: ${post.geoComplianceScore}`);
    console.log('\n--- First 500 chars of content ---');
    console.log(post.content.slice(0, 500) + '...');

    // Validation
    if (!post.title) console.warn('⚠️  No title generated');
    if (!post.content || post.content.length < 200) console.warn('⚠️  Content too short');
    if (!post.content?.toLowerCase().includes(COMPANY.name.toLowerCase())) {
      console.warn(`⚠️  Company name "${COMPANY.name}" not found in content`);
    }
    if (post.geoComplianceScore > 1) {
      console.warn('⚠️  GEO compliance score > 1 — LLM may not understand 0-1 range');
    }
  } catch (err) {
    console.error('❌ Failed:', err instanceof Error ? err.message : err);
  }
}

async function run() {
  console.log('=== Pipeline Smoke Test ===');
  console.log(`Company: ${COMPANY.name}`);
  console.log('This tests each AI service in isolation without needing a DB or Olostep.\n');

  const queries = await testQueryGeneration();

  if (queries.length > 0) {
    await testAiQuerySimulation(queries[0].query);
  }

  await testBlogGeneration();

  console.log('\n=== Summary ===');
  console.log('Check the output above against these questions:');
  console.log('1. Do the queries look like things your customers would actually search for?');
  console.log('2. In the simulated AI response, is your company mentioned?');
  console.log('3. Does the blog post read naturally, or is it obviously AI-generated?');
  console.log('4. Are the word counts and scores plausible numbers?');
  console.log('\nIf any answer is "no", the relevant service needs prompt tuning.');
}

run().catch(console.error);
