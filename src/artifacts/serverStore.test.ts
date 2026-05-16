import { asUuidOrNull, listGeneratedArtifacts, saveGeneratedArtifact } from './serverStore';
import type { Queryable } from '../curriculumProgress/serverStore';

class FakeDb implements Queryable {
  queries: { text: string; params: unknown[] | undefined }[] = [];

  constructor(private readonly rows: Record<string, unknown>[]) {}

  async query<T extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    params?: unknown[],
  ): Promise<{ rows: T[] }> {
    this.queries.push({ text, params });
    return { rows: this.rows as T[] };
  }
}

const ARTIFACT_ROW = {
  id: '11111111-1111-4111-8111-111111111111',
  kind: 'lesson_plan',
  title: 'משוואות - תרגול',
  grade_level: 'זי',
  class_id: null,
  curriculum_topic_id: 'ms-grade7-t01',
  source_artifact_id: null,
  metadata: { worksheet: true },
  created_at: '2026-05-16T10:00:00.000Z',
  updated_at: '2026-05-16T10:00:00.000Z',
};

describe('generated artifact store', () => {
  it('saves generated artifacts with JSON payload and safe UUID fields', async () => {
    const db = new FakeDb([ARTIFACT_ROW]);

    const saved = await saveGeneratedArtifact(db, {
      teacherId: 'teacher-1',
      kind: 'lesson_plan',
      title: 'משוואות - תרגול',
      grade: 'זי',
      classId: 'local-browser-id',
      curriculumTopicId: 'ms-grade7-t01',
      payload: { id: 'plan-1' },
      markdown: '# מערך',
      metadata: { worksheet: true },
    });

    expect(saved.id).toBe(ARTIFACT_ROW.id);
    expect(saved.metadata).toEqual({ worksheet: true });
    expect(db.queries[0]?.params?.[4]).toBeNull();
    expect(db.queries[0]?.params?.[7]).toBe(JSON.stringify({ id: 'plan-1' }));
  });

  it('lists artifacts by teacher and optional kind', async () => {
    const db = new FakeDb([ARTIFACT_ROW]);

    const summaries = await listGeneratedArtifacts(db, 'teacher-1', { kind: 'lesson_plan', limit: 5 });

    expect(summaries).toHaveLength(1);
    expect(summaries[0]?.title).toBe('משוואות - תרגול');
    expect(db.queries[0]?.params).toEqual(['teacher-1', 5, 'lesson_plan']);
  });

  it('accepts only UUID-shaped ids for UUID columns', () => {
    expect(asUuidOrNull('11111111-1111-4111-8111-111111111111')).toBe('11111111-1111-4111-8111-111111111111');
    expect(asUuidOrNull('local-id')).toBeNull();
    expect(asUuidOrNull(undefined)).toBeNull();
  });
});
