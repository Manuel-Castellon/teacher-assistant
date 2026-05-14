import { jest } from '@jest/globals';
import { execFileSync } from 'node:child_process';
import type { ExecFileException } from 'node:child_process';
import type Anthropic from '@anthropic-ai/sdk';
import { anthropicBackend, claudeCliBackend, createDefaultBackend, fallbackChain, geminiBackend } from './backends';
import type { ExecFn } from './backends';
import type { AnthropicLike } from '../providers/impl/ClaudeTextGenerator';

const claudeCliAvailable = (() => {
  try { execFileSync('which', ['claude'], { stdio: 'ignore' }); return true; }
  catch { return false; }
})();

function withEnv(env: Record<string, string | undefined>, fn: () => void) {
  const prev: Record<string, string | undefined> = {};
  for (const key of Object.keys(env)) {
    prev[key] = process.env[key];
    if (env[key] === undefined) delete process.env[key];
    else process.env[key] = env[key];
  }
  try {
    fn();
  } finally {
    for (const key of Object.keys(prev)) {
      if (prev[key] === undefined) delete process.env[key];
      else process.env[key] = prev[key];
    }
  }
}

describe('anthropicBackend', () => {
  it('throws when no API key or client is provided', () => {
    withEnv({ ANTHROPIC_API_KEY: undefined }, () => {
      expect(() => anthropicBackend()).toThrow(/ANTHROPIC_API_KEY/);
    });
  });

  it('uses an injected client and joins text blocks only', async () => {
    const calls: Anthropic.MessageCreateParamsNonStreaming[] = [];
    const fake: AnthropicLike = {
      messages: {
        create: async (params) => {
          calls.push(params);
          return {
            content: [
              { type: 'thinking', thinking: 'hidden', signature: 'sig' },
              { type: 'text', text: ' {"ok": true} ', citations: null },
            ],
          } as unknown as Anthropic.Message;
        },
      },
    };

    const complete = anthropicBackend({ client: fake, model: 'claude-test', maxTokens: 123 });
    await expect(complete('system', 'user')).resolves.toBe('{"ok": true}');
    expect(calls[0]!.model).toBe('claude-test');
    expect(calls[0]!.max_tokens).toBe(123);
    expect(calls[0]!.thinking).toEqual({ type: 'enabled', budget_tokens: 10_000 });
  });

  it('constructs from ANTHROPIC_API_KEY when present', () => {
    withEnv({ ANTHROPIC_API_KEY: 'sk-test' }, () => {
      expect(() => anthropicBackend()).not.toThrow();
    });
  });
});

describe('geminiBackend', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('throws when no API key is configured', () => {
    withEnv({ GEMINI_API_KEY: undefined }, () => {
      expect(() => geminiBackend()).toThrow(/GEMINI_API_KEY/);
    });
  });

  it('posts Gemini request and returns non-thought text', async () => {
    const fetchMock = jest.fn(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'thinking', thought: true }, { text: ' answer ' }] } }],
      }),
    })) as jest.Mock;
    global.fetch = fetchMock as unknown as typeof fetch;

    const complete = geminiBackend({ apiKey: 'gem-test', model: 'gemini-test', maxOutputTokens: 77 });
    await expect(complete('system prompt', 'user prompt')).resolves.toBe('answer');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-test:generateContent?key=gem-test');
    expect(JSON.parse((init as RequestInit).body as string)).toMatchObject({
      system_instruction: { parts: [{ text: 'system prompt' }] },
      contents: [{ parts: [{ text: 'user prompt' }] }],
      generationConfig: { maxOutputTokens: 77 },
    });
  });

  it('throws Gemini API errors', async () => {
    global.fetch = jest.fn(async () => ({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: async () => ({ error: { message: 'bad key' } }),
    })) as unknown as typeof fetch;

    const complete = geminiBackend({ apiKey: 'bad' });
    await expect(complete('system', 'user')).rejects.toThrow(/bad key/);
  });

  it('uses status text when Gemini error body is absent', async () => {
    global.fetch = jest.fn(async () => ({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
      json: async () => ({}),
    })) as unknown as typeof fetch;

    const complete = geminiBackend({ apiKey: 'bad' });
    await expect(complete('system', 'user')).rejects.toThrow(/Service Unavailable/);
  });

  it('throws on empty Gemini responses', async () => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({ candidates: [{ content: { parts: [{}, { thought: true, text: 'hidden' }] } }] }),
    })) as unknown as typeof fetch;

    const complete = geminiBackend({ apiKey: 'gem-test' });
    await expect(complete('system', 'user')).rejects.toThrow(/empty response/);
  });

  it('throws when Gemini omits candidates', async () => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({}),
    })) as unknown as typeof fetch;

    const complete = geminiBackend({ apiKey: 'gem-test' });
    await expect(complete('system', 'user')).rejects.toThrow(/empty response/);
  });
});

describe('createDefaultBackend', () => {
  it('prefers Gemini over Anthropic', () => {
    withEnv({ GEMINI_API_KEY: 'gem-test', ANTHROPIC_API_KEY: 'sk-test' }, () => {
      expect(() => createDefaultBackend()).not.toThrow();
    });
  });

  it('falls back to Anthropic', () => {
    withEnv({ GEMINI_API_KEY: undefined, ANTHROPIC_API_KEY: 'sk-test' }, () => {
      expect(() => createDefaultBackend()).not.toThrow();
    });
  });

  it('falls back to claude CLI when no API keys are set and CLI is available', () => {
    withEnv({ GEMINI_API_KEY: undefined, ANTHROPIC_API_KEY: undefined }, () => {
      if (claudeCliAvailable) {
        expect(() => createDefaultBackend()).not.toThrow();
      } else {
        expect(() => createDefaultBackend()).toThrow(/No AI backend/);
      }
    });
  });

  it('builds a fallback chain when multiple backends are configured', () => {
    withEnv({ GEMINI_API_KEY: 'gem-test', ANTHROPIC_API_KEY: 'sk-test' }, () => {
      const backend = createDefaultBackend();
      expect(typeof backend).toBe('function');
    });
  });
});

describe('fallbackChain', () => {
  it('returns the first successful result', async () => {
    const chain = fallbackChain([
      async () => { throw new Error('fail-1'); },
      async () => 'ok from second',
    ]);
    await expect(chain('sys', 'usr')).resolves.toBe('ok from second');
  });

  it('throws the last error when all backends fail', async () => {
    const chain = fallbackChain([
      async () => { throw new Error('fail-1'); },
      async () => { throw new Error('fail-2'); },
    ]);
    await expect(chain('sys', 'usr')).rejects.toThrow('fail-2');
  });

  it('wraps non-Error throws', async () => {
    const chain = fallbackChain([
      async () => { throw 'string-error'; },
      async () => { throw new Error('final'); },
    ]);
    await expect(chain('sys', 'usr')).rejects.toThrow('final');
  });
});

describe('claudeCliBackend', () => {
  it('returns a completion function', () => {
    expect(typeof claudeCliBackend()).toBe('function');
  });

  it('calls claude CLI and returns trimmed output', async () => {
    const fakeExec: ExecFn = ((_cmd, _args, _opts, cb) => {
      (cb as (err: ExecFileException | null, stdout: string, stderr: string) => void)(null, '  {"ok": true}  ', '');
    }) as ExecFn;

    const complete = claudeCliBackend(fakeExec);
    await expect(complete('system', 'user')).resolves.toBe('{"ok": true}');
  });

  it('rejects with stderr when claude CLI fails', async () => {
    const fakeExec: ExecFn = ((_cmd, _args, _opts, cb) => {
      const err = new Error('exit 1') as ExecFileException;
      (cb as (err: ExecFileException | null, stdout: string, stderr: string) => void)(err, '', 'process error');
    }) as ExecFn;

    const complete = claudeCliBackend(fakeExec);
    await expect(complete('system', 'user')).rejects.toThrow(/process error/);
  });

  it('rejects with err.message when stderr is empty', async () => {
    const fakeExec: ExecFn = ((_cmd, _args, _opts, cb) => {
      const err = new Error('SIGTERM') as ExecFileException;
      (cb as (err: ExecFileException | null, stdout: string, stderr: string) => void)(err, '', '');
    }) as ExecFn;

    const complete = claudeCliBackend(fakeExec);
    await expect(complete('system', 'user')).rejects.toThrow(/SIGTERM/);
  });

  it('rejects on empty output', async () => {
    const fakeExec: ExecFn = ((_cmd, _args, _opts, cb) => {
      (cb as (err: ExecFileException | null, stdout: string, stderr: string) => void)(null, '   ', '');
    }) as ExecFn;

    const complete = claudeCliBackend(fakeExec);
    await expect(complete('system', 'user')).rejects.toThrow(/empty output/);
  });
});
