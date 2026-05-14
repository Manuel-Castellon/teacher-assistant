import { renderExamMarkdown, renderAnswerKeyMarkdown } from './renderExam';
import type { GeneratedExam } from './types';

const MINIMAL_EXAM: GeneratedExam = {
  header: { examNumber: 1, subject: 'מתמטיקה', className: "ח'2", date: '01.01.26' },
  parts: [
    {
      title: "חלק א'- אלגברה",
      questions: [
        {
          questionNumber: 1,
          points: 20,
          instruction: 'פתרו את המשוואות הבאות',
          subQuestions: [
            { label: '1.', content: '$2x + 3 = 7$' },
            { label: '2.', content: '$\\frac{x}{2} = 5$' },
          ],
        },
      ],
    },
  ],
  totalPoints: 20,
  answerKey: [
    {
      questionNumber: 1,
      subAnswers: [
        { label: '1.', steps: ['$2x = 4$', '$x = 2$'], finalAnswer: '$x = 2$' },
        { label: '2.', steps: ['$x = 10$'], finalAnswer: '$x = 10$' },
      ],
    },
  ],
  verificationItems: [],
};

const GEOMETRY_EXAM: GeneratedExam = {
  header: { subject: 'מתמטיקה', className: "ח'1", date: '15.05.26' },
  parts: [
    {
      title: "חלק ב'- גיאומטריה",
      questions: [
        {
          questionNumber: 1,
          points: 35,
          instruction: 'הוכיחו כי המשולשים דומים',
          subQuestions: [{ label: '1.', content: 'הוכיחו $\\triangle ABC \\sim \\triangle DEF$' }],
          givenData: ['$AB = 6$', '$DE = 12$'],
          diagramDescription: 'שני משולשים ישרי זווית',
        },
      ],
    },
  ],
  totalPoints: 35,
  answerKey: [
    {
      questionNumber: 1,
      subAnswers: [
        { label: '1.', steps: ['לפי משפט זז"ז'], finalAnswer: 'הוכח' },
      ],
    },
  ],
  verificationItems: [],
};

describe('renderExamMarkdown', () => {
  it('renders name line and title with exam number', () => {
    const md = renderExamMarkdown(MINIMAL_EXAM);
    expect(md).toContain('שם ומשפחה:________________');
    expect(md).toContain('מבחן 1');
    expect(md).toContain('במתמטיקה');
    expect(md).toContain("ח'2");
    expect(md).toContain('01.01.26');
  });

  it('omits exam number when not provided', () => {
    const md = renderExamMarkdown(GEOMETRY_EXAM);
    expect(md).toMatch(/^# שם ומשפחה/m);
    expect(md).toContain('מבחן- במתמטיקה');
    expect(md).not.toContain('מבחן 1');
  });

  it('renders part titles as headings', () => {
    const md = renderExamMarkdown(MINIMAL_EXAM);
    expect(md).toContain("### חלק א'- אלגברה");
  });

  it('renders question header with points', () => {
    const md = renderExamMarkdown(MINIMAL_EXAM);
    expect(md).toContain("#### שאלה 1 (20 נק')");
  });

  it('renders sub-questions with blank-line separation (RTL safe)', () => {
    const md = renderExamMarkdown(MINIMAL_EXAM);
    const lines = md.split('\n');
    const idx1 = lines.indexOf('1. $2x + 3 = 7$');
    expect(idx1).toBeGreaterThan(-1);
    expect(lines[idx1 + 1]).toBe('');
  });

  it('renders geometry given data and diagram description', () => {
    const md = renderExamMarkdown(GEOMETRY_EXAM);
    expect(md).toContain('$AB = 6$');
    expect(md).toContain('$DE = 12$');
    expect(md).toContain('[שרטוט: שני משולשים ישרי זווית]');
  });

  it('ends with בהצלחה!', () => {
    const md = renderExamMarkdown(MINIMAL_EXAM);
    expect(md.trim()).toMatch(/בהצלחה!$/);
  });

  it('every logical line is its own paragraph (blank-line separated)', () => {
    const md = renderExamMarkdown(MINIMAL_EXAM);
    const lines = md.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i] !== '' && lines[i + 1] !== undefined) {
        expect(lines[i + 1]).toBe('');
      }
    }
  });
});

describe('renderAnswerKeyMarkdown', () => {
  it('renders title with exam number', () => {
    const md = renderAnswerKeyMarkdown(MINIMAL_EXAM);
    expect(md).toContain('# פתרון מבחן 1');
  });

  it('renders generic title when no exam number', () => {
    const md = renderAnswerKeyMarkdown(GEOMETRY_EXAM);
    expect(md).toContain('# פתרון המבחן');
  });

  it('renders question numbers and sub-answer labels', () => {
    const md = renderAnswerKeyMarkdown(MINIMAL_EXAM);
    expect(md).toContain('## שאלה 1');
    expect(md).toContain('**1.**');
    expect(md).toContain('**2.**');
  });

  it('renders solution steps and final answer', () => {
    const md = renderAnswerKeyMarkdown(MINIMAL_EXAM);
    expect(md).toContain('$2x = 4$');
    expect(md).toContain('**תשובה:** $x = 2$');
  });

  it('every logical line is its own paragraph', () => {
    const md = renderAnswerKeyMarkdown(MINIMAL_EXAM);
    const lines = md.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i] !== '' && lines[i + 1] !== undefined) {
        expect(lines[i + 1]).toBe('');
      }
    }
  });
});
