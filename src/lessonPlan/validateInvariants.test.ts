import type { LessonPhase, LessonPlan } from '../types/lessonPlan';
import { validateLessonPlanInvariants } from './validateInvariants';

function phase(durationMinutes: number, overrides: Partial<LessonPhase> = {}): LessonPhase {
  return {
    name: overrides.name ?? 'phase',
    durationMinutes,
    exercises: overrides.exercises ?? [],
    ...(overrides.description !== undefined ? { description: overrides.description } : {}),
    ...(overrides.teacherNotes !== undefined ? { teacherNotes: overrides.teacherNotes } : {}),
  };
}

function basePlan(overrides: Partial<LessonPlan> = {}): LessonPlan {
  // 45-min routine: opening 10 + practice 20 + independent 15 = 45.
  return {
    id: 'lp-test',
    createdAt: '2026-05-06',
    updatedAt: '2026-05-06',
    topic: 'משפט פיתגורס',
    subTopic: 'שימושים',
    grade: 'חי',
    duration: 45,
    lessonType: 'שגרה',
    phases: {
      opening: phase(10, {
        name: 'משימת פתיחה',
        exercises: [
          {
            source: 'textbook',
            textbookRef: { page: 224, exerciseId: '8' },
            practiceMode: 'עצמאי',
            estimatedMinutes: 10,
          },
        ],
      }),
      practice: phase(20, {
        name: 'תרגול',
        exercises: [
          {
            source: 'textbook',
            textbookRef: { page: 224, exerciseId: '9' },
            practiceMode: 'לוח_משותף',
            estimatedMinutes: 20,
          },
        ],
      }),
      independentWork: phase(15, {
        name: 'עבודה עצמית',
        exercises: [
          {
            source: 'textbook',
            textbookRef: { page: 224, exerciseId: '10' },
            practiceMode: 'עצמאי',
            estimatedMinutes: 15,
          },
        ],
      }),
    },
    homework: null,
    generatedBy: 'teacher',
    ...overrides,
  };
}

describe('validateLessonPlanInvariants', () => {
  it('returns no violations for a well-formed routine plan', () => {
    expect(validateLessonPlanInvariants(basePlan())).toEqual([]);
  });

  it('flags non-independent opening exercises', () => {
    const plan = basePlan();
    plan.phases.opening.exercises[0]!.practiceMode = 'לוח_משותף';
    const violations = validateLessonPlanInvariants(plan);
    expect(violations.map((v) => v.code)).toContain('OPENING_NOT_INDEPENDENT');
  });

  it('flags <15 min independent work for routine 45-min lesson', () => {
    const plan = basePlan();
    plan.phases.opening.durationMinutes = 15; // bump opening to keep total = 45
    plan.phases.practice.durationMinutes = 20;
    plan.phases.independentWork.durationMinutes = 10;
    const violations = validateLessonPlanInvariants(plan);
    expect(violations.map((v) => v.code)).toContain('INDEPENDENT_WORK_TOO_SHORT');
  });

  it('flags <30 min independent work for 90-min Bagrut review', () => {
    const plan = basePlan({
      duration: 90,
      lessonType: 'חזרה_לבגרות',
      bagrutReview: {
        studentSurveyTopic: 'אנליטית',
        exerciseSources: ['יואל גבע'],
      },
    });
    plan.phases.opening.durationMinutes = 10;
    plan.phases.practice.durationMinutes = 60;
    plan.phases.independentWork.durationMinutes = 20;
    plan.phases.opening.exercises[0]!.source = 'bagrut_archive';
    plan.phases.practice.exercises[0]!.source = 'bagrut_archive';
    plan.phases.independentWork.exercises[0]!.source = 'bagrut_archive';
    const violations = validateLessonPlanInvariants(plan);
    expect(violations.map((v) => v.code)).toContain('INDEPENDENT_WORK_REVIEW_TOO_SHORT');
  });

  it('flags phase durations that do not sum to lesson duration', () => {
    const plan = basePlan();
    plan.phases.practice.durationMinutes = 25; // total now 50, lesson is 45
    const violations = validateLessonPlanInvariants(plan);
    expect(violations.map((v) => v.code)).toContain('PHASE_DURATIONS_MISMATCH');
  });

  it('counts the optional instruction phase in the duration sum', () => {
    const plan = basePlan({ duration: 90 });
    plan.phases.opening.durationMinutes = 15;
    plan.phases.instruction = phase(30, { name: 'הקנייה', exercises: [] });
    plan.phases.practice.durationMinutes = 30;
    plan.phases.independentWork.durationMinutes = 15;
    expect(validateLessonPlanInvariants(plan)).toEqual([]);
  });

  it('flags Bagrut review with no studentSurveyTopic / sources', () => {
    const plan = basePlan({
      duration: 90,
      lessonType: 'חזרה_לבגרות',
    });
    plan.phases.opening.durationMinutes = 10;
    plan.phases.practice.durationMinutes = 50;
    plan.phases.independentWork.durationMinutes = 30;
    plan.phases.opening.exercises[0]!.source = 'bagrut_archive';
    plan.phases.practice.exercises[0]!.source = 'bagrut_archive';
    plan.phases.independentWork.exercises[0]!.source = 'bagrut_archive';
    const violations = validateLessonPlanInvariants(plan);
    expect(violations.map((v) => v.code)).toContain('BAGRUT_REVIEW_MISSING_METADATA');
  });

  it('flags Bagrut review with no bagrut_archive exercises', () => {
    const plan = basePlan({
      duration: 90,
      lessonType: 'חזרה_לבגרות',
      bagrutReview: {
        studentSurveyTopic: 'אנליטית',
        exerciseSources: ['יואל גבע'],
      },
    });
    plan.phases.opening.durationMinutes = 10;
    plan.phases.practice.durationMinutes = 50;
    plan.phases.independentWork.durationMinutes = 30;
    // all exercises remain 'textbook' source — not bagrut_archive
    const violations = validateLessonPlanInvariants(plan);
    expect(violations.map((v) => v.code)).toContain('BAGRUT_REVIEW_NO_BAGRUT_SOURCES');
  });

  it('does not flag Bagrut sources when there are zero exercises', () => {
    const plan = basePlan({
      duration: 90,
      lessonType: 'חזרה_לבגרות',
      bagrutReview: {
        studentSurveyTopic: 'אנליטית',
        exerciseSources: ['יואל גבע'],
      },
    });
    plan.phases.opening = phase(10, { name: 'פתיחה', exercises: [] });
    plan.phases.practice = phase(50, { name: 'תרגול', exercises: [] });
    plan.phases.independentWork = phase(30, { name: 'עצמית', exercises: [] });
    expect(validateLessonPlanInvariants(plan)).toEqual([]);
  });

  it('accepts the real grade8 pythagoras example', () => {
    const plan: LessonPlan = {
      id: 'example-004',
      createdAt: '2026-04-26',
      updatedAt: '2026-04-26',
      topic: 'משפט פיתגורס',
      subTopic: 'שימושים במשפט פיתגורס',
      grade: 'חי',
      duration: 90,
      lessonType: 'שגרה',
      phases: {
        opening: phase(15, {
          name: 'משימת פתיחה',
          exercises: [
            {
              source: 'textbook',
              practiceMode: 'עצמאי',
              estimatedMinutes: 15,
            },
          ],
        }),
        instruction: phase(30, { name: 'הקנייה', exercises: [] }),
        practice: phase(30, {
          name: 'תרגול',
          exercises: [
            { source: 'textbook', practiceMode: 'לוח_משותף', estimatedMinutes: 10 },
            { source: 'textbook', practiceMode: 'לוח_משותף', estimatedMinutes: 10 },
            { source: 'textbook', practiceMode: 'לוח_משותף', estimatedMinutes: 10 },
          ],
        }),
        independentWork: phase(15, {
          name: 'עצמית',
          exercises: [
            { source: 'textbook', practiceMode: 'עצמאי', estimatedMinutes: 5 },
          ],
        }),
      },
      homework: [],
      generatedBy: 'teacher',
    };
    expect(validateLessonPlanInvariants(plan)).toEqual([]);
  });
});
