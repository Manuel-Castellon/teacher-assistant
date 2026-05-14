import { EXAM_PROMPT_VERSION, EXAM_SYSTEM_PROMPT, renderExamUserPrompt, renderRegenerateQuestionUserPrompt } from './examPrompt';
import type { ExamRequest, GeneratedExam, RegenerateQuestionRequest } from './types';
import type { CompletionFn } from './backends';
import { createDefaultBackend } from './backends';
import { getCurriculumExamScope } from './curriculumContext';

export class ExamGenerator {
  readonly promptVersion = EXAM_PROMPT_VERSION;
  private readonly complete: CompletionFn;

  constructor(complete?: CompletionFn) {
    this.complete = complete ?? createDefaultBackend();
  }

  async generate(request: ExamRequest): Promise<GeneratedExam> {
    const userPrompt = renderExamUserPrompt({
      ...request,
      curriculumScope: getCurriculumExamScope(request.grade),
    });
    const text = await this.complete(EXAM_SYSTEM_PROMPT, userPrompt);
    return parseExamJson(text);
  }

  async regenerateQuestion(request: RegenerateQuestionRequest): Promise<GeneratedExam> {
    const curriculumScope = getCurriculumExamScope(request.request.grade);
    const userPrompt = renderRegenerateQuestionUserPrompt({
      originalRequest: {
        ...request.request,
        curriculumScope,
      },
      existingExam: request.exam,
      questionNumber: request.questionNumber,
      ...(request.teacherNotes ? { teacherNotes: request.teacherNotes } : {}),
    });
    const text = await this.complete(EXAM_SYSTEM_PROMPT, userPrompt);
    return parseExamJson(text);
  }
}

function parseExamJson(raw: string): GeneratedExam {
  let text = raw.trim();
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  }
  return JSON.parse(text) as GeneratedExam;
}
