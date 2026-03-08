import { prisma } from '../prisma/client';
import { llmService } from './llm.service';

interface CompanyContext {
  name: string;
  websiteUrl: string;
  industry: string;
  targetAudience: string;
  productsServices: string;
  keyDifferentiators: string;
  brandVoiceNotes?: string | null;
}


export class ContentGenerationService {
  /**
   * Generate page-level improvement recommendations based on GEO score
   */
  async generatePageRecommendations(
    analysisId: string,
    companyCtx: CompanyContext,
    geoScoreNotes: string,
    scrapedHtml: string,
  ): Promise<void> {
    const prompt = buildRecommendationsPrompt(companyCtx, geoScoreNotes, scrapedHtml);

    const result = await llmService.completeJson<{
      recommendations: Array<{
        pageUrl: string;
        pageType: string;
        priority: 'HIGH' | 'MEDIUM' | 'LOW';
        title: string;
        description: string;
        improvements: string[];
      }>;
    }>(prompt, {
      maxTokens: 8192,
      temperature: 0.3,
      systemPrompt: RECOMMENDATIONS_SYSTEM_PROMPT,
    });

    await prisma.pageRecommendation.createMany({
      data: result.recommendations.map((r) => ({
        analysisId,
        pageUrl: r.pageUrl,
        pageType: r.pageType,
        priority: r.priority,
        title: r.title,
        description: r.description,
        improvements: r.improvements,
      })),
    });
  }

  /**
   * Generate a full blog post for a given target query
   */
  async generateBlogPost(
    analysisId: string,
    companyCtx: CompanyContext,
    targetQuery: string,
    buyerStage: string,
  ): Promise<string> {
    const prompt = buildBlogPrompt(companyCtx, targetQuery, buyerStage);

    const result = await llmService.completeJson<{
      title: string;
      slug: string;
      content: string;
      wordCount: number;
      geoComplianceScore: number;
    }>(prompt, {
      maxTokens: 5000,
      temperature: 0.5,
      systemPrompt: BLOG_SYSTEM_PROMPT,
    });

    const post = await prisma.blogPost.create({
      data: {
        analysisId,
        title: result.title,
        slug: result.slug,
        targetQuery,
        buyerStage: buyerStage as any,
        content: result.content,
        wordCount: result.wordCount || result.content.split(/\s+/).length,
        geoComplianceScore: result.geoComplianceScore,
        status: 'DRAFT',
      },
    });

    return post.id;
  }

  /**
   * Generate blog topic suggestions, then generate top 3 as full posts
   */
  async generateBlogSuite(analysisId: string, companyCtx: CompanyContext): Promise<void> {
    // Get top queries by relevance
    const topQueries = await prisma.targetQuery.findMany({
      where: { analysisId },
      orderBy: { relevanceScore: 'desc' },
      take: 10,
    });

    // Pick 3 queries — one per buyer stage if possible
    const stages = ['AWARENESS', 'CONSIDERATION', 'DECISION'] as const;
    const selectedQueries: typeof topQueries = [];

    for (const stage of stages) {
      const match = topQueries.find(
        (q) => q.buyerStage === stage && !selectedQueries.includes(q),
      );
      if (match) selectedQueries.push(match);
    }

    // Fill remaining slots with highest-scoring unused queries
    for (const q of topQueries) {
      if (selectedQueries.length >= 3) break;
      if (!selectedQueries.includes(q)) selectedQueries.push(q);
    }

    // Generate each blog post sequentially to avoid token rate limits
    for (const q of selectedQueries) {
      try {
        await this.generateBlogPost(analysisId, companyCtx, q.query, q.buyerStage);
      } catch (err) {
        console.error(`[ContentGen] Failed to generate blog for query "${q.query}":`, err);
      }
    }
  }

  /**
   * Regenerate a blog post with revision feedback
   */
  async reviseBlogPost(blogPostId: string, feedback: string): Promise<void> {
    const post = await prisma.blogPost.findUnique({
      where: { id: blogPostId },
      include: { analysis: { include: { company: true } } },
    });

    if (!post) throw new Error('Blog post not found');

    // Save previous version
    const revision = await prisma.blogRevision.create({
      data: {
        blogPostId,
        feedback,
        previousContent: post.content,
      },
    });

    const company = post.analysis.company;
    const prompt = buildRevisionPrompt(post.content, feedback, company.name, company.industry);

    const result = await llmService.completeJson<{
      title: string;
      content: string;
      wordCount: number;
      geoComplianceScore: number;
    }>(prompt, {
      maxTokens: 5000,
      temperature: 0.5,
      systemPrompt: BLOG_SYSTEM_PROMPT,
    });

    // Update the specific revision record with new content
    await prisma.blogRevision.update({
      where: { id: revision.id },
      data: { newContent: result.content },
    });

    await prisma.blogPost.update({
      where: { id: blogPostId },
      data: {
        title: result.title,
        content: result.content,
        wordCount: result.wordCount || result.content.split(/\s+/).length,
        geoComplianceScore: result.geoComplianceScore,
        revisionCount: { increment: 1 },
        status: 'DRAFT',
      },
    });
  }
}

export const contentGenerationService = new ContentGenerationService();

// ─── PROMPTS ──────────────────────────────────────────────────────────────────

const RECOMMENDATIONS_SYSTEM_PROMPT = `You are a GEO (Generative Engine Optimization) consultant.
You analyze B2B company websites and provide specific, actionable recommendations to improve
their visibility in AI-generated search responses. Focus on concrete changes, not generic advice.`;

const BLOG_SYSTEM_PROMPT = `You are an expert B2B content writer specializing in GEO-optimized content.
You write authoritative, specific, data-rich blog posts that are designed to be cited by AI search engines.
Key principles:
- Include a definition/answer block near the top (the "snippet target")
- Use specific numbers, statistics, and named examples
- Include comparison tables where relevant
- Add an FAQ section at the end with direct answers
- Use proper H2/H3 structure
- Write in a professional but approachable B2B tone
- NO generic filler phrases like "In today's fast-paced world..." or "It's crucial to..."`;

function buildRecommendationsPrompt(
  ctx: CompanyContext,
  geoScoreNotes: string,
  scrapedHtml: string,
): string {
  const truncatedHtml = scrapedHtml.slice(0, 8000);

  return `Based on the GEO analysis below, generate 5-8 specific page recommendations for ${ctx.name}.

COMPANY: ${ctx.name} | ${ctx.industry}
WEBSITE: ${ctx.websiteUrl}
TARGET AUDIENCE: ${ctx.targetAudience}
PRODUCTS/SERVICES: ${ctx.productsServices}

GEO SCORE ANALYSIS NOTES:
${geoScoreNotes}

WEBSITE HTML SAMPLE:
${truncatedHtml}

Generate recommendations for specific pages (homepage, about, product/service pages, pricing, FAQ).
Prioritize pages that need the most GEO improvement.

Return ONLY valid JSON:
{
  "recommendations": [
    {
      "pageUrl": "https://example.com/about",
      "pageType": "About Page",
      "priority": "HIGH",
      "title": "Add entity clarity section to About page",
      "description": "Clear 2-3 sentence description of what needs to change and why",
      "improvements": [
        "Add a definition box: 'What is [CompanyName]?' with a 2-sentence answer",
        "Include founding year, headquarters location, and team size",
        "Add schema.org Organization markup with all required fields"
      ]
    }
  ]
}`;
}

function buildBlogPrompt(
  ctx: CompanyContext,
  targetQuery: string,
  buyerStage: string,
): string {
  const brandVoice = ctx.brandVoiceNotes
    ? `\nBRAND VOICE GUIDELINES:\n${ctx.brandVoiceNotes}`
    : '';

  return `Write a GEO-optimized blog post for ${ctx.name} targeting this AI search query:

TARGET QUERY: "${targetQuery}"
BUYER STAGE: ${buyerStage}
COMPANY: ${ctx.name}
INDUSTRY: ${ctx.industry}
TARGET AUDIENCE: ${ctx.targetAudience}
PRODUCTS/SERVICES: ${ctx.productsServices}
KEY DIFFERENTIATORS: ${ctx.keyDifferentiators}${brandVoice}

REQUIREMENTS:
- Length: 1000-1500 words
- Must include a "Quick Answer" or definition box in the first 150 words
- Must include at least one comparison table or structured list
- Must include an FAQ section (5+ questions) with direct answers
- Use H2 and H3 headings throughout
- Include specific numbers, statistics, or data points (can be industry estimates)
- Mention ${ctx.name} naturally but not excessively (3-5 times)
- End with a clear CTA relevant to ${ctx.name}'s offerings
- Write the full content in Markdown format

GEO COMPLIANCE SCORE: Rate 0-100 how well this content would perform for AI citation

Return ONLY valid JSON:
{
  "title": "SEO/GEO optimized title",
  "slug": "url-friendly-slug",
  "content": "Full markdown content here...",
  "wordCount": 1200,
  "geoComplianceScore": 85
}`;
}

function buildRevisionPrompt(
  currentContent: string,
  feedback: string,
  companyName: string,
  industry: string,
): string {
  return `Revise the following blog post based on the feedback provided.
Maintain all GEO optimization principles while addressing the specific feedback.

COMPANY: ${companyName} | ${industry}

CUSTOMER FEEDBACK:
${feedback}

CURRENT CONTENT:
${currentContent}

Apply the feedback carefully. Keep what's working. Fix what was flagged.
Maintain: definition box, FAQ section, specific data points, proper heading structure.

Return ONLY valid JSON with the same structure:
{
  "title": "...",
  "content": "Full revised markdown content...",
  "wordCount": 1200,
  "geoComplianceScore": 88
}`;
}
