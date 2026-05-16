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
import type { ExamRequest } from '@/exam/types';

interface GenerateExamBody extends ExamRequest {
  classId?: string;
  classContextSource?: ClassContextSource;
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

    return NextResponse.json({
      exam,
      examMarkdown,
      answerKeyMarkdown,
      verification,
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
  const { classId: _classId, classContextSource: _src, ...rest } = body;
  return rest;
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
