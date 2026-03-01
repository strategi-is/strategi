/**
 * TEST: Company mention detection and Share of Voice calculation
 *
 * Run with:
 *   npx ts-node src/scripts/test-mention-detection.ts
 *
 * What this checks:
 *   1. Does mention detection find obvious company name matches?
 *   2. Does it handle partial matches, abbreviations, case variations?
 *   3. Does it correctly return "not mentioned" for truly absent companies?
 *   4. Is the mention position (rank) calculated correctly?
 *   5. Are competitor mentions counted separately from the company?
 *
 * This is the most likely source of wrong Share of Voice numbers.
 */

import dotenv from 'dotenv';
dotenv.config();

// --- Test cases: [response text, companyName, competitors, expected: mentioned/not]
const TEST_CASES = [
  {
    label: 'Clear direct mention',
    response: 'The best tools for this are Stripe, PayPal, and Square. Stripe leads with their developer API.',
    company: 'Stripe',
    competitors: ['PayPal', 'Square'],
    expectedMentioned: true,
    expectedPosition: 1, // appears first
  },
  {
    label: 'Case-insensitive match',
    response: 'Many businesses use stripe for payments. STRIPE has the best documentation.',
    company: 'Stripe',
    competitors: [],
    expectedMentioned: true,
    expectedPosition: 1,
  },
  {
    label: 'Company genuinely NOT mentioned',
    response: 'PayPal and Square are popular payment processors used by small businesses.',
    company: 'Stripe',
    competitors: ['PayPal', 'Square'],
    expectedMentioned: false,
    expectedPosition: null,
  },
  {
    label: 'Company mentioned later in response (position test)',
    response: 'PayPal is the most popular. Square is second. Stripe comes in third for developer tools.',
    company: 'Stripe',
    competitors: ['PayPal', 'Square'],
    expectedMentioned: true,
    expectedPosition: 3,
  },
  {
    label: 'Partial name / abbreviation (known weakness)',
    response: 'Many companies use Anthropic models. Claude is excellent for reasoning tasks.',
    company: 'Anthropic',
    competitors: ['OpenAI', 'Google'],
    expectedMentioned: true,
    expectedPosition: 1,
  },
  {
    label: 'Company name in unrelated context (false positive risk)',
    response: 'You should apply for jobs at stripe-width companies in finance.',
    company: 'Stripe',
    competitors: [],
    expectedMentioned: false, // "stripe-width" is not a company mention
    expectedPosition: null,
  },
];

// Replicate the mention detection logic from aiQuerying.service.ts
function detectMentions(
  responseText: string,
  companyName: string,
  competitors: string[],
): {
  mentionsCompany: boolean;
  mentionPosition: number | null;
  shareOfVoice: number;
  competitorMentions: Record<string, number>;
} {
  const lower = responseText.toLowerCase();
  const companyLower = companyName.toLowerCase();

  // Count company mentions
  const mentionCount = (lower.match(new RegExp(companyLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
  const mentionsCompany = mentionCount > 0;

  // Find position (which sentence/paragraph first mentions the company)
  let mentionPosition: number | null = null;
  if (mentionsCompany) {
    const sentences = responseText.split(/[.!?\n]+/).filter((s) => s.trim().length > 0);
    const idx = sentences.findIndex((s) => s.toLowerCase().includes(companyLower));
    mentionPosition = idx >= 0 ? idx + 1 : 1;
  }

  // Count competitor mentions
  const competitorMentions: Record<string, number> = {};
  for (const comp of competitors) {
    const compLower = comp.toLowerCase();
    const count = (lower.match(new RegExp(compLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    if (count > 0) competitorMentions[comp] = count;
  }

  // Share of Voice: company mentions / total mentions (company + competitors)
  const totalMentions = mentionCount + Object.values(competitorMentions).reduce((a, b) => a + b, 0);
  const shareOfVoice = totalMentions > 0 ? (mentionCount / totalMentions) * 100 : 0;

  return { mentionsCompany, mentionPosition, shareOfVoice, competitorMentions };
}

async function run() {
  console.log('\n=== Company Mention Detection Tests ===\n');

  let passed = 0;
  let failed = 0;
  const issues: string[] = [];

  for (const tc of TEST_CASES) {
    const result = detectMentions(tc.response, tc.company, tc.competitors);
    const mentionOk = result.mentionsCompany === tc.expectedMentioned;
    const posOk = tc.expectedPosition === null
      ? result.mentionPosition === null
      : result.mentionPosition === tc.expectedPosition;

    const icon = mentionOk && posOk ? '✅' : '❌';
    if (mentionOk && posOk) passed++; else failed++;

    console.log(`${icon} ${tc.label}`);
    console.log(`   Company: "${tc.company}" | Mentioned: ${result.mentionsCompany} (expected: ${tc.expectedMentioned})`);
    console.log(`   Position: ${result.mentionPosition} (expected: ${tc.expectedPosition})`);
    console.log(`   Share of Voice: ${result.shareOfVoice.toFixed(1)}%`);
    if (Object.keys(result.competitorMentions).length > 0) {
      console.log(`   Competitor mentions:`, result.competitorMentions);
    }

    if (!mentionOk) issues.push(`"${tc.label}" — mention detection wrong (got ${result.mentionsCompany}, expected ${tc.expectedMentioned})`);
    if (!posOk) issues.push(`"${tc.label}" — position wrong (got ${result.mentionPosition}, expected ${tc.expectedPosition})`);
    console.log('');
  }

  console.log(`=== Results: ${passed}/${TEST_CASES.length} passed ===`);

  if (issues.length > 0) {
    console.log('\n⚠️  Issues found:');
    issues.forEach((i) => console.log('  -', i));
    console.log('\nThese mean your Share of Voice numbers may be inaccurate.');
    console.log('Consider improving the regex to handle word boundaries and abbreviations.');
  } else {
    console.log('\n✅ All detection logic working correctly on test cases.');
    console.log('Note: Still test with real AI responses — LLMs phrase things unexpectedly.');
  }

  console.log('\n=== Known weaknesses to check manually ===');
  console.log('1. "stripe-width" false positive — does it trigger a mention of Stripe?');
  console.log('2. Abbreviations: "Anthropic" vs "Anthr." vs brand name only ("Claude")');
  console.log('3. Multi-word names: "Google DeepMind" vs "Google" vs "DeepMind"');
  console.log('4. Non-English responses (if Perplexity responds in another language)');
}

run().catch(console.error);
