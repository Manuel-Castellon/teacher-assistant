import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { listQuestionBankItems } from '@/questionBank/serverStore';
import type {
  QuestionBankDifficulty,
  QuestionLicense,
  QuestionType,
} from '@/questionBank/types';
import type { GradeLevel } from '@/types/shared';

const GRADES: readonly GradeLevel[] = ['זי','חי','טי','יי','יאי','יבי'];
const QTYPES: readonly QuestionType[] = ['חישובי','בעיה_מילולית','הוכחה','קריאה_וניתוח','מעורב'];
const DIFFS: readonly QuestionBankDifficulty[] = ['בסיסי','בינוני','מתקדם','אתגר'];
const LICENSES: readonly QuestionLicense[] = [
  'ministry-public','teacher-original','open-license','public-domain','copyrighted-personal-use','student-submitted','unknown',
];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const grade = searchParams.get('grade') as GradeLevel | null;
    const questionType = searchParams.get('questionType') as QuestionType | null;
    const difficulty = searchParams.get('difficulty') as QuestionBankDifficulty | null;
    const license = searchParams.get('license') as QuestionLicense | null;
    const topic = searchParams.get('topic');

    if (grade && !GRADES.includes(grade)) {
      return NextResponse.json({ error: `invalid grade=${grade}` }, { status: 400 });
    }
    if (questionType && !QTYPES.includes(questionType)) {
      return NextResponse.json({ error: `invalid questionType=${questionType}` }, { status: 400 });
    }
    if (difficulty && !DIFFS.includes(difficulty)) {
      return NextResponse.json({ error: `invalid difficulty=${difficulty}` }, { status: 400 });
    }
    if (license && !LICENSES.includes(license)) {
      return NextResponse.json({ error: `invalid license=${license}` }, { status: 400 });
    }

    const items = await listQuestionBankItems(pool, {
      ...(grade ? { grade } : {}),
      ...(questionType ? { questionType } : {}),
      ...(difficulty ? { difficulty } : {}),
      ...(license ? { license } : {}),
      ...(topic ? { curriculumTopicId: topic } : {}),
      limit: 200,
    });
    return NextResponse.json({ items });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'failed to list question bank';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
