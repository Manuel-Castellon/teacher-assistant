-- Generated artifact persistence + MVP3 question-bank seed schema.
-- Apply after 2026-05-15-class-progress-persistence.sql:
--
--   psql "$DATABASE_URL" -f db/migrations/2026-05-16-generated-artifacts-question-bank.sql

BEGIN;

ALTER TABLE lesson_plans
  DROP CONSTRAINT IF EXISTS lesson_plans_generated_by_check;

ALTER TABLE lesson_plans
  ADD CONSTRAINT lesson_plans_generated_by_check
  CHECK (generated_by IN ('claude-api','codex-cli','teacher'));

CREATE TABLE IF NOT EXISTS generated_artifacts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id            TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind                  TEXT NOT NULL CHECK (kind IN ('lesson_plan','exam','rubric')),
  title                 TEXT NOT NULL,
  grade_level           grade_level,
  class_id              UUID REFERENCES classes(id) ON DELETE SET NULL,
  curriculum_topic_id   TEXT,
  source_artifact_id    UUID REFERENCES generated_artifacts(id) ON DELETE SET NULL,
  payload               JSONB NOT NULL,
  markdown              TEXT,
  metadata              JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS generated_artifacts_teacher_idx
  ON generated_artifacts(teacher_id, created_at DESC);
CREATE INDEX IF NOT EXISTS generated_artifacts_kind_idx
  ON generated_artifacts(kind, created_at DESC);
CREATE INDEX IF NOT EXISTS generated_artifacts_class_idx
  ON generated_artifacts(class_id, created_at DESC);
CREATE INDEX IF NOT EXISTS generated_artifacts_curriculum_topic_idx
  ON generated_artifacts(curriculum_topic_id);

CREATE TABLE IF NOT EXISTS question_bank_items (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id            TEXT REFERENCES users(id) ON DELETE CASCADE,
  source_artifact_id    UUID REFERENCES generated_artifacts(id) ON DELETE SET NULL,
  source_kind           TEXT NOT NULL CHECK (source_kind IN ('generated_exam','generated_lesson','manual','bagrut_archive','teacher_provided')),
  source_label          TEXT,
  grade_level           grade_level NOT NULL,
  curriculum_topic_id   TEXT,
  question_type         TEXT NOT NULL CHECK (question_type IN ('חישובי','בעיה_מילולית','הוכחה','קריאה_וניתוח','מעורב')),
  difficulty            TEXT CHECK (difficulty IN ('בסיסי','בינוני','מתקדם','אתגר')),
  representation_type   TEXT CHECK (representation_type IN ('טקסט','גרף','טבלה','שרטוט','ציר_מספרים','מעורב')),
  prompt_markdown       TEXT NOT NULL,
  answer_markdown       TEXT,
  verification_item     JSONB,
  rubric_json           JSONB,
  metadata              JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS question_bank_tags (
  question_id   UUID NOT NULL REFERENCES question_bank_items(id) ON DELETE CASCADE,
  tag           TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (question_id, tag)
);

CREATE INDEX IF NOT EXISTS question_bank_items_teacher_idx
  ON question_bank_items(teacher_id, created_at DESC);
CREATE INDEX IF NOT EXISTS question_bank_items_topic_idx
  ON question_bank_items(curriculum_topic_id);
CREATE INDEX IF NOT EXISTS question_bank_items_grade_type_idx
  ON question_bank_items(grade_level, question_type);
CREATE INDEX IF NOT EXISTS question_bank_tags_tag_idx
  ON question_bank_tags(tag);

DROP TRIGGER IF EXISTS generated_artifacts_updated_at ON generated_artifacts;
CREATE TRIGGER generated_artifacts_updated_at BEFORE UPDATE ON generated_artifacts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS question_bank_items_updated_at ON question_bank_items;
CREATE TRIGGER question_bank_items_updated_at BEFORE UPDATE ON question_bank_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
