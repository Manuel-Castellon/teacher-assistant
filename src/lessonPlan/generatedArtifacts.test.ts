import complexIntroPlanJson from '../../data/lesson-plans/generated/grade12-5units-complex-intro-45min.json';
import grade7QuadrilateralAreasPlanJson from '../../data/lesson-plans/generated/grade7-geometry-quadrilateral-areas-45min.json';
import type { LessonPlan } from '../types/lessonPlan';
import { renderLessonPlanMarkdown } from './renderLessonPlan';
import { validateLessonPlanInvariants } from './validateInvariants';

describe('generated lesson plan artifacts', () => {
  it('keeps the grade יב complex-number intro plan structurally valid', () => {
    const plan = complexIntroPlanJson as unknown as LessonPlan;

    expect(validateLessonPlanInvariants(plan)).toEqual([]);
    expect(plan.curriculumTopicId).toBe('complex-numbers');
    expect(plan.phases.independentWork.durationMinutes).toBe(15);
    expect(renderLessonPlanMarkdown(plan)).toContain('מערך שיעור - מספרים מרוכבים');
  });

  it('keeps the grade ז quadrilateral-area practice plan structurally valid', () => {
    const plan = grade7QuadrilateralAreasPlanJson as unknown as LessonPlan;

    expect(validateLessonPlanInvariants(plan)).toEqual([]);
    expect(plan.curriculumTopicId).toBe('ms-grade7-t10');
    expect(plan.phases.independentWork.durationMinutes).toBe(15);
    expect(renderLessonPlanMarkdown(plan)).toContain('מערך שיעור - גאומטריה');
  });
});
