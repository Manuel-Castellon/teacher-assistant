import {
  listQuestionBankItems,
  loadQuestionBankItem,
  normalizeTags,
  saveQuestionBankItem,
} from './serverStore';
import { ProvenanceValidationError } from './types';
import type { Queryable } from '../curriculumProgress/serverStore';

const SAMPLE_ID = '22222222-2222-4222-8222-222222222222';

class FakeDb implements Queryable {
  queries: { text: string; params: unknown[] | undefined }[] = [];
  rows: Record<string, unknown>[] = [];

  setRows(rows: Record<string, unknown>[]): void {
    this.rows = rows;
  }

  async query<T extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    params?: unknown[],
  ): Promise<{ rows: T[] }> {
    this.queries.push({ text, params });
    if (text.includes('FROM question_bank_tags')) {
      return { rows: [] as unknown as T[] };
    }
    if (this.rows.length > 0 && text.trim().toUpperCase().startsWith('SELECT')) {
      return { rows: this.rows as T[] };
    }
    return {
      rows: ([{
        id: SAMPLE_ID,
        grade_level: 'חי',
        curriculum_topic_id: 'ms-grade8-t04',
        question_type: 'חישובי',
        difficulty: 'בינוני',
        representation_type: 'טקסט',
        license: 'teacher-original',
        metadata: {
          provenance: {
            license: 'teacher-original',
            sourceTitle: 'Teacher exam — May 2026',
            ingestedAt: '2026-05-17T10:00:00.000Z',
          },
        },
        created_at: '2026-05-16T10:00:00.000Z',
      }] as unknown) as T[],
    };
  }
}

describe('question bank store', () => {
  it('normalizes tags by trimming, deduplicating, and sorting', () => {
    expect(normalizeTags([' משוואות ', 'אלגברה', 'משוואות', ''])).toEqual(['אלגברה', 'משוואות']);
  });

  it('saves a tagged item and writes license + provenance into metadata', async () => {
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
      provenance: {
        license: 'teacher-original',
        sourceTitle: 'Teacher exam — May 2026',
        ingestedAt: '2026-05-17T10:00:00.000Z',
      },
    });

    expect(saved).toMatchObject({
      id: SAMPLE_ID,
      grade: 'חי',
      curriculumTopicId: 'ms-grade8-t04',
      license: 'teacher-original',
      sourceTitle: 'Teacher exam — May 2026',
      tags: ['אלגברה', 'משוואות'],
    });
    // 1 INSERT + 2 tag inserts = 3 queries (tags dedup to 2 entries)
    expect(db.queries).toHaveLength(3);

    const insertParams = db.queries[0]?.params ?? [];
    expect(insertParams[9]).toBe('teacher-original');
    expect(insertParams[12]).toBe(JSON.stringify({
      questionRef: 'Q1',
      type: 'equation',
      sympyExpression: 'Eq(2*x, 8)',
      expectedAnswer: '{4}',
    }));
    const persistedMetadata = JSON.parse(String(insertParams[14]));
    expect(persistedMetadata.provenance).toEqual({
      license: 'teacher-original',
      sourceTitle: 'Teacher exam — May 2026',
      ingestedAt: '2026-05-17T10:00:00.000Z',
    });
  });

  it('rejects insert without provenance', async () => {
    const db = new FakeDb();
    await expect(saveQuestionBankItem(db, {
      sourceKind: 'manual',
      grade: 'חי',
      questionType: 'חישובי',
      promptMarkdown: 'x',
      provenance: undefined as never,
    })).rejects.toBeInstanceOf(ProvenanceValidationError);
  });

  it('rejects copyrighted-personal-use without author/page/exercise', async () => {
    const db = new FakeDb();
    await expect(saveQuestionBankItem(db, {
      sourceKind: 'manual',
      grade: 'יבי',
      questionType: 'חישובי',
      promptMarkdown: 'x',
      provenance: {
        license: 'copyrighted-personal-use',
        sourceTitle: 'בני גורן',
        ingestedAt: '2026-05-17T10:00:00.000Z',
      },
    })).rejects.toBeInstanceOf(ProvenanceValidationError);
  });

  it('rejects license=unknown', async () => {
    const db = new FakeDb();
    await expect(saveQuestionBankItem(db, {
      sourceKind: 'manual',
      grade: 'חי',
      questionType: 'חישובי',
      promptMarkdown: 'x',
      provenance: {
        license: 'unknown',
        sourceTitle: 'x',
        ingestedAt: '2026-05-17T10:00:00.000Z',
      },
    })).rejects.toBeInstanceOf(ProvenanceValidationError);
  });

  it('rejects open-license without reusable terms pointer', async () => {
    const db = new FakeDb();
    await expect(saveQuestionBankItem(db, {
      sourceKind: 'manual',
      grade: 'חי',
      questionType: 'חישובי',
      promptMarkdown: 'x',
      provenance: {
        license: 'open-license',
        sourceTitle: 'open worksheet',
        ingestedAt: '2026-05-17T10:00:00.000Z',
      },
    })).rejects.toBeInstanceOf(ProvenanceValidationError);
  });

  it('lists items with license filter', async () => {
    const db = new FakeDb();
    const items = await listQuestionBankItems(db, { license: 'teacher-original', grade: 'חי' });
    expect(items).toHaveLength(1);
    expect(items[0]?.license).toBe('teacher-original');
    const listQuery = db.queries.find(q => q.text.includes('FROM question_bank_items'));
    expect(listQuery?.text).toContain('license = $');
    expect(listQuery?.text).toContain('grade_level = $');
  });

  it('loads a full item including provenance', async () => {
    const db = new FakeDb();
    db.setRows([{
      id: SAMPLE_ID,
      teacher_id: 'teacher-1',
      source_kind: 'manual',
      source_label: 'בני גורן עמוד 12',
      grade_level: 'יבי',
      curriculum_topic_id: 'hs-grade12-5u-complex',
      question_type: 'חישובי',
      difficulty: 'בינוני',
      representation_type: 'טקסט',
      license: 'copyrighted-personal-use',
      prompt_markdown: 'חשבו $(1+i)^2$',
      answer_markdown: '$2i$',
      verification_item: null,
      rubric_json: null,
      metadata: {
        provenance: {
          license: 'copyrighted-personal-use',
          sourceTitle: 'בני גורן',
          author: 'בני גורן',
          pageNumber: 12,
          exerciseNumber: '1',
          ingestedAt: '2026-05-17T10:00:00.000Z',
        },
      },
      created_at: '2026-05-17T10:00:00.000Z',
    }]);
    const item = await loadQuestionBankItem(db, SAMPLE_ID);
    expect(item).not.toBeNull();
    expect(item?.provenance.author).toBe('בני גורן');
    expect(item?.provenance.pageNumber).toBe(12);
    expect(item?.promptMarkdown).toBe('חשבו $(1+i)^2$');
  });

  it('returns null for invalid uuid', async () => {
    const db = new FakeDb();
    expect(await loadQuestionBankItem(db, 'not-a-uuid')).toBeNull();
  });
});
