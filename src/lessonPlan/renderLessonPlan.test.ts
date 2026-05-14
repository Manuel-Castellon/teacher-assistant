import type { LessonPlan } from '../types/lessonPlan';
import { renderLessonPlanMarkdown } from './renderLessonPlan';

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
    expect(markdown).toContain('כיתה: יבי');
    expect(markdown).toContain('## מקורות');
    expect(markdown).toContain('שיעור ראשון בנושא');
    expect(markdown).toContain('### פתיחה (5 דקות)');
    expect(markdown).toContain('$x^2+1=0$ מעל הממשיים');
    expect(markdown).toContain('דגשי מורה: להדגיש i^2=-1');
    expect(markdown).toContain('עמוד 1, תרגיל 2');
    expect(markdown).toContain('פתרו $x^2+9=0$');
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
});
