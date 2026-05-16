import type { LessonPlan } from '../types/lessonPlan';
import { renderLessonPlanMarkdown, renderStudentWorksheetMarkdown } from './renderLessonPlan';

const SAMPLE_PLAN: LessonPlan = {
  id: 'sample',
  createdAt: '2026-05-14T00:00:00.000Z',
  updatedAt: '2026-05-14T00:00:00.000Z',
  topic: 'מספרים מרוכבים',
  subTopic: 'הצגה קרטזית',
  grade: 'יבי',
  duration: 45,
  lessonType: 'הקנייה',
  textbook: {
    name: 'בני גורן',
    grade: 'י"ב 5 יח"ל',
    part: 2,
    publisher: 'בני גורן',
    isStudentStandardBook: false,
  },
  curriculumTopicId: 'complex-numbers',
  phases: {
    opening: {
      name: 'פתיחה',
      durationMinutes: 5,
      description: 'תרגיל קצר',
      exercises: [{
        source: 'generated',
        generatedContent: '$x^2+1=0$ מעל הממשיים',
        practiceMode: 'עצמאי',
        estimatedMinutes: 5,
        notes: 'אבחון',
      }],
    },
    instruction: {
      name: 'הקנייה',
      durationMinutes: 15,
      exercises: [],
      teacherNotes: 'להדגיש i^2=-1',
    },
    practice: {
      name: 'תרגול',
      durationMinutes: 10,
      exercises: [],
    },
    independentWork: {
      name: 'עבודה עצמית',
      durationMinutes: 15,
      exercises: [{
        source: 'textbook',
        textbookRef: { page: 1, exerciseId: '2' },
        practiceMode: 'עצמאי',
        estimatedMinutes: 5,
      }],
    },
  },
  homework: [{
    source: 'generated',
    generatedContent: 'פתרו $x^2+9=0$',
    practiceMode: 'עצמאי',
    estimatedMinutes: 5,
  }],
  teacherNotes: 'שיעור ראשון בנושא.',
  generatedBy: 'teacher',
};

describe('renderLessonPlanMarkdown', () => {
  it('renders metadata, sources, notes, phases, generated exercises, textbook exercises, and homework', () => {
    const markdown = renderLessonPlanMarkdown(SAMPLE_PLAN);

    expect(markdown).toContain('# מערך שיעור - מספרים מרוכבים');
    expect(markdown).toContain("כיתה: יב'");
    expect(markdown).toContain('## מקורות');
    expect(markdown).toContain('## דגשים למורה');
    expect(markdown).toContain('שיעור ראשון בנושא');
    expect(markdown).toContain('### פתיחה (5 דקות)');
    expect(markdown).toContain('$x^2+1=0$ מעל הממשיים');
    expect(markdown).toContain('דגשי מורה: להדגיש i^2=-1');
    expect(markdown).toContain('עמוד 1, תרגיל 2');
    expect(markdown).toContain('פתרו $x^2+9=0$');
    expect(markdown).not.toContain('מצב עבודה');
    expect(markdown).not.toContain('זמן משוער');
  });

  it('renders explicit no-homework and no-homework-defined states', () => {
    const noHomework = renderLessonPlanMarkdown({ ...SAMPLE_PLAN, homework: null });
    const emptyHomework = renderLessonPlanMarkdown({ ...SAMPLE_PLAN, homework: [] });

    expect(noHomework).toContain('אין שיעורי בית.');
    expect(emptyHomework).toContain('לא הוגדרו שיעורי בית.');
  });

  it('omits optional source, notes, and instruction sections when absent', () => {
    const { textbook: _textbook, teacherNotes: _teacherNotes, ...planWithoutOptionalSections } = SAMPLE_PLAN;
    const { instruction: _instruction, ...phasesWithoutInstruction } = planWithoutOptionalSections.phases;
    const markdown = renderLessonPlanMarkdown({
      ...planWithoutOptionalSections,
      phases: phasesWithoutInstruction,
    });

    expect(markdown).not.toContain('## מקורות');
    expect(markdown).not.toContain('## הערות למורה');
    expect(markdown).not.toContain('### הקנייה');
  });

  it('renders minimal textbook metadata and unnamed generated exercises', () => {
    const markdown = renderLessonPlanMarkdown({
      ...SAMPLE_PLAN,
      textbook: {
        name: 'ספר מינימלי',
        isStudentStandardBook: true,
      },
      phases: {
        ...SAMPLE_PLAN.phases,
        opening: {
          ...SAMPLE_PLAN.phases.opening,
          exercises: [{
            source: 'generated',
            practiceMode: 'עצמאי',
            estimatedMinutes: 2,
          }],
        },
      },
    });

    expect(markdown).toContain('- ספר מינימלי');
    expect(markdown).not.toContain('ספר מינימלי,');
    expect(markdown).toContain('1. תרגיל');
  });

  it('preserves structured generated Markdown without adding duplicate numbering', () => {
    const markdown = renderLessonPlanMarkdown({
      ...SAMPLE_PLAN,
      phases: {
        ...SAMPLE_PLAN.phases,
        practice: {
          ...SAMPLE_PLAN.phases.practice,
          exercises: [{
            source: 'generated',
            generatedContent: 'דוגמה 1:\nא. חשבו $i^2$\nב. פתרו $x^2+4=0$',
            practiceMode: 'לוח_משותף',
            estimatedMinutes: 8,
          }],
        },
      },
    });

    expect(markdown).toContain('דוגמה 1:\nא. חשבו $i^2$\nב. פתרו $x^2+4=0$');
    expect(markdown).not.toContain('1. דוגמה 1');
  });

  it('formats long answer-key notes as a teacher solution list', () => {
    const markdown = renderLessonPlanMarkdown({
      ...SAMPLE_PLAN,
      phases: {
        ...SAMPLE_PLAN.phases,
        practice: {
          ...SAMPLE_PLAN.phases.practice,
          exercises: [{
            source: 'generated',
            generatedContent: 'דף עבודה:\nא. חשבו $1+1$\nב. חשבו $2+2$',
            practiceMode: 'עצמאי',
            estimatedMinutes: 10,
            notes: 'פתרונות למורה: א. $2$. ב. $4$. ג. $6$. ד. $8$. ה. $10$. ו. $12$. ז. $14$. ח. $16$. ט. $18$. י. $20$. יא. $22$. יב. $24$.',
          }],
        },
      },
    });

    expect(markdown).toContain('פתרונות קצרים למורה:');
    expect(markdown).toContain('- א. $2$');
    expect(markdown).toContain('- יב. $24$');
  });

  it('keeps teacher-facing exports free of internal exercise metadata even for many generated exercises', () => {
    const markdown = renderLessonPlanMarkdown({
      ...SAMPLE_PLAN,
      phases: {
        ...SAMPLE_PLAN.phases,
        practice: {
          name: 'תרגול מונחה',
          durationMinutes: 10,
          description: 'עבודה בקצב גבוה.',
          exercises: [
            {
              source: 'generated',
              generatedContent: 'תרגול כיתה:\n1. חשבו $2+3i+4-i$\n2. פתרו $x^2+9=0$',
              practiceMode: 'לוחות_מחיקה',
              estimatedMinutes: 5,
              notes: 'בדיקת סימנים',
            },
            {
              source: 'generated',
              generatedContent: 'דף עבודה:\nא. חשבו $i^2$\nב. פשטו $(1+i)^2$',
              practiceMode: 'עצמאי',
              estimatedMinutes: 5,
            },
          ],
        },
      },
    });

    expect(markdown).toContain('תרגול כיתה:\n1. חשבו $2+3i+4-i$\n2. פתרו $x^2+9=0$');
    expect(markdown).not.toContain('מצב עבודה');
    expect(markdown).not.toContain('לוחות_מחיקה');
    expect(markdown).not.toContain('זמן משוער');
    expect(markdown).not.toContain('1. תרגול כיתה');
  });
});

describe('renderStudentWorksheetMarkdown', () => {
  it('renders a separate student worksheet from independent work only', () => {
    const worksheet = renderStudentWorksheetMarkdown({
      ...SAMPLE_PLAN,
      phases: {
        ...SAMPLE_PLAN.phases,
        independentWork: {
          name: 'עבודה עצמית - דף עבודה לתלמידים',
          durationMinutes: 15,
          description: 'פתרו לבד.',
          exercises: [{
            source: 'generated',
            generatedContent: 'דף עבודה:\nא. חשבו $1+1$\nב. חשבו $2+2$',
            practiceMode: 'עצמאי',
            estimatedMinutes: 15,
            notes: 'פתרונות למורה: א. $2$. ב. $4$',
          }],
        },
      },
    });

    expect(worksheet).toContain('# דף עבודה - מספרים מרוכבים');
    expect(worksheet).toContain('דף עבודה:\nא. חשבו $1+1$');
    expect(worksheet).not.toContain('שיעור ראשון בנושא');
    expect(worksheet).not.toContain('פתרונות למורה');
  });

  it('returns undefined when the lesson has no worksheet signal', () => {
    expect(renderStudentWorksheetMarkdown(SAMPLE_PLAN)).toBeUndefined();
  });
});
