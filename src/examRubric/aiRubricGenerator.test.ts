import { generateAiRubric } from './aiRubricGenerator';
import type { ExamRubric } from './types';

function makeBase(): ExamRubric {
  return {
    id: 'rubric-test',
    sourceExamPath: 'generated:exam:test',
    title: 'מבחן בדיקה',
    className: "ח'1",
    date: '20.05.26',
    totalPoints: 20,
    projectLearnings: [],
    questions: [{
      questionNumber: 1,
      title: 'משוואות',
      topic: 'אלגברה',
      maxPoints: 20,
      subQuestions: [{
        label: '1.',
        maxPoints: 10,
        expectedAnswer: '$x=4$',
        criteria: [
          { id: '1-solve', description: 'פתרון מסודר ונכון על-פי שלבים', points: 7 },
          { id: '1-answer', description: 'תשובה סופית נכונה', points: 3 },
        ],
      }, {
        label: '2.',
        maxPoints: 10,
        expectedAnswer: '$x=\\pm 3$',
        criteria: [
          { id: '2-solve', description: 'פתרון מסודר ונכון על-פי שלבים', points: 7 },
          { id: '2-answer', description: 'תשובה סופית נכונה', points: 3 },
        ],
      }],
    }],
  };
}

describe('generateAiRubric', () => {
  it('accepts model output that matches the schema and totals', async () => {
    const enriched = JSON.stringify({
      ...makeBase(),
      questions: [{
        questionNumber: 1,
        title: 'משוואות',
        topic: 'אלגברה',
        maxPoints: 20,
        subQuestions: [{
          label: '1.',
          maxPoints: 10,
          expectedAnswer: '$x=4$',
          criteria: [
            { id: 'isolate', description: 'בידוד $x$', points: 4 },
            { id: 'arithmetic', description: 'חישוב נכון של ההפרש', points: 4 },
            { id: 'final', description: 'תשובה סופית $x=4$', points: 2 },
          ],
          commonMistakes: ['החלפת סימן בעת העברת אגף'],
        }, {
          label: '2.',
          maxPoints: 10,
          expectedAnswer: '$x=\\pm 3$',
          criteria: [
            { id: 'square-root', description: 'הוצאת שורש משני האגפים', points: 5 },
            { id: 'both-roots', description: 'ציון שני הפתרונות', points: 5 },
          ],
          commonMistakes: ['רישום פתרון חיובי בלבד'],
        }],
      }],
    });

    const result = await generateAiRubric({
      baseRubric: makeBase(),
      examMarkdown: '## שאלה 1',
      answerKeyMarkdown: '## פתרון 1',
      complete: async () => enriched,
    });

    expect(result.questions[0]!.subQuestions[0]!.criteria.map(c => c.id))
      .toEqual(['isolate', 'arithmetic', 'final']);
    expect(result.questions[0]!.subQuestions[0]!.commonMistakes)
      .toEqual(['החלפת סימן בעת העברת אגף']);
  });

  it('falls back to deterministic criteria when AI totals do not match maxPoints', async () => {
    const wrongTotal = JSON.stringify({
      ...makeBase(),
      questions: [{
        questionNumber: 1,
        title: 'משוואות',
        topic: 'אלגברה',
        maxPoints: 20,
        subQuestions: [{
          label: '1.',
          maxPoints: 10,
          expectedAnswer: '$x=4$',
          criteria: [{ id: 'wrong', description: 'משהו', points: 99 }],
        }, {
          label: '2.',
          maxPoints: 10,
          expectedAnswer: '$x=\\pm 3$',
          criteria: [
            { id: 'fine', description: 'בסדר', points: 10 },
          ],
        }],
      }],
    });

    const result = await generateAiRubric({
      baseRubric: makeBase(),
      examMarkdown: 'm',
      answerKeyMarkdown: 'k',
      complete: async () => wrongTotal,
    });

    const subs = result.questions[0]!.subQuestions;
    expect(subs[0]!.criteria.map(c => c.id)).toEqual(['1-solve', '1-answer']);
    expect(subs[1]!.criteria.map(c => c.id)).toEqual(['fine']);
  });

  it('strips a markdown fence around model output', async () => {
    const wrapped = '```json\n' + JSON.stringify(makeBase()) + '\n```';
    const result = await generateAiRubric({
      baseRubric: makeBase(),
      examMarkdown: 'm',
      answerKeyMarkdown: 'k',
      complete: async () => wrapped,
    });
    expect(result.id).toBe('rubric-test');
  });

  it('throws when the model response is unparseable JSON', async () => {
    await expect(generateAiRubric({
      baseRubric: makeBase(),
      examMarkdown: 'm',
      answerKeyMarkdown: 'k',
      complete: async () => 'sorry I cannot do that',
    })).rejects.toThrow();
  });

  it('preserves identity fields from the base even when the AI tries to change them', async () => {
    const tampered = JSON.stringify({
      ...makeBase(),
      id: 'hacked',
      title: 'something-else',
      totalPoints: 9999,
    });
    const result = await generateAiRubric({
      baseRubric: makeBase(),
      examMarkdown: 'm',
      answerKeyMarkdown: 'k',
      complete: async () => tampered,
    });
    expect(result.id).toBe('rubric-test');
    expect(result.title).toBe('מבחן בדיקה');
    expect(result.totalPoints).toBe(20);
  });
});
