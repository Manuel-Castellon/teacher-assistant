import type { VerificationItem } from '../exam/types';
import type { LessonPlan } from '../types/lessonPlan';
import { renderStudentWorksheetMarkdown } from './renderLessonPlan';
import { SympyMathVerifier } from '../providers/impl/SympyMathVerifier';

export interface LessonWorksheetVerificationResult {
  questionRef: string;
  isValid: boolean;
  computedAnswer: string | null;
  message: string;
}

export interface LessonWorksheetVerificationSummary {
  provider: 'sympy';
  total: number;
  verified: number;
  failed: number;
  skipped: number;
  results: LessonWorksheetVerificationResult[];
  warning?: string;
}

export async function verifyLessonWorksheetMath(
  plan: LessonPlan,
  verifier = new SympyMathVerifier(),
): Promise<LessonWorksheetVerificationSummary | undefined> {
  if (!renderStudentWorksheetMarkdown(plan)) return undefined;

  const exercises = plan.phases.independentWork.exercises;
  const items = collectWorksheetVerificationItems(plan);
  const deterministicItems = items.filter(item => item.type !== 'proof');
  const proofReviewCount = items.length - deterministicItems.length;
  if (deterministicItems.length === 0) {
    const skipped = exercises.filter(exercise => exercise.source === 'generated').length;
    return {
      provider: 'sympy',
      total: 0,
      verified: 0,
      failed: 0,
      skipped,
      results: [],
      warning: 'דף העבודה נוצר, אך לא נמצאו פריטי אימות מתמטיים מובנים. יש לבדוק ידנית את התשובות לפני שימוש בכיתה.',
    };
  }

  const results = await verifier.verifyExamItems(deterministicItems);
  const failed = results.filter(result => !result.isValid).length;
  const skipped = exercises.filter(exercise => (
    exercise.source === 'generated'
    && !exercise.verificationItem
  )).length + proofReviewCount;

  return {
    provider: 'sympy',
    total: results.length,
    verified: results.length - failed,
    failed,
    skipped,
    results,
    ...(failed > 0
      ? { warning: 'חלק מתשובות דף העבודה לא עברו אימות מתמטי. יש לתקן או לבדוק ידנית לפני הדפסה.' }
      : skipped > 0
        ? { warning: 'חלק מתרגילי דף העבודה לא כוללים פריט אימות מובנה ולכן דורשים בדיקה ידנית.' }
        : {}),
  };
}

export function collectWorksheetVerificationItems(plan: LessonPlan): VerificationItem[] {
  return plan.phases.independentWork.exercises
    .map((exercise, index) => exercise.verificationItem
      ? {
          ...exercise.verificationItem,
          questionRef: exercise.verificationItem.questionRef || `worksheet.${index + 1}`,
        }
      : undefined)
    .filter((item): item is VerificationItem => Boolean(item));
}
