import type { LessonPlan, LessonPlanRequest } from '../types/lessonPlan';
import { gradeLabel } from '../types/shared';
import { createDefaultBackend, type CompletionFn } from '../exam/backends';
import { getLessonPlanCurriculumContext, renderLessonPlanCurriculumContext } from './curriculumContext';
import { LESSON_PLAN_PROMPT_VERSION, LESSON_PLAN_SYSTEM_PROMPT } from '../providers/impl/lessonPlanPrompt';
import { renderWorksheetPreference } from './worksheetPolicy';

export class LessonPlanGenerator {
  readonly promptVersion = LESSON_PLAN_PROMPT_VERSION;
  private readonly complete: CompletionFn;

  constructor(complete?: CompletionFn) {
    this.complete = complete ?? createDefaultBackend();
  }

  async generate(request: LessonPlanRequest): Promise<LessonPlan> {
    const text = await this.complete(LESSON_PLAN_SYSTEM_PROMPT, renderLessonPlanUserPrompt(request));
    const parsed = parseLessonPlanJson(text);
    const now = new Date().toISOString();

    return {
      ...parsed,
      modelVersion: parsed.modelVersion ?? 'default-backend',
      promptVersion: parsed.promptVersion ?? this.promptVersion,
      createdAt: parsed.createdAt ?? now,
      updatedAt: now,
    };
  }
}

export function renderLessonPlanUserPrompt(req: LessonPlanRequest): string {
  const curriculumContext = getLessonPlanCurriculumContext(req.grade, req.curriculumTopicId);
  const lines = [
    'צור מערך שיעור עבור הבקשה הבאה. החזר JSON בלבד התואם את הסכמה של LessonPlan.',
    '',
    `נושא: ${req.topic}`,
    `תת-נושא: ${req.subTopic}`,
    `כיתה: ${gradeLabel(req.grade)}`,
    `משך השיעור: ${req.duration} דקות`,
    `סוג השיעור: ${req.lessonType}`,
    `דף עבודה לתלמידים: ${renderWorksheetPreference(req.includeWorksheet ?? true)}`,
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

export function parseLessonPlanJson(raw: string): LessonPlan {
  let text = raw.trim();
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  }
  const obj = JSON.parse(text) as Record<string, unknown>;
  throwIfAiErrorEnvelope(obj);
  validateLessonPlanShape(obj);
  return obj as unknown as LessonPlan;
}

function throwIfAiErrorEnvelope(obj: Record<string, unknown>): void {
  if (!('error' in obj) && !('message' in obj)) return;
  const messageParts = [
    stringifyErrorField(obj['error']),
    stringifyErrorField(obj['message']),
  ].filter(Boolean);
  const message = messageParts.length > 0
    ? messageParts.join(' — ')
    : `Got top-level keys: [${Object.keys(obj).join(', ')}]`;
  throw new Error(`AI backend returned an error response instead of a lesson plan: ${message}`);
}

function stringifyErrorField(value: unknown): string | undefined {
  if (typeof value === 'string') return value.trim() || undefined;
  if (!value || typeof value !== 'object') return undefined;
  const record = value as Record<string, unknown>;
  if (typeof record['message'] === 'string' && record['message'].trim()) {
    return record['message'].trim();
  }
  return JSON.stringify(value);
}

function validateLessonPlanShape(obj: Record<string, unknown>): void {
  if (!obj.phases || typeof obj.phases !== 'object') {
    throw new Error(
      `AI returned JSON without a "phases" object. Got top-level keys: [${Object.keys(obj).join(', ')}]`,
    );
  }
  const phases = obj.phases as Record<string, unknown>;
  for (const required of ['opening', 'practice', 'independentWork'] as const) {
    if (!phases[required] || typeof phases[required] !== 'object') {
      throw new Error(
        `AI returned phases without "${required}". Got phase keys: [${Object.keys(phases).join(', ')}]`,
      );
    }
  }
}
