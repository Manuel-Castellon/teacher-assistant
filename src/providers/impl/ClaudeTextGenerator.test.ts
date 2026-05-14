import type Anthropic from '@anthropic-ai/sdk';

import type { LessonPlan } from '../../types/lessonPlan';
import { LESSON_PLAN_PROMPT_VERSION } from './lessonPlanPrompt';
import { ClaudeTextGenerator, type AnthropicLike } from './ClaudeTextGenerator';

function fakeMessageWithText(text: string, model = 'claude-opus-4-7'): Anthropic.Message {
  return {
    id: 'msg_test',
    type: 'message',
    role: 'assistant',
    model,
    content: [{ type: 'text', text, citations: null }],
    stop_reason: 'end_turn',
    stop_sequence: null,
    usage: {
      input_tokens: 100,
      output_tokens: 50,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
      service_tier: null,
      server_tool_use: null,
    },
  } as unknown as Anthropic.Message;
}

const SAMPLE_PLAN: Omit<LessonPlan, 'generatedBy' | 'modelVersion' | 'promptVersion' | 'updatedAt'> = {
  id: 'lp-fake-1',
  createdAt: '2026-05-06T09:00:00.000Z',
  topic: 'משפט פיתגורס',
  subTopic: 'שימושים',
  grade: 'חי',
  duration: 45,
  lessonType: 'שגרה',
  phases: {
    opening: {
      name: 'משימת פתיחה',
      durationMinutes: 10,
      exercises: [
        {
          source: 'textbook',
          textbookRef: { page: 224, exerciseId: '8' },
          practiceMode: 'עצמאי',
          estimatedMinutes: 10,
        },
      ],
    },
    practice: {
      name: 'תרגול',
      durationMinutes: 20,
      exercises: [],
    },
    independentWork: {
      name: 'עבודה עצמית',
      durationMinutes: 15,
      exercises: [],
    },
  },
  homework: null,
};

describe('ClaudeTextGenerator', () => {
  it('throws when no API key and no injected client', () => {
    const prev = process.env['ANTHROPIC_API_KEY'];
    delete process.env['ANTHROPIC_API_KEY'];
    expect(() => new ClaudeTextGenerator()).toThrow(/ANTHROPIC_API_KEY/);
    if (prev !== undefined) process.env['ANTHROPIC_API_KEY'] = prev;
  });

  it('uses injected fake client and tags response with promptVersion + claude-api', async () => {
    const calls: Anthropic.MessageCreateParamsNonStreaming[] = [];
    const fake: AnthropicLike = {
      messages: {
        create: async (params) => {
          calls.push(params);
          return fakeMessageWithText(JSON.stringify(SAMPLE_PLAN));
        },
      },
    };

    const gen = new ClaudeTextGenerator({ client: fake });
    const result = await gen.generateLessonPlan({
      topic: 'משפט פיתגורס',
      subTopic: 'שימושים',
      grade: 'חי',
      duration: 45,
      lessonType: 'שגרה',
      teacherNotes: 'התחילו בעצמאית קצרה.',
    });

    expect(result.generatedBy).toBe('claude-api');
    expect(result.promptVersion).toBe(LESSON_PLAN_PROMPT_VERSION);
    expect(result.topic).toBe('משפט פיתגורס');
    expect(result.modelVersion).toBe('claude-opus-4-7');

    expect(calls).toHaveLength(1);
    const call = calls[0]!;
    expect(call.model).toBe('claude-opus-4-7');
    expect(call.thinking).toEqual({ type: 'adaptive' });

    // System block carries cache_control for prompt caching.
    expect(Array.isArray(call.system)).toBe(true);
    const systemBlocks = call.system as Anthropic.TextBlockParam[];
    expect(systemBlocks[0]?.cache_control).toEqual({ type: 'ephemeral' });

    // Teacher notes flowed into the user prompt.
    const userMessage = call.messages[0]!;
    const userText = typeof userMessage.content === 'string'
      ? userMessage.content
      : (userMessage.content as Anthropic.TextBlockParam[]).map((b) => b.text).join('');
    expect(userText).toContain('התחילו בעצמאית קצרה.');
    expect(userText).toContain('משך השיעור: 45 דקות');
  });

  it('strips ```json fences from the model response', async () => {
    const fenced = '```json\n' + JSON.stringify(SAMPLE_PLAN) + '\n```';
    const fake: AnthropicLike = {
      messages: {
        create: async () => fakeMessageWithText(fenced),
      },
    };

    const gen = new ClaudeTextGenerator({ client: fake });
    const result = await gen.generateLessonPlan({
      topic: 'משפט פיתגורס',
      subTopic: 'שימושים',
      grade: 'חי',
      duration: 45,
      lessonType: 'שגרה',
    });
    expect(result.id).toBe('lp-fake-1');
  });

  it('strips bare ``` fences (no language tag) too', async () => {
    const fenced = '```\n' + JSON.stringify(SAMPLE_PLAN) + '\n```';
    const fake: AnthropicLike = {
      messages: {
        create: async () => fakeMessageWithText(fenced),
      },
    };
    const gen = new ClaudeTextGenerator({ client: fake });
    const result = await gen.generateLessonPlan({
      topic: 'משפט פיתגורס',
      subTopic: 'שימושים',
      grade: 'חי',
      duration: 45,
      lessonType: 'שגרה',
    });
    expect(result.id).toBe('lp-fake-1');
  });

  it('passes optional fields (textbook, curriculumTopicId, previousLessonContext) into the prompt', async () => {
    let captured: string | undefined;
    const fake: AnthropicLike = {
      messages: {
        create: async (params) => {
          const msg = params.messages[0]!;
          captured = typeof msg.content === 'string'
            ? msg.content
            : (msg.content as Anthropic.TextBlockParam[]).map((b) => b.text).join('');
          return fakeMessageWithText(JSON.stringify(SAMPLE_PLAN));
        },
      },
    };
    const gen = new ClaudeTextGenerator({ client: fake });
    await gen.generateLessonPlan({
      topic: 'משפט פיתגורס',
      subTopic: 'שימושים',
      grade: 'חי',
      duration: 45,
      lessonType: 'שגרה',
      textbook: { name: 'מתמטיקה לחטיבת הביניים', isStudentStandardBook: true },
      curriculumTopicId: 'ms-grade8-pythagoras',
      previousLessonContext: 'שיעור קודם הסתיים בתרגיל 7.',
    });
    expect(captured).toContain('ספר לימוד');
    expect(captured).toContain('ms-grade8-pythagoras');
    expect(captured).toContain('הקשר מהשיעור הקודם');
    expect(captured).toContain('## הקשר מתכנית הלימודים');
  });

  it('honors a custom model option', async () => {
    let usedModel: string | undefined;
    const fake: AnthropicLike = {
      messages: {
        create: async (params) => {
          usedModel = params.model;
          return fakeMessageWithText(JSON.stringify(SAMPLE_PLAN), 'claude-sonnet-4-6');
        },
      },
    };
    const gen = new ClaudeTextGenerator({ client: fake, model: 'claude-sonnet-4-6' });
    const result = await gen.generateLessonPlan({
      topic: 'משפט פיתגורס',
      subTopic: 'שימושים',
      grade: 'חי',
      duration: 45,
      lessonType: 'שגרה',
    });
    expect(usedModel).toBe('claude-sonnet-4-6');
    expect(result.modelVersion).toBe('claude-sonnet-4-6');
  });

  it('rejects generateExercises and generateExam (MVP 2 scope)', async () => {
    const fake: AnthropicLike = {
      messages: { create: async () => fakeMessageWithText('{}') },
    };
    const gen = new ClaudeTextGenerator({ client: fake });
    await expect(
      gen.generateExercises({
        topic: 'אנליטית',
        subTopic: 'מעגלים',
        grade: 'יבי',
        difficulty: 'בגרות',
        count: 3,
      }),
    ).rejects.toThrow(/MVP 2/);
    await expect(
      gen.generateExam({
        topic: 'אנליטית',
        subTopics: ['מעגלים'],
        grade: 'יבי',
        durationMinutes: 90,
        totalPoints: 100,
      }),
    ).rejects.toThrow(/MVP 2/);
  });

  it('ANTHROPIC_API_KEY env var path constructs without throwing', () => {
    const prev = process.env['ANTHROPIC_API_KEY'];
    process.env['ANTHROPIC_API_KEY'] = 'sk-test-fake';
    try {
      const gen = new ClaudeTextGenerator();
      expect(gen.providerName).toBe('claude-api');
      expect(gen.model).toBe('claude-opus-4-7');
    } finally {
      if (prev === undefined) delete process.env['ANTHROPIC_API_KEY'];
      else process.env['ANTHROPIC_API_KEY'] = prev;
    }
  });

  it('falls back to configured model and now() when response.model and createdAt are absent', async () => {
    const planNoCreatedAt = { ...SAMPLE_PLAN } as Partial<LessonPlan>;
    delete planNoCreatedAt.createdAt;

    const fake: AnthropicLike = {
      messages: {
        create: async () => {
          const m = fakeMessageWithText(JSON.stringify(planNoCreatedAt));
          // Strip the model field to exercise the ?? fallback.
          return { ...m, model: undefined } as unknown as Anthropic.Message;
        },
      },
    };
    const gen = new ClaudeTextGenerator({ client: fake, model: 'claude-haiku-4-5' });
    const result = await gen.generateLessonPlan({
      topic: 'משפט פיתגורס',
      subTopic: 'שימושים',
      grade: 'חי',
      duration: 45,
      lessonType: 'שגרה',
    });
    expect(result.modelVersion).toBe('claude-haiku-4-5');
    expect(result.createdAt).toEqual(result.updatedAt);
  });

  it('honors apiKey option (real SDK construction path)', () => {
    const gen = new ClaudeTextGenerator({ apiKey: 'sk-test-fake', maxTokens: 8000 });
    expect(gen.maxTokens).toBe(8000);
  });
});
