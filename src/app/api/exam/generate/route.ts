import { NextResponse } from 'next/server';
import { ExamGenerator } from '@/exam/ExamGenerator';
import { renderExamMarkdown, renderAnswerKeyMarkdown } from '@/exam/renderExam';
import { SympyMathVerifier } from '@/providers/impl/SympyMathVerifier';
import { validateExamRequestCurriculumTopics } from '@/exam/curriculumContext';
import type { ExamRequest } from '@/exam/types';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ExamRequest;
    const curriculumErrors = validateExamRequestCurriculumTopics(body);
    if (curriculumErrors.length > 0) {
      return NextResponse.json({ error: curriculumErrors.join('\n') }, { status: 400 });
    }

    const generator = new ExamGenerator();
    const exam = await generator.generate(body);

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
