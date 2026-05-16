import { buildRubricFromExam, splitPoints } from './buildRubricFromExam';
import type { ExamRequest, GeneratedExam } from '@/exam/types';

function makeExam(): GeneratedExam {
  return {
    header: { examNumber: 5, subject: 'מתמטיקה', className: "ח'1", date: '20.05.26' },
    totalPoints: 50,
    parts: [{
      title: 'אלגברה',
      questions: [{
        questionNumber: 1,
        points: 30,
        instruction: 'פתור את המשוואות הבאות:',
        subQuestions: [
          { label: '1.', content: '$2x+3=11$' },
          { label: '2.', content: '$x^2=9$' },
          { label: '3.', content: '$3x-1>5$' },
        ],
      }, {
        questionNumber: 2,
        points: 20,
        instruction: 'חשב.',
        subQuestions: [{ label: '1.', content: '$\\sqrt{16}$' }],
      }],
    }],
    answerKey: [
      {
        questionNumber: 1,
        subAnswers: [
          { label: '1.', steps: [], finalAnswer: '$x=4$' },
          { label: '2.', steps: [], finalAnswer: '$x=\\pm 3$' },
          { label: '3.', steps: [], finalAnswer: '$x>2$' },
        ],
      },
      {
        questionNumber: 2,
        subAnswers: [{ label: '1.', steps: [], finalAnswer: '$4$' }],
      },
    ],
    verificationItems: [],
  };
}

function makeRequest(): ExamRequest {
  return {
    examNumber: 5,
    className: "ח'1",
    date: '20.05.26',
    grade: 'חי',
    durationMinutes: 90,
    totalPoints: 50,
    parts: [{
      title: 'אלגברה',
      questionSpecs: [
        { topic: 'משוואות לינאריות', questionType: 'חישובי', points: 30, subQuestionCount: 3 },
        { topic: 'שורשים', questionType: 'חישובי', points: 20, subQuestionCount: 1 },
      ],
    }],
  };
}

describe('buildRubricFromExam', () => {
  it('maps exam structure into a rubric with topic + expected answers + criteria', () => {
    const rubric = buildRubricFromExam(makeExam(), makeRequest(), { id: 'rubric-x' });

    expect(rubric.id).toBe('rubric-x');
    expect(rubric.title).toBe("מבחן 5 במתמטיקה - ח'1");
    expect(rubric.totalPoints).toBe(50);
    expect(rubric.projectLearnings).toEqual([]);

    expect(rubric.questions).toHaveLength(2);
    const q1 = rubric.questions[0]!;
    expect(q1.questionNumber).toBe(1);
    expect(q1.title).toBe('משוואות לינאריות');
    expect(q1.maxPoints).toBe(30);
    expect(q1.subQuestions.map(s => s.expectedAnswer)).toEqual(['$x=4$', '$x=\\pm 3$', '$x>2$']);
  });

  it('splits parent question points evenly across sub-questions and 70/30 across criteria', () => {
    const rubric = buildRubricFromExam(makeExam(), makeRequest(), { id: 'r' });
    const subs = rubric.questions[0]!.subQuestions;

    expect(subs.map(s => s.maxPoints)).toEqual([10, 10, 10]);
    const criteria = subs[0]!.criteria;
    expect(criteria.map(c => c.points)).toEqual([7, 3]);
    expect(criteria.map(c => c.description)).toEqual(['פתרון מסודר ונכון על-פי שלבים', 'תשובה סופית נכונה']);
  });

  it('collapses to a single criterion when sub-question is worth one point', () => {
    const exam = makeExam();
    exam.parts[0]!.questions[1] = {
      questionNumber: 2,
      points: 1,
      instruction: 'חשב.',
      subQuestions: [{ label: '1.', content: '$1+1$' }],
    };
    exam.answerKey[1] = {
      questionNumber: 2,
      subAnswers: [{ label: '1.', steps: [], finalAnswer: '$2$' }],
    };

    const rubric = buildRubricFromExam(exam, makeRequest(), { id: 'r' });
    const sub = rubric.questions[1]!.subQuestions[0]!;
    expect(sub.criteria).toHaveLength(1);
    expect(sub.criteria[0]!.points).toBe(1);
  });

  it('falls back to part title when the request lacks a topic for a question', () => {
    const exam = makeExam();
    const request = makeRequest();
    request.parts[0]!.questionSpecs[0] = { topic: '', questionType: 'חישובי', points: 30 };

    const rubric = buildRubricFromExam(exam, request, { id: 'r' });
    expect(rubric.questions[0]!.title).toBe('אלגברה');
    expect(rubric.questions[0]!.topic).toBe('אלגברה');
  });

  it('handles missing answer-key entries gracefully', () => {
    const exam = makeExam();
    exam.answerKey = [];

    const rubric = buildRubricFromExam(exam, makeRequest(), { id: 'r' });
    for (const q of rubric.questions) {
      for (const sub of q.subQuestions) {
        expect(sub.expectedAnswer).toBe('');
      }
    }
  });
});

describe('splitPoints', () => {
  it('splits evenly when divisible', () => {
    expect(splitPoints(30, 3)).toEqual([10, 10, 10]);
  });

  it('puts the remainder into earlier entries', () => {
    expect(splitPoints(10, 3)).toEqual([4, 3, 3]);
    expect(splitPoints(7, 2)).toEqual([4, 3]);
  });

  it('returns a single entry for count <= 1', () => {
    expect(splitPoints(15, 1)).toEqual([15]);
    expect(splitPoints(15, 0)).toEqual([15]);
  });
});
