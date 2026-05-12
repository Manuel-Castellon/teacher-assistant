import type { LessonPlan, LessonPhase, PracticeMode } from '../types/lessonPlan';

export type InvariantCode =
  | 'OPENING_NOT_INDEPENDENT'
  | 'INDEPENDENT_WORK_TOO_SHORT'
  | 'INDEPENDENT_WORK_REVIEW_TOO_SHORT'
  | 'PHASE_DURATIONS_MISMATCH'
  | 'BAGRUT_REVIEW_MISSING_METADATA'
  | 'BAGRUT_REVIEW_NO_BAGRUT_SOURCES';

export interface InvariantViolation {
  code: InvariantCode;
  message: string;
}

const REVIEW_TYPES = new Set<LessonPlan['lessonType']>([
  'חזרה_לבגרות',
  'חזרה_למבחן',
]);

const INDEPENDENT_MODE: PracticeMode = 'עצמאי';

function sumPhaseMinutes(phase: LessonPhase | undefined): number {
  return phase?.durationMinutes ?? 0;
}

/**
 * Validates the documented invariants for a LessonPlan.
 * See AGENTS.md "Lesson Plan Generator — Style Contract (MVP 1)".
 *
 * Returns the empty array when all invariants hold.
 */
export function validateLessonPlanInvariants(plan: LessonPlan): InvariantViolation[] {
  const violations: InvariantViolation[] = [];

  // I1 — opening runs during admin time, students work independently.
  const openingNonIndependent = plan.phases.opening.exercises.filter(
    (e) => e.practiceMode !== INDEPENDENT_MODE,
  );
  if (openingNonIndependent.length > 0) {
    violations.push({
      code: 'OPENING_NOT_INDEPENDENT',
      message: `Opening contains ${openingNonIndependent.length} non-independent exercise(s); opening must be 'עצמאי' (students work alone while teacher handles attendance).`,
    });
  }

  // I2 — independentWork is last and at least 15 min (30 for 90-min review lessons).
  const independentMinutes = plan.phases.independentWork.durationMinutes;
  const isReview = REVIEW_TYPES.has(plan.lessonType);
  const minIndependent = plan.duration === 90 && isReview ? 30 : 15;

  if (independentMinutes < minIndependent) {
    violations.push({
      code:
        plan.duration === 90 && isReview
          ? 'INDEPENDENT_WORK_REVIEW_TOO_SHORT'
          : 'INDEPENDENT_WORK_TOO_SHORT',
      message: `independentWork is ${independentMinutes} min; min required is ${minIndependent} for duration=${plan.duration} lessonType=${plan.lessonType}.`,
    });
  }

  // I3 — phase durations must equal the lesson duration.
  const total =
    sumPhaseMinutes(plan.phases.opening) +
    sumPhaseMinutes(plan.phases.instruction) +
    sumPhaseMinutes(plan.phases.practice) +
    sumPhaseMinutes(plan.phases.independentWork);
  if (total !== plan.duration) {
    violations.push({
      code: 'PHASE_DURATIONS_MISMATCH',
      message: `Phase durations sum to ${total} min but lesson duration is ${plan.duration} min.`,
    });
  }

  // I4 — Bagrut review lessons must declare studentSurveyTopic + exercise sources,
  //       and exercises must come from the bagrut_archive.
  if (plan.lessonType === 'חזרה_לבגרות') {
    if (!plan.bagrutReview || !plan.bagrutReview.studentSurveyTopic || plan.bagrutReview.exerciseSources.length === 0) {
      violations.push({
        code: 'BAGRUT_REVIEW_MISSING_METADATA',
        message: `lessonType='חזרה_לבגרות' requires bagrutReview.studentSurveyTopic and at least one exerciseSource.`,
      });
    }

    const allExercises = [
      ...plan.phases.opening.exercises,
      ...(plan.phases.instruction?.exercises ?? []),
      ...plan.phases.practice.exercises,
      ...plan.phases.independentWork.exercises,
    ];
    const nonBagrut = allExercises.filter((e) => e.source !== 'bagrut_archive');
    if (allExercises.length > 0 && nonBagrut.length === allExercises.length) {
      violations.push({
        code: 'BAGRUT_REVIEW_NO_BAGRUT_SOURCES',
        message: `lessonType='חזרה_לבגרות' has no exercises sourced from bagrut_archive.`,
      });
    }
  }

  return violations;
}
