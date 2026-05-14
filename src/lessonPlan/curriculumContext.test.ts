import { getLessonPlanCurriculumContext, renderLessonPlanCurriculumContext } from './curriculumContext';

describe('lesson plan curriculum context', () => {
  it('returns selected topic objectives for grade יב complex numbers', () => {
    const context = getLessonPlanCurriculumContext('יבי', 'complex-numbers');

    expect(context.unitId).toBe('hs-5units-year12-tashpav');
    expect(context.selectedTopic?.name).toBe('מספרים מרוכבים');
    expect(context.selectedTopic?.learningObjectives).toContain(
      'הצגת מספר מרוכב בצורה הקרטזית a+ib, זיהוי החלק הממשי והחלק המדומה, ושוויון בין מספרים מרוכבים.',
    );
  });

  it('renders selected objectives when available', () => {
    const markdown = renderLessonPlanCurriculumContext(
      getLessonPlanCurriculumContext('יבי', 'complex-numbers'),
    );

    expect(markdown).toContain('נושא שנבחר: מספרים מרוכבים');
    expect(markdown).toContain('פתרון משוואות ריבועיות פשוטות מעל המרוכבים');
  });

  it('renders a fallback when selected topic has no detailed objectives', () => {
    const markdown = renderLessonPlanCurriculumContext(
      getLessonPlanCurriculumContext('יבי', 'vectors-3d'),
    );

    expect(markdown).toContain('נושא שנבחר: וקטורים');
    expect(markdown).toContain('לא הוזנו יעדי למידה מפורטים');
  });

  it('renders available topics when no selected topic is provided or when it is unknown', () => {
    const broadMarkdown = renderLessonPlanCurriculumContext(getLessonPlanCurriculumContext('יבי'));
    const unknownMarkdown = renderLessonPlanCurriculumContext(
      getLessonPlanCurriculumContext('יבי', 'not-a-topic'),
    );

    expect(broadMarkdown).toContain('נושאים זמינים לשכבה');
    expect(broadMarkdown).toContain('מספרים מרוכבים (20 שעות)');
    expect(unknownMarkdown).toContain('נושאים זמינים לשכבה');
    expect(unknownMarkdown).not.toContain('נושא שנבחר');
  });
});
