import { execFile, execFileSync } from 'node:child_process';
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

// ── Claude CLI backend (local dev fallback) ────────────────────────────────

export type ExecFn = typeof execFile;

export function claudeCliBackend(exec?: ExecFn): CompletionFn {
  const run = exec ?? execFile;
  return async (systemPrompt, userPrompt) => {
    const prompt = `${systemPrompt}\n\n---\n\n${userPrompt}`;
    const text = await new Promise<string>((resolve, reject) => {
      run(
        'claude',
        ['-p', prompt, '--output-format', 'text'],
        { maxBuffer: 4 * 1024 * 1024, timeout: 120_000 },
        (err, stdout, stderr) => {
          if (err) return reject(new Error(`claude CLI failed: ${stderr || err.message}`));
          if (!stdout.trim()) return reject(new Error('claude CLI returned empty output'));
          resolve(stdout.trim());
        },
      );
    });
    return text;
  };
}

// ── Factory ─────────────────────────────────────────────────────────────────

export function createDefaultBackend(): CompletionFn {
  const candidates: CompletionFn[] = [];
  if (process.env['GEMINI_API_KEY']) candidates.push(geminiBackend());
  if (process.env['ANTHROPIC_API_KEY']) candidates.push(anthropicBackend());
  try {
    execFileSync('which', ['claude'], { stdio: 'ignore' });
    candidates.push(claudeCliBackend());
  } catch {
    // claude CLI not found
  }
  /* istanbul ignore next -- unreachable when claude CLI is installed */
  if (candidates.length === 0) {
    throw new Error('No AI backend configured. Set GEMINI_API_KEY or ANTHROPIC_API_KEY, or install the claude CLI.');
  }
  if (candidates.length === 1) return candidates[0]!;

  return fallbackChain(candidates);
}

export function fallbackChain(backends: CompletionFn[]): CompletionFn {
  return async (systemPrompt, userPrompt) => {
    let lastError: Error | undefined;
    for (const backend of backends) {
      try {
        return await backend(systemPrompt, userPrompt);
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
      }
    }
    throw lastError!;
  };
}
