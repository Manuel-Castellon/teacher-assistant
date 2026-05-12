import Anthropic from '@anthropic-ai/sdk';
import type { AnthropicLike } from '../providers/impl/ClaudeTextGenerator';

export type CompletionFn = (systemPrompt: string, userPrompt: string) => Promise<string>;

// ── Anthropic backend ───────────────────────────────────────────────────────

export interface AnthropicBackendOptions {
  apiKey?: string;
  model?: string;
  maxTokens?: number;
  client?: AnthropicLike;
}

export function anthropicBackend(opts: AnthropicBackendOptions = {}): CompletionFn {
  const model = opts.model ?? 'claude-sonnet-4-6';
  const maxTokens = opts.maxTokens ?? 16_000;

  let client: AnthropicLike;
  if (opts.client) {
    client = opts.client;
  } else {
    const apiKey = opts.apiKey ?? process.env['ANTHROPIC_API_KEY'];
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY required for Anthropic backend');
    client = new Anthropic({ apiKey });
  }

  return async (systemPrompt, userPrompt) => {
    const response = await client.messages.create({
      model,
      max_tokens: maxTokens,
      thinking: { type: 'enabled', budget_tokens: 10_000 },
      system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: userPrompt }],
    });

    return response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('')
      .trim();
  };
}

// ── Gemini backend ──────────────────────────────────────────────────────────

export interface GeminiBackendOptions {
  apiKey?: string;
  model?: string;
  maxOutputTokens?: number;
}

interface GeminiPart {
  text?: string;
  thought?: boolean;
}

interface GeminiResponse {
  error?: { message: string; status?: string };
  candidates?: { content: { parts: GeminiPart[] } }[];
}

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export function geminiBackend(opts: GeminiBackendOptions = {}): CompletionFn {
  const apiKey = opts.apiKey ?? process.env['GEMINI_API_KEY'];
  if (!apiKey) throw new Error('GEMINI_API_KEY required for Gemini backend');

  const model = opts.model ?? 'gemini-2.5-flash';
  const maxOutputTokens = opts.maxOutputTokens ?? 65_536;
  const url = `${GEMINI_BASE}/${model}:generateContent`;

  return async (systemPrompt, userPrompt) => {
    const resp = await fetch(`${url}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userPrompt }] }],
        generationConfig: { maxOutputTokens },
      }),
    });

    const data = (await resp.json()) as GeminiResponse;

    if (!resp.ok || data.error) {
      throw new Error(`Gemini API error (${resp.status}): ${data.error?.message ?? resp.statusText}`);
    }

    const parts = data.candidates?.[0]?.content?.parts ?? [];
    const text = parts
      .filter((p): p is GeminiPart & { text: string } => typeof p.text === 'string' && !p.thought)
      .map(p => p.text)
      .join('');

    if (!text) throw new Error('Gemini returned empty response');
    return text.trim();
  };
}

// ── Factory ─────────────────────────────────────────────────────────────────

export function createDefaultBackend(): CompletionFn {
  if (process.env['GEMINI_API_KEY']) return geminiBackend();
  if (process.env['ANTHROPIC_API_KEY']) return anthropicBackend();
  throw new Error('No AI backend configured. Set GEMINI_API_KEY or ANTHROPIC_API_KEY.');
}
