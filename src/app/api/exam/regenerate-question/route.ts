import { NextResponse } from 'next/server';
import { ExamGenerator } from '@/exam/ExamGenerator';
import { renderExamMarkdown, renderAnswerKeyMarkdown } from '@/exam/renderExam';
import { validateExamRequestCurriculumTopics } from '@/exam/curriculumContext';
import { SympyMathVerifier } from '@/providers/impl/SympyMathVerifier';
import type { RegenerateQuestionRequest } from '@/exam/types';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RegenerateQuestionRequest;
    const curriculumErrors = validateExamRequestCurriculumTopics(body.request);
    if (curriculumErrors.length > 0) {
      return NextResponse.json({ error: curriculumErrors.join('\n') }, { status: 400 });
    }

    const generator = new ExamGenerator();
    const exam = await generator.regenerateQuestion(body);

    const verifier = new SympyMathVerifier();
    const verification = await verifier.verifyExamItems(exam.verificationItems);

    return NextResponse.json({
      exam,
      examMarkdown: renderExamMarkdown(exam),
      answerKeyMarkdown: renderAnswerKeyMarkdown(exam),
      verification,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
