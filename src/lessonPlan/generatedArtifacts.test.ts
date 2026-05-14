import complexIntroPlanJson from '../../data/lesson-plans/generated/grade12-5units-complex-intro-45min.json';
import grade7QuadrilateralAreasPlanJson from '../../data/lesson-plans/generated/grade7-geometry-quadrilateral-areas-45min.json';
import { statSync } from 'node:fs';
import { join } from 'node:path';
import type { LessonPlan } from '../types/lessonPlan';
import { renderLessonPlanMarkdown } from './renderLessonPlan';
import { validateLessonPlanInvariants } from './validateInvariants';

const GENERATED_DIR = join(process.cwd(), 'data/lesson-plans/generated');

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

  it('keeps approved teacher-reviewed PDF examples available as quality references', () => {
    const approved = [
      'grade7-equations-common-denominator-90min-approved-gpt55.pdf',
      'grade11-complex-algebra-90min-approved-gpt55.pdf',
    ];

    for (const filename of approved) {
      const stat = statSync(join(GENERATED_DIR, filename));
      expect(stat.size).toBeGreaterThan(100_000);
    }
  });
});
