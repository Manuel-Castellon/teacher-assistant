-- MVP3 question-bank provenance enforcement.
-- Adds top-level `license` column and a CHECK that ties licensed rows to a
-- non-empty provenance.sourceTitle/license inside metadata. The app layer is
-- the primary gatekeeper; this constraint protects against ad-hoc inserts.
--
-- Apply after 2026-05-16-generated-artifacts-question-bank.sql:
--
--   psql "$DATABASE_URL" -f db/migrations/2026-05-17-question-bank-provenance.sql

BEGIN;

ALTER TABLE question_bank_items
  ADD COLUMN IF NOT EXISTS license TEXT NOT NULL DEFAULT 'unknown'
    CHECK (license IN (
      'ministry-public',
      'teacher-original',
      'open-license',
      'public-domain',
      'copyrighted-personal-use',
      'student-submitted',
      'unknown'
    ));

ALTER TABLE question_bank_items
  ALTER COLUMN license DROP DEFAULT;

CREATE INDEX IF NOT EXISTS question_bank_items_license_idx
  ON question_bank_items(license);

-- license='unknown' is permitted for legacy/in-flight rows; every licensed
-- row must carry a provenance object whose license matches the column.
ALTER TABLE question_bank_items
  DROP CONSTRAINT IF EXISTS question_bank_items_provenance_required;

ALTER TABLE question_bank_items
  ADD CONSTRAINT question_bank_items_provenance_required
  CHECK (
    license = 'unknown'
    OR (
      jsonb_typeof(metadata->'provenance') = 'object'
      AND jsonb_typeof(metadata->'provenance'->'sourceTitle') = 'string'
      AND length(metadata->'provenance'->>'sourceTitle') > 0
      AND jsonb_typeof(metadata->'provenance'->'license') = 'string'
      AND metadata->'provenance'->>'license' = license
      AND jsonb_typeof(metadata->'provenance'->'ingestedAt') = 'string'
    )
  );

-- Idempotent seed ingest: source_label is the natural key for shared catalog
-- items (teacher_id IS NULL). Per-teacher items don't participate in dedup.
CREATE UNIQUE INDEX IF NOT EXISTS question_bank_items_catalog_source_label_unique
  ON question_bank_items(source_label)
  WHERE teacher_id IS NULL AND source_label IS NOT NULL;

COMMIT;
