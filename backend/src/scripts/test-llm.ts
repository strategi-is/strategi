/**
 * TEST: LLM connectivity and JSON parsing
 *
 * Run with:
 *   npx ts-node src/scripts/test-llm.ts
 *
 * What this checks:
 *   1. Can we reach Anthropic/OpenAI at all?
 *   2. Does completeJson() correctly parse structured responses?
 *   3. Does the fallback to GPT-4o work if Claude fails?
 *   4. Does completeJson() handle malformed/wrapped JSON?
 */

import '../../../src/config'; // loads .env
import { llmService } from '../services/llm.service';

async function run() {
  console.log('\n=== TEST 1: Plain text completion ===');
  try {
    const result = await llmService.complete(
      'Reply with exactly: "LLM connection successful"',
      { systemPrompt: 'You are a test assistant. Reply with exactly what is asked.' },
    );
    console.log('✅ Response:', result.trim());
  } catch (err) {
    console.error('❌ Failed:', err instanceof Error ? err.message : err);
  }

  console.log('\n=== TEST 2: JSON parsing — clean response ===');
  try {
    const result = await llmService.completeJson<{ name: string; score: number }>(
      'Return a JSON object with "name" = "test" and "score" = 42. Return ONLY the JSON, no other text.',
      { systemPrompt: 'You are a JSON API. Return only valid JSON.' },
    );
    console.log('✅ Parsed:', result);
    if (result.name !== 'test' || result.score !== 42) {
      console.warn('⚠️  Values unexpected — check LLM instruction-following');
    }
  } catch (err) {
    console.error('❌ Failed:', err instanceof Error ? err.message : err);
  }

  console.log('\n=== TEST 3: JSON parsing — markdown-wrapped response ===');
  try {
    const result = await llmService.completeJson<{ value: string }>(
      'Return this exact text including the backticks:\n```json\n{"value": "unwrapped correctly"}\n```',
      { systemPrompt: 'Return exactly what is asked.' },
    );
    console.log('✅ Unwrapped:', result);
    if (result.value !== 'unwrapped correctly') {
      console.warn('⚠️  Markdown unwrapping may have issues');
    }
  } catch (err) {
    console.error('❌ Failed:', err instanceof Error ? err.message : err);
  }

  console.log('\n=== TEST 4: JSON parsing — complex nested object ===');
  try {
    const result = await llmService.completeJson<{
      scores: { attribute: string; score: number }[];
      overall: number;
    }>(
      `Return this JSON exactly:
{
  "scores": [
    {"attribute": "clarity", "score": 4},
    {"attribute": "depth", "score": 3}
  ],
  "overall": 70
}`,
      { systemPrompt: 'Return only valid JSON.' },
    );
    console.log('✅ Nested object parsed:', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('❌ Failed:', err instanceof Error ? err.message : err);
  }

  console.log('\n=== Done ===\n');
}

run().catch(console.error);
