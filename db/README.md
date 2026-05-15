# Database — PostgreSQL 18

## Apply schema

```
psql "$DATABASE_URL" -f db/schema.sql
```

`schema.sql` is idempotent only at the cluster level: it `CREATE TABLE`s without `IF NOT EXISTS`, so running it twice fails. Drop and re-apply during MVP 0; we'll switch to a migration tool once a PG client is chosen.

## What's in the schema

Mirrors `src/types/`:

| Table | TS interface |
|-------|--------------|
| `curriculum_units` | `CurriculumUnit` |
| `curriculum_topics` | `CurriculumTopic` |
| `curriculum_sub_topics` | `CurriculumSubTopic` |
| `teacher_progress` | `TeacherProgress` |
| `lesson_plans` | `LessonPlan` |
| `student_grade_records` | `StudentGradeRecord` |
| `exam_results` | `ExamResult` (+ `matkona` lives here with `is_matkona = true`) |
| `sub_questions` | `SubQuestion` |
| `bonus_tasks` | `BonusTask` |
| `classes`, `students` | Class/student records; `classes.teacher_id` owns MVP4 class progress |

Most Hebrew domain values are stored verbatim where the TS model does the same. MVP4 `teacher_progress.status` uses stable app keys (`not_started`, `in_progress`, `completed`, `needs_review`) because the UI renders Hebrew labels separately.

## Local migrations

For an existing local database created before MVP4 class progress persistence:

```
psql "$DATABASE_URL" -f db/migrations/2026-05-15-class-progress-persistence.sql
```

That migration adds `classes.teacher_id`, `classes.updated_at`, the `needs_review` progress state, and the class/topic uniqueness needed by `/api/curriculum/classes`.

## Open decisions

- **PG client / ORM**: not chosen. Candidates: raw `pg`, `postgres.js`, Drizzle, Prisma. Driven by the auth provider decision (Service Decision #6) — Auth.js / Clerk both have preferred PG adapters. Defer until #6 lands.
- **Migrations**: still intentionally lightweight. MVP4 added a one-off SQL migration; adopt a real migration tool before production use.
- **Curriculum seeding**: a seed script will read `data/curriculum/*.json` and `INSERT` into the curriculum tables. Not written yet — will land with the first MVP that actually needs DB-backed curriculum reads (likely MVP 4, the curriculum tracker). MVP 1 can read JSON directly.
