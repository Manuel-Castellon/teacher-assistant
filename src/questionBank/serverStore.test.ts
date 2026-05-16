import { normalizeTags, saveQuestionBankItem } from './serverStore';
import type { Queryable } from '../curriculumProgress/serverStore';

class FakeDb implements Queryable {
  queries: { text: string; params: unknown[] | undefined }[] = [];

  async query<T extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    params?: unknown[],
  ): Promise<{ rows: T[] }> {
    this.queries.push({ text, params });
    return {
      rows: ([{
        id: '22222222-2222-4222-8222-222222222222',
        grade_level: 'חי',
        curriculum_topic_id: 'ms-grade8-t04',
        question_type: 'חישובי',
        difficulty: 'בינוני',
        representation_type: 'טקסט',
        created_at: '2026-05-16T10:00:00.000Z',
      }] as unknown) as T[],
    };
  }
}

describe('question bank store', () => {
  it('normalizes tags by trimming, deduplicating, and sorting', () => {
    expect(normalizeTags([' משוואות ', 'אלגברה', 'משוואות', ''])).toEqual(['אלגברה', 'משוואות']);
  });

  it('saves a tagged question-bank item stub', async () => {
    const db = new FakeDb();

    const saved = await saveQuestionBankItem(db, {
      teacherId: 'teacher-1',
      sourceKind: 'generated_exam',
      grade: 'חי',
      curriculumTopicId: 'ms-grade8-t04',
      questionType: 'חישובי',
      difficulty: 'בינוני',
      representationType: 'טקסט',
      promptMarkdown: 'פתרו $2x=8$',
      answerMarkdown: '$x=4$',
      verificationItem: {
        questionRef: 'Q1',
        type: 'equation',
        sympyExpression: 'Eq(2*x, 8)',
        expectedAnswer: '{4}',
      },
      tags: [' משוואות ', 'אלגברה', 'משוואות'],
    });

    expect(saved).toMatchObject({
      id: '22222222-2222-4222-8222-222222222222',
      grade: 'חי',
      curriculumTopicId: 'ms-grade8-t04',
      tags: ['אלגברה', 'משוואות'],
    });
    expect(db.queries).toHaveLength(3);
    expect(db.queries[0]?.params?.[11]).toBe(JSON.stringify({
      questionRef: 'Q1',
      type: 'equation',
      sympyExpression: 'Eq(2*x, 8)',
      expectedAnswer: '{4}',
    }));
  });
});
