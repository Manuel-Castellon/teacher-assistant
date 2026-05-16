import { execFileSync, spawn } from 'node:child_process';
import Anthropic from '@anthropic-ai/sdk';
import type { AnthropicLike } from '../providers/impl/ClaudeTextGenerator';

export type CompletionFn = (systemPrompt: string, userPrompt: string) => Promise<string>;
export type BackendName = 'gemini' | 'gemini-3-flash' | 'gemini-2.5-pro' | 'anthropic' | 'claude-cli' | 'codex';

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

export type SpawnFn = typeof spawn;

export function claudeCliBackend(spawnFn?: SpawnFn): CompletionFn {
  const run = spawnFn ?? spawn;
  return async (systemPrompt, userPrompt) => {
    const prompt = `${systemPrompt}\n\n---\n\n${userPrompt}`;
    const text = await new Promise<string>((resolve, reject) => {
      const child = run('claude', ['-p', '--output-format', 'text'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 120_000,
      });

      const chunks: Buffer[] = [];
      const errChunks: Buffer[] = [];
      child.stdout.on('data', (d: Buffer) => chunks.push(d));
      child.stderr.on('data', (d: Buffer) => errChunks.push(d));

      child.on('close', (code) => {
        const stdout = Buffer.concat(chunks).toString().trim();
        const stderr = Buffer.concat(errChunks).toString().trim();
        if (code !== 0) return reject(new Error(formatClaudeCliError(stderr || `exit ${code}`)));
        if (!stdout) return reject(new Error('claude CLI returned empty output'));
        resolve(stdout);
      });
      child.on('error', (err) => reject(new Error(`claude CLI spawn error: ${err.message}`)));

      child.stdin.write(prompt);
      child.stdin.end();
    });
    return text;
  };
}

function formatClaudeCliError(stderr: string): string {
  const lower = stderr.toLowerCase();
  if (
    lower.includes('quota')
    || lower.includes('rate limit')
    || lower.includes('usage limit')
    || lower.includes('credit')
    || lower.includes('billing')
  ) {
    return `claude CLI failed because the account appears to be over quota or rate-limited: ${stderr}`;
  }
  return `claude CLI failed: ${stderr}`;
}

// ── Codex CLI backend (OpenAI via codex exec) ─────────────────────────────

export interface CodexCliBackendOptions {
  model?: string;
  cwd?: string;
  timeoutMs?: number;
  spawn?: SpawnFn;
}

export function codexCliBackend(opts: CodexCliBackendOptions = {}): CompletionFn {
  const run = opts.spawn ?? spawn;
  const model = opts.model ?? 'gpt-5.5';
  const cwd = opts.cwd ?? process.cwd();
  const timeoutMs = opts.timeoutMs ?? 180_000;

  return async (systemPrompt, userPrompt) => {
    const prompt = [
      'You are running as a non-interactive text completion backend for a web application.',
      'Do not inspect, create, or edit repository files.',
      'Return only the final content requested by the application prompt on stdout.',
      'If the application asks for JSON, return parseable JSON only, with no prose or markdown fences.',
      '',
      systemPrompt,
      '',
      '---',
      '',
      userPrompt,
    ].join('\n');
    const text = await new Promise<string>((resolve, reject) => {
      const child = run('codex', ['exec', '--ephemeral', '--sandbox', 'read-only', '--cd', cwd, '-m', model, '-'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: timeoutMs,
      });

      const chunks: Buffer[] = [];
      const errChunks: Buffer[] = [];
      child.stdout.on('data', (d: Buffer) => chunks.push(d));
      child.stderr.on('data', (d: Buffer) => errChunks.push(d));

      child.on('close', (code) => {
        const stdout = Buffer.concat(chunks).toString().trim();
        const stderr = Buffer.concat(errChunks).toString().trim();
        if (code !== 0) return reject(new Error(`codex CLI failed (exit ${code}): ${stderr}`));
        if (!stdout) return reject(new Error('codex CLI returned empty output'));
        resolve(stdout);
      });
      child.on('error', (err) => reject(new Error(`codex CLI spawn error: ${err.message}`)));

      child.stdin.write(prompt);
      child.stdin.end();
    });
    return text;
  };
}

// ── Named factory ──────────────────────────────────────────────────────────

export function createBackendByName(name: BackendName): CompletionFn {
  switch (name) {
    case 'gemini': return geminiBackend();
    case 'gemini-3-flash': return geminiBackend({ model: 'gemini-3-flash-preview' });
    case 'gemini-2.5-pro': return geminiBackend({ model: 'gemini-2.5-pro' });
    case 'anthropic': return anthropicBackend();
    case 'claude-cli': return claudeCliBackend();
    case 'codex': return codexCliBackend();
  }
}

// ── Default factory (fallback chain) ───────────────────────────────────────

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
