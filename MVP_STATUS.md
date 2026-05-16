# MVP Status Rundown

Last updated: 2026-05-16

Source of truth: `PROGRESS.md` and `CHECKPOINT.md`.

## MVP 0 — Foundation + Scaffold

Status: complete.

Done:
- Next.js/TypeScript/Postgres scaffold, tests, coverage gate, Hebrew RTL/font setup.
- Curriculum PDFs and parsed curriculum JSON for middle school and high-school 5 יח"ל.
- Auth.js with Google OAuth and PG adapter.
- Database schema and provider interfaces.

Missing:
- Nothing blocking. PG client/ORM refinement is deferred until it is needed.

## MVP 1 — Lesson Plan Generator

Status: in progress, but substantially usable and browser-smoked.

Done:
- `LessonPlan` schema and deterministic invariant validator.
- Claude-backed `ITextGenerator` implementation with fake-client tests.
- Eval harness and MVP1 fake deterministic evals.
- Lesson-plan curriculum grounding from local curriculum JSON.
- Reusable lesson-plan Markdown renderer.
- Generated/exported י"ב 5 יח"ל complex-numbers intro lesson plan: JSON, Markdown, DOCX, PDF.
- Local-only copyrighted resource guardrail for `data/resources/*`.
- `/lesson-plan` UI with explicit model selector and browser-local recent plans.
- `/lesson-plan` UI has a worksheet toggle for suitable lesson types and forces worksheets off for `מבחן`.
- Lesson-plan prompt/API path carries `includeWorksheet` and gives explicit worksheet/no-worksheet instructions to the model.
- Model choices: Gemini 2.5 Flash, Gemini 3 Flash Preview, Gemini 2.5 Pro, Claude CLI, GPT-5.5 (Codex).
- GPT-5.5 (Codex) browser exports approved by user as quality references:
  - `data/lesson-plans/generated/grade7-equations-common-denominator-90min-approved-gpt55.pdf`
  - `data/lesson-plans/generated/grade11-complex-algebra-90min-approved-gpt55.pdf`
- Teacher-facing renderer no longer leaks implementation metadata such as `מצב עבודה` or `זמן משוער`.

Missing:
- Rubric sign-off for LLM-judged lesson-plan quality.
- Live evals against real model output.
- Anthropic API can be re-exposed and smoked when an API key is available.

## MVP 2 — Exercise / Exam Creator + Verification

Status: complete for exam generation.

Done:
- Exam schema, prompt, renderer, answer key rendering.
- Gemini/Anthropic backend factory.
- SymPy math verifier for equations, inequalities, numeric checks, and proof passthrough.
- `/exam` UI and `/api/exam/generate`, `/api/exam/export`, `/api/exam/regenerate-question`.
- Curriculum grounding and grade/topic validation, including `אחר / פירוט חופשי`.
- Question type taxonomy: `חישובי`, `בעיה מילולית`, `הוכחה`, `קריאה וניתוח`, `מעורב`.
- Saved exam history, structured preview, one-question regeneration.
- DOCX export with RTL bidi post-processing.
- MVP2 deterministic eval suite and Playwright smoke coverage.
- Real exam rubric extraction infrastructure and May 2026 rubric exported as JSON/Markdown/DOCX/PDF. This has immediate MVP2 value because it attaches to generated/real exams, but the reusable criterion-level rubric model is mainly groundwork for MVP6 supervised grading.

Missing:
- OCR ingestion for scanned/student work is deferred.
- UI for browsing/exporting rubric artifacts is not built.
- PDF export exists via script, not via app route/UI.

## MVP 3 — Question Bank / Bagrut Archive

Status: not started.

Done:
- Some source notes exist for Bagrut/question-bank seeding.
- Exam/rubric data models now give useful shapes for future question-bank items.

Missing:
- Question bank schema and storage.
- Bagrut archive ingestion/parsing.
- Tagging by curriculum topic, grade, difficulty, representation type, and source.
- Search/reuse UI.
- Deduplication and copyright/source policy for imported questions.

## MVP 4 — Curriculum Tracker / Class Progress

Status: in progress; first interactive loop is usable.

Done:
- Static curriculum JSON exists.
- Exam and lesson-plan prompts can already use grade/topic curriculum context.
- `/curriculum` UI tracks class progress in browser-local storage.
- Authenticated `/api/curriculum/classes` persists class progress to Postgres.
- Browser-local storage remains cache/fallback for unauthenticated use.
- Per topic: status, actual hours, last-taught date, and teacher notes.
- Lesson-plan page can apply the tracker's next-topic suggestion as editable defaults.
- Lesson-plan suggestions include a deterministic editable `בקשת המורה`, and switching to `ללא הקשר כיתה` clears stale previous-lesson context.
- Lesson-plan result view can save post-lesson status, hours taught now, date, and actual notes back into class progress.
- Exam page can fill editable question specs from taught/review material.
- Exam page warns when a selected topic is not yet taught for the selected class, without blocking teacher override.

Missing:
- Apply/test the DB migration against the active local Postgres instance before relying on signed-in persistence.
- Subtopic-level progress.
- Richer continuity timeline from prior generated/taught lessons.
- Prompt-side use of class progress is currently passed through notes/context from the client, not loaded by generation APIs from `classId`.

## MVP 5 — Grade Tracker

Status: not started.

Done:
- Existing grading-related TypeScript interfaces and memory notes from the spreadsheet.
- Rubric artifacts create useful future grading units.

Missing:
- Gradebook schema/UI.
- Import from existing grade spreadsheets.
- Exam/task score entry and weighting.
- Student-level progress reports and analytics.
- Connection between generated exams/rubrics and recorded scores.

## MVP 6 — AI Grading, Supervised

Status: not started.

Done:
- `IGradingProvider` interface exists.
- Rubric model now supports criterion-level grading units; the מחוון work belongs here as MVP6 grading infrastructure, even though it was useful earlier for MVP2 exam artifacts.
- OCR remains identified as a prerequisite for scanned work.

Missing:
- OCR provider decision and tested OCR pipeline.
- Grading provider decision.
- Supervised grading UI where teacher reviews every suggested mark.
- Student work upload, answer segmentation, rubric alignment, feedback drafts.
- Audit trail for teacher overrides.

## Current Cross-Cutting State

Known broken: nothing.

Recent verification:
- `npm run type-check` passed.
- `npm run test:lesson-plan` is the focused lesson-plan sign-off command.
- `npm run test:progress` passed for the MVP4 helper logic.
- `npm run test:signoff` passed after the latest polish.
- `npm run build` passed.
- Latest worksheet/post-lesson sign-off: 67 lesson-plan tests, 9 progress/server-store tests, MVP1 2/2 evals, MVP2 4/4 evals.
- Playwright MCP worksheet smoke passed for toggle on/off and forced-off exam-day behavior.
- Playwright MCP closed-loop smoke passed for `/curriculum` -> `/lesson-plan` with worksheet -> post-lesson feedback -> `/exam`.
- Unauthenticated `/api/curriculum/classes` smoke returns `authenticated:false` and `/curriculum` has 0 Playwright console warnings/errors.
- `npm run test:evals` passed: MVP1 2/2, MVP2 4/4.

Immediate next decision:
- Try real model generation with worksheet toggle on/off, then apply the DB migration and try the signed-in `/curriculum` -> `/lesson-plan` -> post-lesson update -> `/exam` loop with real class data.
