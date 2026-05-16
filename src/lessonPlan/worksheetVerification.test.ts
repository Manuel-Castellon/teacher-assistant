import type { LessonPlan } from '../types/lessonPlan';
import {
  collectWorksheetVerificationItems,
  verifyLessonWorksheetMath,
} from './worksheetVerification';

function lessonPlanWithIndependentExercises(
  exercises: LessonPlan['phases']['independentWork']['exercises'],
): LessonPlan {
  return {
    id: 'worksheet-verification-test',
    createdAt: '2026-05-16T00:00:00.000Z',
    updatedAt: '2026-05-16T00:00:00.000Z',
    topic: 'משוואות',
    subTopic: 'משוואות ליניאריות',
    grade: 'זי',
    duration: 45,
    lessonType: 'תרגול',
    phases: {
      opening: {
        name: 'פתיחה',
        durationMinutes: 5,
        exercises: [],
      },
      practice: {
        name: 'תרגול',
        durationMinutes: 25,
        exercises: [],
      },
      independentWork: {
        name: 'עבודה עצמית - דף עבודה לתלמידים',
        durationMinutes: 15,
        description: 'דף עבודה לתלמידים',
        exercises,
      },
    },
    homework: null,
    generatedBy: 'teacher',
  };
}

describe('worksheetVerification', () => {
  it('collects structured verification items from worksheet exercises', () => {
    const plan = lessonPlanWithIndependentExercises([
      {
        source: 'generated',
        generatedContent: 'דף עבודה לתלמידים\nפתרו $2x+3=11$',
        practiceMode: 'עצמאי',
        estimatedMinutes: 5,
        verificationItem: {
          questionRef: '',
          type: 'equation',
          sympyExpression: 'Eq(2*x + 3, 11)',
          expectedAnswer: '{4}',
        },
      },
    ]);

    expect(collectWorksheetVerificationItems(plan)).toEqual([
      {
        questionRef: 'worksheet.1',
        type: 'equation',
        sympyExpression: 'Eq(2*x + 3, 11)',
        expectedAnswer: '{4}',
      },
    ]);
  });

  it('verifies deterministic worksheet items with SymPy', async () => {
    const plan = lessonPlanWithIndependentExercises([
      {
        source: 'generated',
        generatedContent: 'דף עבודה לתלמידים\nפתרו $2x+3=11$',
        practiceMode: 'עצמאי',
        estimatedMinutes: 5,
        verificationItem: {
          questionRef: 'worksheet.1',
          type: 'equation',
          sympyExpression: 'Eq(2*x + 3, 11)',
          expectedAnswer: '{4}',
        },
      },
    ]);

    const summary = await verifyLessonWorksheetMath(plan);

    expect(summary).toMatchObject({
      provider: 'sympy',
      total: 1,
      verified: 1,
      failed: 0,
      skipped: 0,
    });
    expect(summary?.warning).toBeUndefined();
  });

  it('warns when worksheet math has no structured verification items', async () => {
    const plan = lessonPlanWithIndependentExercises([
      {
        source: 'generated',
        generatedContent: 'דף עבודה לתלמידים\nפתרו $x+1=3$',
        practiceMode: 'עצמאי',
        estimatedMinutes: 5,
        notes: 'פתרון: $x=2$',
      },
    ]);

    const summary = await verifyLessonWorksheetMath(plan);

    expect(summary).toMatchObject({
      total: 0,
      verified: 0,
      failed: 0,
      skipped: 1,
    });
    expect(summary?.warning).toContain('לא נמצאו פריטי אימות');
  });

  it('marks proof-only worksheet items as requiring manual review', async () => {
    const plan = lessonPlanWithIndependentExercises([
      {
        source: 'generated',
        generatedContent: 'דף עבודה לתלמידים\nהוכיחו טענה גאומטרית.',
        practiceMode: 'עצמאי',
        estimatedMinutes: 5,
        verificationItem: {
          questionRef: 'worksheet.1',
          type: 'proof',
        },
      },
    ]);

    const summary = await verifyLessonWorksheetMath(plan);

    expect(summary).toMatchObject({
      total: 0,
      skipped: 1,
    });
    expect(summary?.warning).toContain('לא נמצאו פריטי אימות');
  });
});
