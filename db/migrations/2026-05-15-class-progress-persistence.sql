-- MVP 4 class-progress persistence migration.
-- Apply to an existing local DB that was created before class progress became
-- auth-gated/server-backed:
--
--   psql "$DATABASE_URL" -f db/migrations/2026-05-15-class-progress-persistence.sql

BEGIN;

ALTER TABLE classes
  ADD COLUMN IF NOT EXISTS teacher_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Existing pre-MVP4 classes cannot be safely assigned to a teacher. Local dev
-- data should be recreated through the app after sign-in.
DELETE FROM teacher_progress
WHERE class_id IN (SELECT id FROM classes WHERE teacher_id IS NULL);

DELETE FROM students
WHERE class_id IN (SELECT id FROM classes WHERE teacher_id IS NULL);

DELETE FROM classes
WHERE teacher_id IS NULL;

ALTER TABLE classes
  ALTER COLUMN teacher_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS classes_teacher_idx ON classes(teacher_id);

ALTER TABLE teacher_progress
  DROP CONSTRAINT IF EXISTS teacher_progress_status_check;

ALTER TABLE teacher_progress
  ADD CONSTRAINT teacher_progress_status_check
  CHECK (status IN ('not_started','in_progress','completed','needs_review'));

ALTER TABLE teacher_progress
  DROP CONSTRAINT IF EXISTS teacher_progress_curriculum_unit_id_fkey,
  DROP CONSTRAINT IF EXISTS teacher_progress_topic_id_fkey;

CREATE UNIQUE INDEX IF NOT EXISTS teacher_progress_class_topic_unique_idx
  ON teacher_progress(class_id, topic_id);

DROP TRIGGER IF EXISTS classes_updated_at ON classes;

CREATE TRIGGER classes_updated_at BEFORE UPDATE ON classes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
