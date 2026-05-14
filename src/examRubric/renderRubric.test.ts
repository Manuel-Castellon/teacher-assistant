import { renderExamRubricMarkdown } from './renderRubric';
import type { ExamRubric } from './types';

const SAMPLE_RUBRIC: ExamRubric = {
  id: 'sample',
  sourceExamPath: 'data/exam-examples/sample.pdf',
  title: 'מבחן לדוגמה',
  className: "ח'1",
  date: '14.05.26',
  totalPoints: 10,
  projectLearnings: ['צריך לשמור תחום הצבה כחלק מהמחוון.'],
  questions: [{
    questionNumber: 1,
    title: 'אלגברה',
    topic: 'משוואות',
    maxPoints: 10,
    subQuestions: [{
      label: '1.',
      maxPoints: 10,
      expectedAnswer: '$x=2$',
      acceptedAlternatives: ['כתיבה מילולית: איקס שווה 2'],
      criteria: [
        { id: 'solve', description: 'פתרון נכון', points: 8 },
        { id: 'answer', description: 'תשובה סופית', points: 2 },
      ],
      commonMistakes: ['העברת אגפים שגויה'],
    }],
  }],
  bonus: {
    maxPoints: 2,
    prompt: 'שאלת בונוס',
    expectedAnswer: '$\\sqrt{2}$',
    criteria: [{ id: 'ratio', description: 'יחס נכון', points: 2 }],
  },
};

describe('renderExamRubricMarkdown', () => {
  it('renders metadata, learnings, criteria, alternatives, mistakes, and bonus', () => {
    const markdown = renderExamRubricMarkdown(SAMPLE_RUBRIC);

    expect(markdown).toContain('# מחוון - מבחן לדוגמה');
    expect(markdown).toContain("כיתה: ח'1");
    expect(markdown).toContain('צריך לשמור תחום הצבה');
    expect(markdown).toContain('## שאלה 1 - אלגברה (10 נק');
    expect(markdown).toContain('תשובה צפויה: $x=2$');
    expect(markdown).toContain('| פתרון נכון | 8 |');
    expect(markdown).toContain('כתיבה מילולית');
    expect(markdown).toContain('העברת אגפים שגויה');
    expect(markdown).toContain('## בונוס (עד 2 נק');
  });

  it('omits optional sections when absent', () => {
    const subQuestion = SAMPLE_RUBRIC.questions[0]!.subQuestions[0]!;
    const {
      acceptedAlternatives: _acceptedAlternatives,
      commonMistakes: _commonMistakes,
      ...subQuestionWithoutOptionalSections
    } = subQuestion;
    const { bonus: _bonus, ...rubricWithoutBonus } = SAMPLE_RUBRIC;

    const markdown = renderExamRubricMarkdown({
      ...rubricWithoutBonus,
      projectLearnings: [],
      questions: [{
        ...SAMPLE_RUBRIC.questions[0]!,
        subQuestions: [subQuestionWithoutOptionalSections],
      }],
    });

    expect(markdown).not.toContain('## לקחים לפרויקט');
    expect(markdown).not.toContain('חלופות מתקבלות');
    expect(markdown).not.toContain('טעויות נפוצות');
    expect(markdown).not.toContain('## בונוס');
  });
});
