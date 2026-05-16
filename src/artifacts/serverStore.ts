import type { Queryable } from '../curriculumProgress/serverStore';
import type { GeneratedArtifactInput, GeneratedArtifactSummary } from './types';
import type { GradeLevel } from '../types/shared';

interface ArtifactRow extends Record<string, unknown> {
  id: string;
  kind: GeneratedArtifactSummary['kind'];
  title: string;
  grade_level: GradeLevel | null;
  class_id: string | null;
  curriculum_topic_id: string | null;
  source_artifact_id: string | null;
  metadata: Record<string, unknown> | string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export async function saveGeneratedArtifact(
  db: Queryable,
  input: GeneratedArtifactInput,
): Promise<GeneratedArtifactSummary> {
  const row = await db.query<ArtifactRow>(
    `INSERT INTO generated_artifacts
      (teacher_id, kind, title, grade_level, class_id, curriculum_topic_id, source_artifact_id, payload, markdown, metadata)
     VALUES ($1, $2, $3, $4, $5::uuid, $6, $7::uuid, $8::jsonb, $9, $10::jsonb)
     RETURNING id, kind, title, grade_level, class_id, curriculum_topic_id, source_artifact_id, metadata, created_at, updated_at`,
    [
      input.teacherId,
      input.kind,
      input.title,
      input.grade ?? null,
      asUuidOrNull(input.classId),
      input.curriculumTopicId ?? null,
      asUuidOrNull(input.sourceArtifactId),
      JSON.stringify(input.payload),
      input.markdown ?? null,
      JSON.stringify(input.metadata ?? {}),
    ],
  );
  return rowToSummary(row.rows[0]!);
}

export async function listGeneratedArtifacts(
  db: Queryable,
  teacherId: string,
  opts: { kind?: GeneratedArtifactSummary['kind']; limit?: number } = {},
): Promise<GeneratedArtifactSummary[]> {
  const limit = Math.min(Math.max(opts.limit ?? 20, 1), 100);
  const params: unknown[] = [teacherId, limit];
  const kindClause = opts.kind ? 'AND kind = $3' : '';
  if (opts.kind) params.push(opts.kind);

  const rows = await db.query<ArtifactRow>(
    `SELECT id, kind, title, grade_level, class_id, curriculum_topic_id, source_artifact_id, metadata, created_at, updated_at
       FROM generated_artifacts
      WHERE teacher_id = $1
        ${kindClause}
      ORDER BY created_at DESC
      LIMIT $2`,
    params,
  );
  return rows.rows.map(rowToSummary);
}

export function asUuidOrNull(value: string | undefined): string | null {
  if (!value) return null;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : null;
}

function rowToSummary(row: ArtifactRow): GeneratedArtifactSummary {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    ...(row.grade_level ? { grade: row.grade_level } : {}),
    ...(row.class_id ? { classId: row.class_id } : {}),
    ...(row.curriculum_topic_id ? { curriculumTopicId: row.curriculum_topic_id } : {}),
    ...(row.source_artifact_id ? { sourceArtifactId: row.source_artifact_id } : {}),
    metadata: parseMetadata(row.metadata),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

function parseMetadata(value: Record<string, unknown> | string | null): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === 'string') return JSON.parse(value) as Record<string, unknown>;
  return value;
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
