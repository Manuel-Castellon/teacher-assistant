import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { pool } from '@/lib/db';
import { renderLessonPlanMarkdown, renderStudentWorksheetMarkdown } from '@/lessonPlan/renderLessonPlan';
import { validateLessonPlanInvariants } from '@/lessonPlan/validateInvariants';
import { LessonPlanGenerator } from '@/lessonPlan/LessonPlanGenerator';
import {
  CUSTOM_LESSON_PLAN_TOPIC_ID,
  validateLessonPlanRequestCurriculumTopic,
} from '@/lessonPlan/curriculumContext';
import { createBackendByName, type BackendName } from '@/exam/backends';
import {
  renderWorksheetPreference,
  resolveIncludeWorksheet,
} from '@/lessonPlan/worksheetPolicy';
import {
  resolveClassContext,
  type ClassContextSource,
} from '@/curriculumProgress/classContextResolver';
import type { LessonPlanRequest, LessonDuration, LessonType } from '@/types/lessonPlan';
import type { GradeLevel } from '@/types/shared';

type AIBackend = 'auto' | BackendName;

interface GenerateLessonPlanBody {
  topic?: string;
  subTopic?: string;
  grade?: GradeLevel;
  duration?: LessonDuration;
  lessonType?: LessonType;
  curriculumTopicId?: string;
  teacherRequest?: string;
  teacherNotes?: string;
  previousLessonContext?: string;
  includeWorksheet?: boolean;
  backend?: AIBackend;
  classId?: string;
  classContextSource?: ClassContextSource;
}

const GRADES = new Set<GradeLevel>(['זי', 'חי', 'טי', 'יי', 'יאי', 'יבי']);
const DURATIONS = new Set<number>([45, 90]);
const LESSON_TYPES = new Set<LessonType>([
  'שגרה',
  'חזרה_לבגרות',
  'חזרה_למבחן',
  'הקנייה',
  'תרגול',
  'מבחן',
]);

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as GenerateLessonPlanBody;
    const errors = validateGenerateLessonPlanBody(body);
    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join('\n') }, { status: 400 });
    }

    const topic = body.topic?.trim() ?? '';
    const subTopic = body.subTopic?.trim() ?? '';
    const grade = body.grade as GradeLevel;
    const duration = body.duration as LessonDuration;
    const lessonType = body.lessonType as LessonType;
    const includeWorksheet = resolveIncludeWorksheet(lessonType, body.includeWorksheet);
    const curriculumTopicId =
      body.curriculumTopicId && body.curriculumTopicId !== CUSTOM_LESSON_PLAN_TOPIC_ID
        ? body.curriculumTopicId
        : undefined;
    const curriculumErrors = validateLessonPlanRequestCurriculumTopic(grade, curriculumTopicId);
    if (curriculumErrors.length > 0) {
      return NextResponse.json({ error: curriculumErrors.join('\n') }, { status: 400 });
    }

    const userId = await getAuthenticatedUserId();
    const classId = body.classId?.trim() || undefined;
    const resolved = await resolveClassContext({
      ...(body.classContextSource ? { source: body.classContextSource } : {}),
      ...(classId ? { classId } : {}),
      ...(body.previousLessonContext ? { previousLessonContext: body.previousLessonContext } : {}),
      ...(userId ? { userId } : {}),
      db: pool,
    });

    const requestBody: LessonPlanRequest = {
      topic,
      subTopic,
      grade,
      duration,
      lessonType,
      includeWorksheet,
      ...(curriculumTopicId ? { curriculumTopicId } : {}),
      ...(resolved.context ? { previousLessonContext: resolved.context } : {}),
      ...(resolved.classId ? { classId: resolved.classId } : {}),
      teacherNotes: renderTeacherNotes(body, includeWorksheet),
    };

    const backend = body.backend && body.backend !== 'auto'
      ? createBackendByName(body.backend)
      : undefined;
    const generator = new LessonPlanGenerator(backend);
    const plan = await generator.generate(requestBody);
    const invariantViolations = validateLessonPlanInvariants(plan);
    if (invariantViolations.length > 0) {
      return NextResponse.json(
        {
          error: invariantViolations.map(v => v.message).join('\n'),
          plan,
          invariantViolations,
        },
        { status: 422 },
      );
    }

    return NextResponse.json({
      plan,
      markdown: renderLessonPlanMarkdown(plan),
      worksheetMarkdown: renderStudentWorksheetMarkdown(plan),
      invariantViolations,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function validateGenerateLessonPlanBody(body: GenerateLessonPlanBody): string[] {
  const errors: string[] = [];

  if (!body.topic?.trim()) errors.push('חסר נושא שיעור.');
  if (!body.subTopic?.trim()) errors.push('חסר תת-נושא / מיקוד.');
  if (!body.teacherRequest?.trim()) errors.push('חסרה בקשת מורה חופשית.');
  if (!body.grade || !GRADES.has(body.grade)) errors.push('שכבת גיל לא תקינה.');
  if (!body.duration || !DURATIONS.has(body.duration)) errors.push('משך שיעור לא תקין.');
  if (!body.lessonType || !LESSON_TYPES.has(body.lessonType)) errors.push('סוג שיעור לא תקין.');

  return errors;
}

async function getAuthenticatedUserId(): Promise<string | undefined> {
  const session = await auth();
  return session?.user?.id ?? session?.user?.email ?? undefined;
}

export function renderTeacherNotes(body: GenerateLessonPlanBody, includeWorksheet: boolean): string {
  const lines = [
    'בקשת מורה חופשית:',
    body.teacherRequest?.trim() ?? '',
  ];

  if (body.teacherNotes?.trim()) {
    lines.push('', 'דגשים נוספים:', body.teacherNotes.trim());
  }

  lines.push(
    '',
    'העדפת דף עבודה:',
    renderWorksheetPreference(includeWorksheet),
    '',
    'דרישות MVP:',
    '- להחזיר מערך שיעור מוכן לשימוש בכיתה.',
    includeWorksheet
      ? '- ליצור דף עבודה לתלמידים כאשר זה מתאים לסוג השיעור: תרגילים מקוריים מדורגים, מוכנים להדפסה, עם פתרונות/מפתח קצר למורה.'
      : '- לא ליצור דף עבודה לתלמידים; להשתמש בתרגול לוח, לוחות מחיקים, ספר, או עבודה עצמית רגילה.',
    '- לשמור על התאמה לגיל ולתכנית הלימודים המקומית.',
  );

  return lines.join('\n');
}
