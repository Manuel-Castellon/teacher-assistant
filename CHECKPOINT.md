# CHECKPOINT.md

## Last completed
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
