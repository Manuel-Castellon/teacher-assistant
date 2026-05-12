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
| `classes`, `students` | (skeletal — auth/user model TBD) |

Hebrew enum values stored verbatim (e.g. `'הושלם'`, `'תיכון'`) so the SQL layer matches the TS layer 1:1.

## Open decisions

- **PG client / ORM**: not chosen. Candidates: raw `pg`, `postgres.js`, Drizzle, Prisma. Driven by the auth provider decision (Service Decision #6) — Auth.js / Clerk both have preferred PG adapters. Defer until #6 lands.
- **Migrations**: deferred until the client decision. For now, drop & recreate.
- **Curriculum seeding**: a seed script will read `data/curriculum/*.json` and `INSERT` into the curriculum tables. Not written yet — will land with the first MVP that actually needs DB-backed curriculum reads (likely MVP 4, the curriculum tracker). MVP 1 can read JSON directly.
