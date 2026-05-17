import { resolveExamQuestionBankSeed, renderProvenanceLabel } from './questionBankSeed';
import type { Queryable } from '../curriculumProgress/serverStore';
import type { QuestionLicense } from '../questionBank/types';

const TEACHER_ID = 'teacher-1';
const TEACHER_ORIGINAL_ID = '11111111-1111-4111-8111-111111111111';
const COPYRIGHTED_SHARED_ID = '22222222-2222-4222-8222-222222222222';
const COPYRIGHTED_OWNED_ID = '33333333-3333-4333-8333-333333333333';
const UNKNOWN_ID = '44444444-4444-4444-8444-444444444444';
const OPEN_LICENSE_ID = '55555555-5555-4555-8555-555555555555';

class FakeDb implements Queryable {
  async query<T extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    params?: unknown[],
  ): Promise<{ rows: T[] }> {
    if (text.includes('FROM question_bank_tags')) return { rows: [] as T[] };
    const id = String(params?.[0] ?? '');
    const row = rowsById[id];
    return { rows: row ? [row as T] : [] };
  }
}

const rowsById: Record<string, Record<string, unknown>> = {
  [TEACHER_ORIGINAL_ID]: makeRow(TEACHER_ORIGINAL_ID, 'teacher-original'),
  [COPYRIGHTED_SHARED_ID]: makeRow(COPYRIGHTED_SHARED_ID, 'copyrighted-personal-use'),
  [COPYRIGHTED_OWNED_ID]: makeRow(COPYRIGHTED_OWNED_ID, 'copyrighted-personal-use', TEACHER_ID),
  [UNKNOWN_ID]: makeRow(UNKNOWN_ID, 'unknown'),
  [OPEN_LICENSE_ID]: makeRow(OPEN_LICENSE_ID, 'open-license'),
};

describe('resolveExamQuestionBankSeed', () => {
  it('keeps teacher-original items in verbatim mode and returns attribution', async () => {
    const resolved = await resolveExamQuestionBankSeed({
      db: new FakeDb(),
      grade: 'חי',
      seed: { mode: 'verbatim', itemIds: [TEACHER_ORIGINAL_ID] },
    });

    expect(resolved.seed?.examples?.[0]).toMatchObject({
      id: TEACHER_ORIGINAL_ID,
      requestedMode: 'verbatim',
      useMode: 'verbatim',
      license: 'teacher-original',
    });
    expect(resolved.verbatimAttributions).toHaveLength(1);
    expect(resolved.warning).toBeUndefined();
  });

  it('requires acknowledgement before using copyrighted material verbatim', async () => {
    await expect(resolveExamQuestionBankSeed({
      db: new FakeDb(),
      grade: 'חי',
      seed: { mode: 'verbatim', itemIds: [COPYRIGHTED_SHARED_ID] },
    })).rejects.toThrow(/acknowledgement/);
  });

  it('allows acknowledged copyrighted material verbatim for classroom use', async () => {
    const resolved = await resolveExamQuestionBankSeed({
      db: new FakeDb(),
      grade: 'חי',
      seed: { mode: 'verbatim', itemIds: [COPYRIGHTED_SHARED_ID], copyrightAcknowledged: true },
    });

    expect(resolved.seed?.examples?.[0]?.useMode).toBe('verbatim');
    expect(resolved.seed?.copyrightAcknowledgedAt).toBeDefined();
    expect(resolved.verbatimAttributions[0]?.itemId).toBe(COPYRIGHTED_SHARED_ID);
    expect(resolved.warning).toContain('אישור המורה');
  });

  it('allows open-license items verbatim without copyright acknowledgement', async () => {
    const resolved = await resolveExamQuestionBankSeed({
      db: new FakeDb(),
      grade: 'חי',
      seed: { mode: 'verbatim', itemIds: [OPEN_LICENSE_ID] },
    });

    expect(resolved.seed?.examples?.[0]?.useMode).toBe('verbatim');
    expect(resolved.seed?.copyrightAcknowledgedAt).toBeUndefined();
    expect(resolved.verbatimAttributions[0]?.itemId).toBe(OPEN_LICENSE_ID);
  });

  it('rejects grade mismatches and unknown licenses', async () => {
    await expect(resolveExamQuestionBankSeed({
      db: new FakeDb(),
      grade: 'יבי',
      seed: { mode: 'style-reference', itemIds: [TEACHER_ORIGINAL_ID] },
    })).rejects.toThrow(/not יבי/);

    await expect(resolveExamQuestionBankSeed({
      db: new FakeDb(),
      grade: 'חי',
      seed: { mode: 'style-reference', itemIds: [UNKNOWN_ID] },
    })).rejects.toThrow(/unknown license/);
  });
});

describe('renderProvenanceLabel', () => {
  it('renders page, exercise, author, publisher and year', () => {
    expect(renderProvenanceLabel({
      license: 'copyrighted-personal-use',
      sourceTitle: 'בני גורן ג-2',
      author: 'בני גורן',
      publisher: 'הוצאת מבחנים',
      year: 2024,
      pageNumber: 17,
      exerciseNumber: '12',
      ingestedAt: '2026-05-17T10:00:00.000Z',
    })).toContain("עמ' 17");
  });
});

function makeRow(
  id: string,
  license: QuestionLicense,
  teacherId: string | null = null,
): Record<string, unknown> {
  return {
    id,
    teacher_id: teacherId,
    source_kind: 'manual',
    source_label: `source-${id}`,
    grade_level: 'חי',
    curriculum_topic_id: 'ms-grade8-t04',
    question_type: 'חישובי',
    difficulty: 'בינוני',
    representation_type: 'טקסט',
    license,
    prompt_markdown: 'פתרו $2x=8$',
    answer_markdown: '$x=4$',
    verification_item: null,
    rubric_json: null,
    metadata: {
      provenance: {
        license,
        sourceTitle: license === 'teacher-original' ? 'מבחן מורה' : 'בני גורן ג-2',
        author: license === 'copyrighted-personal-use' ? 'בני גורן' : undefined,
        pageNumber: license === 'copyrighted-personal-use' ? 16 : undefined,
        exerciseNumber: license === 'copyrighted-personal-use' ? '8' : undefined,
        licenseUrl: license === 'open-license' ? 'https://example.test/license' : undefined,
        ingestedAt: '2026-05-17T10:00:00.000Z',
      },
    },
    created_at: '2026-05-17T10:00:00.000Z',
  };
}
