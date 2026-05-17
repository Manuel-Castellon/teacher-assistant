import type { Queryable } from '../curriculumProgress/serverStore';
import { asUuidOrNull } from '../artifacts/serverStore';
import type {
  QuestionBankItemFull,
  QuestionBankItemInput,
  QuestionBankItemSummary,
  QuestionLicense,
  QuestionProvenance,
} from './types';
import { validateProvenance } from './types';
import type { GradeLevel } from '../types/shared';
import type { VerificationItem } from '../exam/types';

interface QuestionRow extends Record<string, unknown> {
  id: string;
  grade_level: GradeLevel;
  curriculum_topic_id: string | null;
  question_type: QuestionBankItemSummary['questionType'];
  difficulty: QuestionBankItemSummary['difficulty'] | null;
  representation_type: QuestionBankItemSummary['representationType'] | null;
  license: QuestionLicense;
  metadata: Record<string, unknown> | string;
  created_at: Date | string;
}

interface FullQuestionRow extends QuestionRow {
  teacher_id: string | null;
  source_kind: QuestionBankItemFull['sourceKind'];
  source_label: string | null;
  prompt_markdown: string;
  answer_markdown: string | null;
  verification_item: VerificationItem | string | null;
  rubric_json: unknown | string | null;
}

export async function saveQuestionBankItem(
  db: Queryable,
  input: QuestionBankItemInput,
): Promise<QuestionBankItemSummary> {
  validateProvenance(input.provenance);
  const metadata = mergeProvenance(input.metadata, input.provenance);

  const inserted = await db.query<QuestionRow>(
    `INSERT INTO question_bank_items
      (teacher_id, source_artifact_id, source_kind, source_label, grade_level, curriculum_topic_id,
       question_type, difficulty, representation_type, license, prompt_markdown, answer_markdown,
       verification_item, rubric_json, metadata)
     VALUES ($1, $2::uuid, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb, $14::jsonb, $15::jsonb)
     RETURNING id, grade_level, curriculum_topic_id, question_type, difficulty, representation_type,
               license, metadata, created_at`,
    [
      input.teacherId ?? null,
      asUuidOrNull(input.sourceArtifactId),
      input.sourceKind,
      input.sourceLabel ?? null,
      input.grade,
      input.curriculumTopicId ?? null,
      input.questionType,
      input.difficulty ?? null,
      input.representationType ?? null,
      input.provenance.license,
      input.promptMarkdown,
      input.answerMarkdown ?? null,
      input.verificationItem ? JSON.stringify(input.verificationItem) : null,
      input.rubric ? JSON.stringify(input.rubric) : null,
      JSON.stringify(metadata),
    ],
  );

  const id = inserted.rows[0]!.id;
  const tags = normalizeTags(input.tags ?? []);
  for (const tag of tags) {
    await db.query(
      `INSERT INTO question_bank_tags (question_id, tag)
       VALUES ($1::uuid, $2)
       ON CONFLICT DO NOTHING`,
      [id, tag],
    );
  }

  return rowToSummary(inserted.rows[0]!, tags);
}

export interface UpsertResult {
  summary: QuestionBankItemSummary;
  action: 'inserted' | 'updated';
}

// Catalog upsert keyed on source_label (the natural key). Re-running the
// ingest CLI must be a no-op for unchanged rows and a UPDATE for changed ones.
export async function upsertCatalogQuestionBankItem(
  db: Queryable,
  input: QuestionBankItemInput,
): Promise<UpsertResult> {
  if (input.teacherId) {
    throw new Error('upsertCatalogQuestionBankItem is for shared catalog items (teacher_id must be null)');
  }
  if (!input.sourceLabel) {
    throw new Error('upsertCatalogQuestionBankItem requires a stable source_label (natural key)');
  }
  validateProvenance(input.provenance);
  const metadata = mergeProvenance(input.metadata, input.provenance);

  const result = await db.query<QuestionRow & { xmax: string }>(
    `INSERT INTO question_bank_items
      (teacher_id, source_artifact_id, source_kind, source_label, grade_level, curriculum_topic_id,
       question_type, difficulty, representation_type, license, prompt_markdown, answer_markdown,
       verification_item, rubric_json, metadata)
     VALUES (NULL, $1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13::jsonb, $14::jsonb)
     ON CONFLICT (source_label) WHERE teacher_id IS NULL AND source_label IS NOT NULL
     DO UPDATE SET
       source_kind         = EXCLUDED.source_kind,
       grade_level         = EXCLUDED.grade_level,
       curriculum_topic_id = EXCLUDED.curriculum_topic_id,
       question_type       = EXCLUDED.question_type,
       difficulty          = EXCLUDED.difficulty,
       representation_type = EXCLUDED.representation_type,
       license             = EXCLUDED.license,
       prompt_markdown     = EXCLUDED.prompt_markdown,
       answer_markdown     = EXCLUDED.answer_markdown,
       verification_item   = EXCLUDED.verification_item,
       rubric_json         = EXCLUDED.rubric_json,
       metadata            = EXCLUDED.metadata,
       updated_at          = now()
     RETURNING id, grade_level, curriculum_topic_id, question_type, difficulty, representation_type,
               license, metadata, created_at, xmax::text`,
    [
      asUuidOrNull(input.sourceArtifactId),
      input.sourceKind,
      input.sourceLabel,
      input.grade,
      input.curriculumTopicId ?? null,
      input.questionType,
      input.difficulty ?? null,
      input.representationType ?? null,
      input.provenance.license,
      input.promptMarkdown,
      input.answerMarkdown ?? null,
      input.verificationItem ? JSON.stringify(input.verificationItem) : null,
      input.rubric ? JSON.stringify(input.rubric) : null,
      JSON.stringify(metadata),
    ],
  );

  const row = result.rows[0]!;
  // Postgres trick: on a fresh INSERT xmax is '0'; on UPDATE it is non-zero.
  const action: UpsertResult['action'] = row.xmax === '0' ? 'inserted' : 'updated';

  // Refresh tags: delete existing, insert current set. Cheap because per-item
  // tag counts are tiny and this keeps the catalog tag list in sync with seed.
  await db.query(
    `DELETE FROM question_bank_tags WHERE question_id = $1::uuid`,
    [row.id],
  );
  const tags = normalizeTags(input.tags ?? []);
  for (const tag of tags) {
    await db.query(
      `INSERT INTO question_bank_tags (question_id, tag) VALUES ($1::uuid, $2) ON CONFLICT DO NOTHING`,
      [row.id, tag],
    );
  }

  return { summary: rowToSummary(row, tags), action };
}

export interface ListQuestionBankFilters {
  grade?: GradeLevel;
  questionType?: QuestionBankItemSummary['questionType'];
  difficulty?: QuestionBankItemSummary['difficulty'];
  license?: QuestionLicense;
  curriculumTopicId?: string;
  teacherId?: string;
  limit?: number;
}

export async function listQuestionBankItems(
  db: Queryable,
  filters: ListQuestionBankFilters = {},
): Promise<QuestionBankItemSummary[]> {
  const where: string[] = [];
  const params: unknown[] = [];
  const push = (clause: string, value: unknown): void => {
    params.push(value);
    where.push(clause.replace('?', `$${params.length}`));
  };

  if (filters.grade) push('grade_level = ?', filters.grade);
  if (filters.questionType) push('question_type = ?', filters.questionType);
  if (filters.difficulty) push('difficulty = ?', filters.difficulty);
  if (filters.license) push('license = ?', filters.license);
  if (filters.curriculumTopicId) push('curriculum_topic_id = ?', filters.curriculumTopicId);
  if (filters.teacherId) push('teacher_id = ?', filters.teacherId);

  const limit = Math.max(1, Math.min(filters.limit ?? 100, 500));
  const sql = `
    SELECT id, grade_level, curriculum_topic_id, question_type, difficulty,
           representation_type, license, metadata, created_at
    FROM question_bank_items
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
  const result = await db.query<QuestionRow>(sql, params);
  const ids = result.rows.map(r => r.id);
  const tagMap = await loadTagsFor(db, ids);
  return result.rows.map(row => rowToSummary(row, tagMap.get(row.id) ?? []));
}

export async function loadQuestionBankItem(
  db: Queryable,
  id: string,
): Promise<QuestionBankItemFull | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const result = await db.query<FullQuestionRow>(
    `SELECT id, teacher_id, source_kind, source_label, grade_level, curriculum_topic_id,
            question_type, difficulty, representation_type, license, prompt_markdown,
            answer_markdown, verification_item, rubric_json, metadata, created_at
       FROM question_bank_items WHERE id = $1::uuid`,
    [id],
  );
  const row = result.rows[0];
  if (!row) return null;
  const tagMap = await loadTagsFor(db, [row.id]);
  return rowToFull(row, tagMap.get(row.id) ?? []);
}

async function loadTagsFor(db: Queryable, ids: string[]): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (ids.length === 0) return map;
  const result = await db.query<{ question_id: string; tag: string }>(
    `SELECT question_id, tag FROM question_bank_tags
      WHERE question_id = ANY($1::uuid[]) ORDER BY tag`,
    [ids],
  );
  for (const { question_id, tag } of result.rows) {
    const list = map.get(question_id) ?? [];
    list.push(tag);
    map.set(question_id, list);
  }
  return map;
}

export function normalizeTags(tags: string[]): string[] {
  return Array.from(new Set(
    tags
      .map(tag => tag.trim())
      .filter(Boolean),
  )).sort((a, b) => a.localeCompare(b, 'he'));
}

function mergeProvenance(
  metadata: Record<string, unknown> | undefined,
  provenance: QuestionProvenance,
): Record<string, unknown> {
  return { ...(metadata ?? {}), provenance };
}

function parseMetadata(value: QuestionRow['metadata']): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }
  return value;
}

function rowToSummary(row: QuestionRow, tags: string[]): QuestionBankItemSummary {
  const metadata = parseMetadata(row.metadata);
  const provenance = (metadata.provenance as QuestionProvenance | undefined) ?? null;
  return {
    id: row.id,
    grade: row.grade_level,
    ...(row.curriculum_topic_id ? { curriculumTopicId: row.curriculum_topic_id } : {}),
    questionType: row.question_type,
    ...(row.difficulty ? { difficulty: row.difficulty } : {}),
    ...(row.representation_type ? { representationType: row.representation_type } : {}),
    license: row.license,
    sourceTitle: provenance?.sourceTitle ?? '',
    tags,
    createdAt: toIso(row.created_at),
  };
}

function rowToFull(row: FullQuestionRow, tags: string[]): QuestionBankItemFull {
  const metadata = parseMetadata(row.metadata);
  const provenance = (metadata.provenance as QuestionProvenance | undefined) ?? null;
  const summary = rowToSummary(row, tags);
  const verification = parseJsonish(row.verification_item) as VerificationItem | null;
  const rubric = parseJsonish(row.rubric_json);
  return {
    ...summary,
    teacherId: row.teacher_id,
    sourceKind: row.source_kind,
    sourceLabel: row.source_label,
    promptMarkdown: row.prompt_markdown,
    answerMarkdown: row.answer_markdown,
    verificationItem: verification,
    rubric,
    // provenance is guaranteed at insert time; the row constraint enforces it
    // for non-'unknown' licenses, so a non-null assertion is acceptable here.
    provenance: provenance!,
    metadata,
  };
}

function parseJsonish(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return value;
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
