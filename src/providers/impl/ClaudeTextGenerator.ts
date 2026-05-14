import Anthropic from '@anthropic-ai/sdk';

import type {
  ITextGenerator,
  ExerciseRequest,
  GeneratedExercise,
  ExamRequest,
  GeneratedExam,
} from '../interfaces/ITextGenerator';
import type { LessonPlan, LessonPlanRequest } from '../../types/lessonPlan';
import { getLessonPlanCurriculumContext, renderLessonPlanCurriculumContext } from '../../lessonPlan/curriculumContext';
import { LESSON_PLAN_PROMPT_VERSION, LESSON_PLAN_SYSTEM_PROMPT } from './lessonPlanPrompt';

/**
 * Minimal slice of the Anthropic client used by this provider. Defined so
 * tests can inject a fake without booting the real SDK or holding an API key.
 */
export interface AnthropicLike {
  messages: {
    create: (params: Anthropic.MessageCreateParamsNonStreaming) => Promise<Anthropic.Message>;
  };
}

export interface ClaudeTextGeneratorOptions {
  apiKey?: string;
  model?: string;
  maxTokens?: number;
  client?: AnthropicLike;
}

const DEFAULT_MODEL = 'claude-opus-4-7';
const DEFAULT_MAX_TOKENS = 16000;

/**
 * Default ITextGenerator backed by the Claude API.
 *
 * Lesson-plan exercise content reaches the teacher only after the deterministic
 * invariant validator (`src/lessonPlan/validateInvariants.ts`) passes — see
 * AGENTS.md Hard Stop #4. Math exercises additionally require Verifier sign-off
 * (MVP 2). This class only generates drafts.
 */
export class ClaudeTextGenerator implements ITextGenerator {
  readonly providerName = 'claude-api';
  readonly model: string;
  readonly maxTokens: number;
  private readonly client: AnthropicLike;

  constructor(opts: ClaudeTextGeneratorOptions = {}) {
    this.model = opts.model ?? DEFAULT_MODEL;
    this.maxTokens = opts.maxTokens ?? DEFAULT_MAX_TOKENS;
    if (opts.client) {
      this.client = opts.client;
    } else {
      const apiKey = opts.apiKey ?? process.env['ANTHROPIC_API_KEY'];
      if (!apiKey) {
        throw new Error(
          'ClaudeTextGenerator requires ANTHROPIC_API_KEY (or opts.apiKey, or opts.client for tests).',
        );
      }
      this.client = new Anthropic({ apiKey });
    }
  }

  async generateLessonPlan(request: LessonPlanRequest): Promise<LessonPlan> {
    const userPrompt = renderLessonPlanUserPrompt(request);

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: this.maxTokens,
      thinking: { type: 'adaptive' },
      system: [
        {
          type: 'text',
          text: LESSON_PLAN_SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: userPrompt }],
    });

    const text = extractText(response);
    const parsed = parseLessonPlanJson(text);

    const now = new Date().toISOString();
    return {
      ...parsed,
      generatedBy: 'claude-api',
      modelVersion: response.model ?? this.model,
      promptVersion: LESSON_PLAN_PROMPT_VERSION,
      createdAt: parsed.createdAt ?? now,
      updatedAt: now,
    };
  }

  generateExercises(_request: ExerciseRequest): Promise<GeneratedExercise[]> {
    return Promise.reject(
      new Error('generateExercises lands in MVP 2 (after math verifier decision).'),
    );
  }

  generateExam(_request: ExamRequest): Promise<GeneratedExam> {
    return Promise.reject(
      new Error('generateExam lands in MVP 2 (after math verifier decision).'),
    );
  }
}

function renderLessonPlanUserPrompt(req: LessonPlanRequest): string {
  const curriculumContext = getLessonPlanCurriculumContext(req.grade, req.curriculumTopicId);
  const lines = [
    'צור מערך שיעור עבור הבקשה הבאה. החזר JSON בלבד התואם את הסכמה של LessonPlan.',
    '',
    `נושא: ${req.topic}`,
    `תת-נושא: ${req.subTopic}`,
    `כיתה: ${req.grade}`,
    `משך השיעור: ${req.duration} דקות`,
    `סוג השיעור: ${req.lessonType}`,
  ];
  if (req.textbook) {
    lines.push(`ספר לימוד: ${JSON.stringify(req.textbook)}`);
  }
  if (req.curriculumTopicId) {
    lines.push(`מזהה נושא בתכנית: ${req.curriculumTopicId}`);
  }
  lines.push('', renderLessonPlanCurriculumContext(curriculumContext));
  if (req.teacherNotes) {
    lines.push('', 'הערות מהמורה (לכבד בקפדנות):', req.teacherNotes);
  }
  if (req.previousLessonContext) {
    lines.push('', 'הקשר מהשיעור הקודם:', req.previousLessonContext);
  }
  return lines.join('\n');
}

function extractText(message: Anthropic.Message): string {
  const out: string[] = [];
  for (const block of message.content) {
    if (block.type === 'text') out.push(block.text);
  }
  return out.join('').trim();
}

/**
 * Tolerates the model wrapping the JSON in ```json fences — strips them if present.
 */
function parseLessonPlanJson(raw: string): LessonPlan {
  let text = raw.trim();
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  }
  return JSON.parse(text) as LessonPlan;
}
