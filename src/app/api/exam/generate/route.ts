import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { pool } from '@/lib/db';
import { ExamGenerator } from '@/exam/ExamGenerator';
import { renderExamMarkdown, renderAnswerKeyMarkdown } from '@/exam/renderExam';
import { SympyMathVerifier } from '@/providers/impl/SympyMathVerifier';
import { validateExamRequestCurriculumTopics } from '@/exam/curriculumContext';
import {
  resolveClassContext,
  type ClassContextSource,
} from '@/curriculumProgress/classContextResolver';
import type { ExamRequest, GeneratedExam } from '@/exam/types';
import { buildRubricFromExam } from '@/examRubric/buildRubricFromExam';
import { generateAiRubric } from '@/examRubric/aiRubricGenerator';
import { generateRubricId, saveExamRubric } from '@/examRubric/saveRubric';
import { createDefaultBackend } from '@/exam/backends';

export type RubricMode = 'deterministic' | 'ai' | 'none';

interface GenerateExamBody extends ExamRequest {
  classId?: string;
  classContextSource?: ClassContextSource;
  rubricMode?: RubricMode;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as GenerateExamBody;
    const curriculumErrors = validateExamRequestCurriculumTopics(body);
    if (curriculumErrors.length > 0) {
      return NextResponse.json({ error: curriculumErrors.join('\n') }, { status: 400 });
    }

    const userId = await getAuthenticatedUserId();
    const classId = body.classId?.trim() || undefined;
    const resolved = await resolveClassContext({
      ...(body.classContextSource ? { source: body.classContextSource } : {}),
      ...(classId ? { classId } : {}),
      ...(userId ? { userId } : {}),
      db: pool,
    });

    const mergedTeacherNotes = mergeClassContextIntoNotes(body.teacherNotes, resolved.context);
    const examRequest: ExamRequest = {
      ...stripWrapperFields(body),
      ...(mergedTeacherNotes ? { teacherNotes: mergedTeacherNotes } : {}),
    };

    const generator = new ExamGenerator();
    const exam = await generator.generate(examRequest);

    const verifier = new SympyMathVerifier();
    const verification = await verifier.verifyExamItems(exam.verificationItems);

    const examMarkdown = renderExamMarkdown(exam);
    const answerKeyMarkdown = renderAnswerKeyMarkdown(exam);

    const rubricMode: RubricMode = body.rubricMode ?? 'deterministic';
    const rubricResult = await persistRubric({
      mode: rubricMode,
      exam,
      examRequest,
      examMarkdown,
      answerKeyMarkdown,
    });

    return NextResponse.json({
      exam,
      examMarkdown,
      answerKeyMarkdown,
      verification,
      rubricId: rubricResult.rubricId,
      rubricMode: rubricResult.appliedMode,
      rubricWarning: rubricResult.warning,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function getAuthenticatedUserId(): Promise<string | undefined> {
  const session = await auth();
  return session?.user?.id ?? session?.user?.email ?? undefined;
}

function stripWrapperFields(body: GenerateExamBody): ExamRequest {
  const { classId: _classId, classContextSource: _src, rubricMode: _rm, ...rest } = body;
  return rest;
}

interface PersistRubricInput {
  mode: RubricMode;
  exam: GeneratedExam;
  examRequest: ExamRequest;
  examMarkdown: string;
  answerKeyMarkdown: string;
}

interface PersistRubricResult {
  rubricId?: string;
  appliedMode: RubricMode;
  warning?: string;
}

async function persistRubric(input: PersistRubricInput): Promise<PersistRubricResult> {
  if (input.mode === 'none') return { appliedMode: 'none' };

  const id = generateRubricId();
  const base = buildRubricFromExam(input.exam, input.examRequest, { id });

  let rubric = base;
  let appliedMode: RubricMode = 'deterministic';
  let warning: string | undefined;

  if (input.mode === 'ai') {
    try {
      const complete = createDefaultBackend();
      rubric = await generateAiRubric({
        baseRubric: base,
        examMarkdown: input.examMarkdown,
        answerKeyMarkdown: input.answerKeyMarkdown,
        complete,
      });
      appliedMode = 'ai';
    } catch (err) {
      warning = `מחוון AI נכשל ונשמרה גרסה דטרמיניסטית: ${err instanceof Error ? err.message : 'unknown'}`;
    }
  }

  saveExamRubric(rubric);
  return { rubricId: id, appliedMode, ...(warning ? { warning } : {}) };
}

export function mergeClassContextIntoNotes(
  teacherNotes: string | undefined,
  classContext: string,
): string | undefined {
  const notes = teacherNotes?.trim();
  const context = classContext.trim();
  if (!context) return notes || undefined;

  const block = `הקשר כיתה (מעקב התקדמות):\n${context}`;
  if (!notes) return block;
  if (notes.includes(context)) return notes;
  return `${notes}\n\n${block}`;
}
