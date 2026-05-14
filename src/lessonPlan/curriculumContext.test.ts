import {
  CUSTOM_LESSON_PLAN_TOPIC_ID,
  getLessonPlanCurriculumContext,
  getLessonPlanCurriculumTopicOptions,
  renderLessonPlanCurriculumContext,
  validateLessonPlanRequestCurriculumTopic,
} from './curriculumContext';

describe('lesson plan curriculum context', () => {
  it('returns selected topic with objectives for grade יב complex numbers', () => {
    const context = getLessonPlanCurriculumContext('יבי', 'complex-numbers');

    expect(context.unitId).toBe('hs-5units-year12-tashpav');
    expect(context.selectedTopic?.name).toBe('מספרים מרוכבים');
    expect(context.selectedTopic?.learningObjectives).toContain(
      'הגדרת המספר המרוכב: המספר i מקיים i²=-1. מספר שצורתו a+ib כאשר a ו-b ממשיים נקרא מספר מרוכב.',
    );
  });

  it('renders topic name in prompt context but not objectives', () => {
    const markdown = renderLessonPlanCurriculumContext(
      getLessonPlanCurriculumContext('יבי', 'complex-numbers'),
    );

    expect(markdown).toContain('נושא שנבחר: מספרים מרוכבים');
    expect(markdown).not.toContain('יעדי למידה');
    expect(markdown).not.toContain('פתרון משוואות ריבועיות');
  });

  it('renders available topics when no selected topic is provided', () => {
    const broadMarkdown = renderLessonPlanCurriculumContext(getLessonPlanCurriculumContext('יבי'));
    const unknownMarkdown = renderLessonPlanCurriculumContext(
      getLessonPlanCurriculumContext('יבי', 'not-a-topic'),
    );

    expect(broadMarkdown).toContain('נושאים זמינים לשכבה');
    expect(broadMarkdown).toContain('מספרים מרוכבים (20 שעות)');
    expect(unknownMarkdown).toContain('נושאים זמינים לשכבה');
    expect(unknownMarkdown).not.toContain('נושא שנבחר');
  });

  it('returns lesson-plan topic options for a grade', () => {
    const options = getLessonPlanCurriculumTopicOptions('זי');

    expect(options).toContainEqual(expect.objectContaining({
      id: 'ms-grade7-t10',
      name: 'שטחים',
    }));
  });

  it('validates selected lesson-plan curriculum topics across all grades', () => {
    expect(validateLessonPlanRequestCurriculumTopic('זי')).toEqual([]);
    expect(validateLessonPlanRequestCurriculumTopic('זי', CUSTOM_LESSON_PLAN_TOPIC_ID)).toEqual([]);
    expect(validateLessonPlanRequestCurriculumTopic('זי', 'ms-grade7-t10')).toEqual([]);
    expect(validateLessonPlanRequestCurriculumTopic('זי', 'complex-numbers')).toEqual([]);
    expect(validateLessonPlanRequestCurriculumTopic('יאי', 'complex-numbers')).toEqual([]);
    expect(validateLessonPlanRequestCurriculumTopic('זי', 'nonexistent-topic')).toEqual([
      'נושא תכנית הלימודים "nonexistent-topic" לא נמצא בתכנית הלימודים.',
    ]);
  });

  it('resolves cross-grade topic context for advanced schools', () => {
    const context = getLessonPlanCurriculumContext('יאי', 'complex-numbers');
    expect(context.unitId).toContain('year11');
    expect(context.selectedTopic?.name).toBe('מספרים מרוכבים');
    expect(context.selectedTopic?.learningObjectives.length).toBeGreaterThan(0);
  });

  it('includes cross-grade topics in topic options with sourceGrade label', () => {
    const options = getLessonPlanCurriculumTopicOptions('יאי');
    const complexNumbers = options.find(t => t.id === 'complex-numbers');
    expect(complexNumbers).toBeDefined();
    expect(complexNumbers!.sourceGrade).toBe("יב'");
    const ownTopic = options.find(t => t.id === 'probability');
    expect(ownTopic).toBeDefined();
    expect(ownTopic!.sourceGrade).toBeUndefined();
  });

  it('exposes objectives on topics for UI hints', () => {
    const options = getLessonPlanCurriculumTopicOptions('יבי');
    const complex = options.find(t => t.id === 'complex-numbers');
    expect(complex?.learningObjectives.length).toBeGreaterThan(0);

    const vectors = options.find(t => t.id === 'vectors-3d');
    expect(vectors?.learningObjectives).toEqual([]);
  });
});
