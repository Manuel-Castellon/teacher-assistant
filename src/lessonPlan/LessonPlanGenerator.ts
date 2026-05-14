import type { LessonPlan, LessonPlanRequest } from '../types/lessonPlan';
import { createDefaultBackend, type CompletionFn } from '../exam/backends';
import { getLessonPlanCurriculumContext, renderLessonPlanCurriculumContext } from './curriculumContext';
import { LESSON_PLAN_PROMPT_VERSION, LESSON_PLAN_SYSTEM_PROMPT } from '../providers/impl/lessonPlanPrompt';

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

export function parseLessonPlanJson(raw: string): LessonPlan {
  let text = raw.trim();
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  }
  return JSON.parse(text) as LessonPlan;
}
