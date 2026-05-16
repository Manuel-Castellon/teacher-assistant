import type { Queryable } from '../curriculumProgress/serverStore';
import { asUuidOrNull } from '../artifacts/serverStore';
import type { QuestionBankItemInput, QuestionBankItemSummary } from './types';
import type { GradeLevel } from '../types/shared';

interface QuestionRow extends Record<string, unknown> {
  id: string;
  grade_level: GradeLevel;
  curriculum_topic_id: string | null;
  question_type: QuestionBankItemSummary['questionType'];
  difficulty: QuestionBankItemSummary['difficulty'] | null;
  representation_type: QuestionBankItemSummary['representationType'] | null;
  created_at: Date | string;
}

export async function saveQuestionBankItem(
  db: Queryable,
  input: QuestionBankItemInput,
): Promise<QuestionBankItemSummary> {
  const inserted = await db.query<QuestionRow>(
    `INSERT INTO question_bank_items
      (teacher_id, source_artifact_id, source_kind, source_label, grade_level, curriculum_topic_id,
       question_type, difficulty, representation_type, prompt_markdown, answer_markdown,
       verification_item, rubric_json, metadata)
     VALUES ($1, $2::uuid, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13::jsonb, $14::jsonb)
     RETURNING id, grade_level, curriculum_topic_id, question_type, difficulty, representation_type, created_at`,
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
      input.promptMarkdown,
      input.answerMarkdown ?? null,
      input.verificationItem ? JSON.stringify(input.verificationItem) : null,
      input.rubric ? JSON.stringify(input.rubric) : null,
      JSON.stringify(input.metadata ?? {}),
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

export function normalizeTags(tags: string[]): string[] {
  return Array.from(new Set(
    tags
      .map(tag => tag.trim())
      .filter(Boolean),
  )).sort((a, b) => a.localeCompare(b, 'he'));
}

function rowToSummary(row: QuestionRow, tags: string[]): QuestionBankItemSummary {
  return {
    id: row.id,
    grade: row.grade_level,
    ...(row.curriculum_topic_id ? { curriculumTopicId: row.curriculum_topic_id } : {}),
    questionType: row.question_type,
    ...(row.difficulty ? { difficulty: row.difficulty } : {}),
    ...(row.representation_type ? { representationType: row.representation_type } : {}),
    tags,
    createdAt: toIso(row.created_at),
  };
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
