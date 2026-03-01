import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { config } from '../config';

const anthropic = new Anthropic({ apiKey: config.llm.anthropicKey });
const openai = new OpenAI({ apiKey: config.llm.openaiKey });

interface LlmOptions {
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

export class LlmService {
  /**
   * Call Claude (primary). Falls back to GPT-4o on failure.
   */
  async complete(prompt: string, opts: LlmOptions = {}): Promise<string> {
    const { maxTokens = 4096, temperature = 0.3, systemPrompt } = opts;

    try {
      const msg = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: maxTokens,
        temperature,
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }],
      });

      const block = msg.content[0];
      if (block.type !== 'text') throw new Error('Unexpected response type from Claude');
      return block.text;
    } catch (err) {
      console.warn('[LLM] Claude failed, falling back to GPT-4o:', err instanceof Error ? err.message : err);
      return this.openaiComplete(prompt, opts);
    }
  }

  async openaiComplete(prompt: string, opts: LlmOptions = {}): Promise<string> {
    const { maxTokens = 4096, temperature = 0.3, systemPrompt } = opts;
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    messages.push({ role: 'user', content: prompt });

    const res = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: maxTokens,
      temperature,
      messages,
    });

    return res.choices[0]?.message?.content ?? '';
  }

  /**
   * Parse JSON response from LLM, retrying once on parse failure.
   */
  async completeJson<T>(prompt: string, opts: LlmOptions = {}): Promise<T> {
    const raw = await this.complete(prompt, opts);
    return parseJsonFromLlm<T>(raw);
  }
}

export const llmService = new LlmService();

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function parseJsonFromLlm<T>(text: string): T {
  // Strip markdown code fences if present
  const cleaned = text
    .replace(/^```(?:json)?\n?/m, '')
    .replace(/\n?```$/m, '')
    .trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Try to extract first JSON object/array
    const match = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (match) {
      return JSON.parse(match[1]) as T;
    }
    throw new Error(`LLM response was not valid JSON:\n${cleaned.slice(0, 500)}`);
  }
}
