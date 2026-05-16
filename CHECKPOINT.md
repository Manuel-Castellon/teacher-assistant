# CHECKPOINT.md

## Last completed
- 2026-05-16 — Highest-value follow-up batch:
  - `/lesson-plan` worksheet math verification: generated worksheet exercises can now carry a structured `verificationItem`; the API runs SymPy over deterministic worksheet items and returns `worksheetVerification`. The UI shows verified/failed/skipped counts and warns when worksheet math needs manual review. Prompt version bumped to `lp-v0.3.4-mvp1` and now tells models to create one ExerciseRef per printed worksheet exercise rather than duplicating a full worksheet plus repeated sub-items.
  - Wolfram key was considered for this path. Decision: keep SymPy as default because it is offline, deterministic, and already uses structured expressions; use Wolfram later only as a non-blocking fallback for SymPy parser/modeling gaps.
  - Added Postgres-backed generated artifact persistence foundation: `generated_artifacts` table, `src/artifacts/serverStore.ts`, `GET /api/artifacts`, and signed-in save hooks for generated lesson plans, exams, and rubrics. Generation remains non-blocking if DB persistence fails.
  - Added MVP3 question-bank schema/tagging stub: `question_bank_items`, `question_bank_tags`, `src/questionBank/types.ts`, and `src/questionBank/serverStore.ts`.
  - Added Node migration runner `npm run db:migrate` for shells without `psql`.
  - Updated migrations: `2026-05-15-class-progress-persistence.sql` now includes the `skipped` progress status; new `2026-05-16-generated-artifacts-question-bank.sql` adds generated artifacts and question-bank tables.
  - Live smoke: `/lesson-plan` real generation produced a worksheet with 3/3 SymPy-verified worksheet items. `/exam` real generation produced an exam with 2/2 verified items and deterministic rubric `rubric-20260516-194359-fd56d9`; `/api/rubrics/<id>` and `/rubrics?rubric=<id>` returned 200.
  - UI smoke: Playwright MCP could not be used because the MCP browser transport stayed closed after clearing an old locked profile (`Transport closed`). A local Playwright browser smoke was used only where practical: `/exam` UI passed with generated exam, `מחוון נוצר`, `אימות מתמטי: 2/2 תקינים`, download buttons visible, and no console warnings/errors. `/lesson-plan` UI smoke was started but interrupted before completion; API-level lesson-plan worksheet verification had already passed.
  - DB migration attempt: `npm run db:migrate` ran, but this machine still has no `DATABASE_URL` in the environment or `.env.local`, so signed-in DB persistence could not be exercised end-to-end.

- Quality gates for this batch:
  - `npm run type-check` passed.
  - `npm run test:lesson-plan` passed: 74 tests.
  - `npm run test:artifacts` passed: 5 tests.

- Remaining concrete blockers:
  - Add a real `DATABASE_URL` and run `npm run db:migrate`, then smoke signed-in `/curriculum` → `/lesson-plan` → post-lesson update → `/exam`.
  - Re-run true Playwright MCP for `/lesson-plan` UI once the MCP transport is healthy.
  - Decide whether to keep or remove smoke-generated rubric artifacts after manual review.

- 2026-05-16 — Smoke-test fixes from `Smoke tests results.txt`:
  - `/curriculum`: notes preserve typed spacing; added first-class `skipped` status (`מדולג כרגע`) in `src/curriculumProgress/progress.ts`, UI, tests, and DB CHECK constraint. Skipped topics are not completed/exam-ready and warn if selected for an exam.
  - `/curriculum` ST-03: kept both grade-8 entries because the raw source contains both `מערכת משוואות בשני נעלמים` and `מערכת משוואות ושאלות מילוליות`. Added expandable `יעדי למידה` visibility per topic; the later repeated entry currently shows zero extracted objectives rather than being merged/deleted.
  - `/exam`: date field is now `type="date"` with generated output still formatted as `dd.mm.yy`; saved older dotted dates are normalized when reopened.
  - `/exam`: multi-line sub-questions render as separate paragraphs. Generated diagrams can use `diagramSvg`, embedded as a printable data-image in markdown/preview/export while keeping `diagramDescription` as fallback text.
  - SymPy verifier: `scripts/verify-math.py` safely parses generated list/dict expressions and verifies two-variable systems like `[Eq(5*x + 3*y, 29), Eq(3*x + 2*y, 18)]` with expected `{x: 4, y: 3}`.
  - `/lesson-plan`: generation response includes `worksheetMarkdown` when the independent-work phase signals a worksheet; UI offers separate worksheet DOCX/PDF downloads so student handouts are separate from the teacher plan.
  - Claude CLI backend: changed from passing the huge prompt as a `-p` argument to piping prompt through stdin via `claude -p --output-format text`; quota/rate-limit stderr is labeled clearly. User manually confirmed the smoke failure also involved quota, so this is a reliability/error-clarity fix, not a claim that quota was false.
- Quality gates for smoke fixes:
  - `npm run type-check` passed.
  - `npm run build` passed.
  - `npm run test:lesson-plan` passed.
  - `npm run test:progress` passed.
  - Exam-focused tests passed: `src/exam/renderExam.test.ts`, `src/exam/examPrompt.test.ts`, `src/providers/impl/SympyMathVerifier.test.ts`, `src/exam/ExamGenerator.test.ts`.
  - Direct SymPy smoke for the reported two-variable system passed: computed `x=4, y=3`.
  - Playwright smoke checked `/exam`, `/curriculum`, and `/lesson-plan`; dev server was stopped afterward.

## Previous completed
- MVP 2 — auto-rubric on exam generation:
  - `src/examRubric/buildRubricFromExam.ts` — deterministic mapper from `GeneratedExam` + `ExamRequest` → `ExamRubric`. Splits parent points evenly across sub-questions; criteria split 70/30 (פתרון מסודר ונכון / תשובה סופית נכונה). Falls back to part title when the request lacks a topic. 8 focused tests including the `splitPoints` helper.
  - `src/examRubric/saveRubric.ts` — `generateRubricId({ now, randomSuffix })` produces UTC timestamp slugs (`rubric-YYYYMMDD-HHMMSS-<hex>`); `saveExamRubric(rubric, { baseDir })` writes JSON under `data/exam-rubrics/` with a safe-id guard. 4 tests.
  - `src/examRubric/aiRubricGenerator.ts` — prompt version `rubric-v0.1`. Sends the deterministic base + exam markdown + answer key markdown to a `CompletionFn`, parses JSON, then reconciles against the base so the model cannot tamper with id/title/totalPoints/labels/sub-question maxPoints. When AI criteria sum != sub-question maxPoints, that sub falls back to deterministic criteria; expectedAnswer falls back when blank; acceptedAlternatives/commonMistakes are added when valid strings. 5 tests including markdown fence stripping, schema-drift fallback, and identity-field tampering.
  - `POST /api/exam/generate` accepts `rubricMode: 'deterministic' | 'ai' | 'none'` (default deterministic). Builds the deterministic base; if AI mode is selected, tries to enrich and falls back to the base on any error with a `rubricWarning` string. Saves the chosen rubric and returns `{ rubricId, rubricMode, rubricWarning }` alongside the exam.
  - `/exam` UI: new "מחוון" `<select>` (אוטומטי מהיר / מפורט AI / ללא). After generation, a panel surfaces "מחוון נוצר" with a deep link to `/rubrics?rubric=<id>` and shows any AI fallback warning.
  - `/rubrics` page reads `?rubric=<id>` from the URL on mount and preselects that rubric instead of the first one.
  - `package.json` — `test:rubrics` now runs the full 27-test rubric suite.
- Quality gates:
  - `npm run type-check` passed.
  - `npm run test:rubrics` passed: 27 tests (2 renderRubric + 4 loadRubrics + 8 buildRubricFromExam + 4 saveRubric + 5 aiRubricGenerator + 4 route).
  - `npm run test:signoff` passed: type-check + 67 lesson-plan + 20 progress + 27 rubric + MVP1 2/2 + MVP2 4/4 evals.
  - `npm run build` passed; routes unchanged.

## Next
- Options when resuming:
  - Live smoke `/exam` → generate → confirm `data/exam-rubrics/rubric-...json` appears and the deep link selects it on `/rubrics`. (Needs a backend with valid keys / claude CLI installed.)
  - Wire the AI-mode failure path to a real model (currently exercised via the fake completion fn).
  - Persist rubrics to Postgres alongside saved exams (currently filesystem only — per session decision).
  - Open a PR for `mvp-4-post-lesson-flow` (now also carries rubric UI + auto-rubric work).
  - Move on to MVP 1 LLM-judge rubric, MVP 3 question-bank schema + tagging stub, or MVP 4 subtopic-level progress.
- Real-class signed-in loop and DB migration remain tabled until a usable local Postgres path exists.

## Key files added/changed
- New: `src/examRubric/buildRubricFromExam.ts` + test, `src/examRubric/saveRubric.ts` + test, `src/examRubric/aiRubricGenerator.ts` + test.
- Modified: `src/app/api/exam/generate/route.ts` (rubricMode wiring + `persistRubric` helper).
- Modified: `src/app/exam/page.tsx` (rubric mode select, response type, result-panel link).
- Modified: `src/app/rubrics/page.tsx` (`?rubric=<id>` deep link).
- Modified: `package.json` (extended `test:rubrics`).
- Docs: `PROGRESS.md`, `MVP_STATUS.md` folded in.
