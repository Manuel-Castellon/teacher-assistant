-- PostgreSQL 18 schema for Math Teacher AI Assistant.
-- Mirrors the TypeScript data models in src/types/.
-- Apply: psql "$DATABASE_URL" -f db/schema.sql
--
-- Conventions:
--   - Curriculum entities use TEXT primary keys (stable Ministry-derived slugs).
--   - User-generated entities (lesson plans, exam results) use UUID v4 from
--     gen_random_uuid() (built-in since PG 13; no extension needed).
--   - Hebrew text columns are TEXT (UTF-8 is the cluster default).
--   - Enum-like fields use CHECK constraints over TEXT — cheaper to extend
--     than CREATE TYPE / ALTER TYPE.
--   - Nested object fields (lesson phases, grade calculation result) live in
--     JSONB; we don't query their internals so a relational explode is overkill.
--   - All timestamps are TIMESTAMPTZ.
--
-- Picking a PG client / ORM is a separate Service Decision (#? — TBD); this
-- file is schema-only and assumes raw psql application.

BEGIN;

-- ── Reference: education stage / grade / unit level ────────────────────────
-- Mirrors src/types/shared.ts. Hebrew codes are stored verbatim so the SQL
-- layer matches the TS layer 1:1.

CREATE DOMAIN education_stage AS TEXT
  CHECK (VALUE IN ('חטיבת_ביניים', 'תיכון'));

CREATE DOMAIN grade_level AS TEXT
  CHECK (VALUE IN ('זי','חי','טי','יי','יאי','יבי'));

CREATE DOMAIN unit_level AS SMALLINT
  CHECK (VALUE IN (3, 4, 5));

-- ── Auth (NextAuth v5 / @auth/pg-adapter) ─────────────────────────────────
-- Column names match @auth/pg-adapter exactly (camelCase via quoted identifiers).
-- Schema derived from node_modules/@auth/pg-adapter/src/index.ts.
-- allowDangerousEmailAccountLinking is set on the Google provider so the same
-- user record is reused regardless of which sign-in method they used first.

CREATE TABLE users (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name            TEXT,
  email           TEXT NOT NULL UNIQUE,
  "emailVerified" TIMESTAMPTZ,
  image           TEXT
);

CREATE TABLE accounts (
  id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId"            TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider            TEXT NOT NULL,
  type                TEXT NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  access_token        TEXT,
  expires_at          BIGINT,
  refresh_token       TEXT,
  id_token            TEXT,
  scope               TEXT,
  session_state       TEXT,
  token_type          TEXT,
  UNIQUE (provider, "providerAccountId")
);

CREATE TABLE sessions (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId"        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires         TIMESTAMPTZ NOT NULL,
  "sessionToken"  TEXT NOT NULL UNIQUE
);

CREATE TABLE verification_token (
  identifier  TEXT NOT NULL,
  expires     TIMESTAMPTZ NOT NULL,
  token       TEXT NOT NULL,
  PRIMARY KEY (identifier, token)
);

-- ── Curriculum (mirror of the JSON under data/curriculum/) ─────────────────

CREATE TABLE curriculum_units (
  id              TEXT PRIMARY KEY,                -- e.g. 'hs-5units-year10-tashpav'
  stage           education_stage NOT NULL,
  unit_level      unit_level,                      -- only for תיכון
  grade_level     grade_level NOT NULL,
  academic_year   TEXT NOT NULL,                   -- e.g. 'תשפ"ו'
  source_url      TEXT NOT NULL,
  parsed_at       DATE NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE curriculum_topics (
  id                  TEXT PRIMARY KEY,            -- e.g. 'intro-analytic-geometry' or 'ms-grade7-t01'
  unit_id             TEXT NOT NULL REFERENCES curriculum_units(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,               -- Hebrew
  name_en             TEXT,
  recommended_hours   INTEGER NOT NULL CHECK (recommended_hours >= 0),
  grade_levels        grade_level[] NOT NULL,
  unit_levels         unit_level[] NOT NULL,       -- empty array for middle-school
  is_bagrut_topic     BOOLEAN NOT NULL,
  prerequisites       TEXT[] NOT NULL DEFAULT '{}',-- list of curriculum_topics.id
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX curriculum_topics_unit_idx ON curriculum_topics(unit_id);

CREATE TABLE curriculum_sub_topics (
  id                    TEXT PRIMARY KEY,          -- e.g. 'intro-analytic-geometry-content'
  parent_topic_id       TEXT NOT NULL REFERENCES curriculum_topics(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL,
  name_en               TEXT,
  learning_objectives   JSONB NOT NULL DEFAULT '[]'::jsonb,  -- string[]
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX curriculum_sub_topics_parent_idx ON curriculum_sub_topics(parent_topic_id);

-- ── Classes & students (skeletal — auth/user model TBD per Service Decision #6) ──

CREATE TABLE classes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,                   -- e.g. "כיתה ז' 3"
  grade_level     grade_level NOT NULL,
  unit_level      unit_level,                      -- only for high-school classes
  academic_year   TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE students (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name       TEXT NOT NULL,
  class_id        UUID REFERENCES classes(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX students_class_idx ON students(class_id);

-- ── Teacher progress (TeacherProgress) ─────────────────────────────────────

CREATE TABLE teacher_progress (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  curriculum_unit_id    TEXT NOT NULL REFERENCES curriculum_units(id),
  topic_id              TEXT NOT NULL REFERENCES curriculum_topics(id),
  sub_topic_id          TEXT REFERENCES curriculum_sub_topics(id),
  class_id              UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  status                TEXT NOT NULL CHECK (status IN ('לא_הותחל','בתהליך','הושלם')),
  hours_spent           NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (hours_spent >= 0),
  last_taught_date      DATE,
  notes                 TEXT,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX teacher_progress_class_topic_idx
  ON teacher_progress(class_id, topic_id);

-- ── Lesson plans (LessonPlan) ─────────────────────────────────────────────

CREATE TABLE lesson_plans (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic                   TEXT NOT NULL,           -- Hebrew
  sub_topic               TEXT NOT NULL,
  grade                   grade_level NOT NULL,
  duration_minutes        SMALLINT NOT NULL CHECK (duration_minutes IN (45, 90)),
  lesson_type             TEXT NOT NULL CHECK (lesson_type IN
    ('שגרה','חזרה_לבגרות','חזרה_למבחן','הקנייה','תרגול','מבחן')),
  textbook                JSONB,                   -- TextbookReference
  curriculum_topic_id     TEXT REFERENCES curriculum_topics(id),
  class_id                UUID REFERENCES classes(id) ON DELETE SET NULL,

  phases                  JSONB NOT NULL,          -- { opening, instruction?, practice, independentWork }
  homework                JSONB,                   -- ExerciseRef[] | null

  teacher_notes           TEXT,
  post_lesson_notes       TEXT,

  bagrut_review           JSONB,                   -- { studentSurveyTopic, exerciseSources[] }

  generated_by            TEXT NOT NULL CHECK (generated_by IN ('claude-api','teacher')),
  model_version           TEXT,
  prompt_version          TEXT,

  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX lesson_plans_class_idx ON lesson_plans(class_id);
CREATE INDEX lesson_plans_curriculum_topic_idx ON lesson_plans(curriculum_topic_id);

-- ── Grading (StudentGradeRecord, ExamResult, BonusTask, SubQuestion) ──────
--
-- Exams + sub-questions are relational (need per-topic queries for topicMastery).
-- Bonus tasks are relational (small, deterministic structure).
-- The computed GradeCalculationResult is recalculated on read; persisting it
-- is optional (JSONB column for caching).

CREATE TABLE student_grade_records (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id                  UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id                    UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  academic_year               TEXT NOT NULL,
  absence_days                INTEGER NOT NULL DEFAULT 0 CHECK (absence_days >= 0),
  absence_deduction_applied   BOOLEAN NOT NULL DEFAULT FALSE,
  computed                    JSONB,               -- GradeCalculationResult cache
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, academic_year)
);

CREATE TABLE exam_results (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grade_record_id     UUID NOT NULL REFERENCES student_grade_records(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,               -- e.g. 'מבחן 1'
  exam_date           DATE NOT NULL,
  max_score           INTEGER NOT NULL CHECK (max_score > 0),
  total_score         NUMERIC(5,2),                -- computed from sub_questions
  is_moad_meyuhad     BOOLEAN NOT NULL DEFAULT FALSE,
  replaces_exam_id    UUID REFERENCES exam_results(id),
  is_matkona          BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX exam_results_grade_record_idx ON exam_results(grade_record_id);

CREATE TABLE sub_questions (
  id              TEXT NOT NULL,                   -- e.g. '1א' — unique per exam, not globally
  exam_id         UUID NOT NULL REFERENCES exam_results(id) ON DELETE CASCADE,
  topic           TEXT NOT NULL,                   -- Hebrew
  max_points      NUMERIC(5,2) NOT NULL CHECK (max_points > 0),
  student_score   NUMERIC(5,2) CHECK (student_score IS NULL OR student_score >= 0),
  PRIMARY KEY (exam_id, id)
);

CREATE TABLE bonus_tasks (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grade_record_id     UUID NOT NULL REFERENCES student_grade_records(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  max_points          SMALLINT NOT NULL DEFAULT 10 CHECK (max_points = 10),  -- always 10 per BonusTask
  student_score       NUMERIC(5,2) CHECK (student_score IS NULL OR student_score >= 0),
  target_exam_id      UUID REFERENCES exam_results(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX bonus_tasks_grade_record_idx ON bonus_tasks(grade_record_id);

-- ── updated_at triggers ────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER lesson_plans_updated_at BEFORE UPDATE ON lesson_plans
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER teacher_progress_updated_at BEFORE UPDATE ON teacher_progress
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER student_grade_records_updated_at BEFORE UPDATE ON student_grade_records
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
