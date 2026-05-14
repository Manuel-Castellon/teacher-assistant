# MVP Status Rundown

Last updated: 2026-05-14

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

Status: in progress, but substantially usable.

Done:
- `LessonPlan` schema and deterministic invariant validator.
- Claude-backed `ITextGenerator` implementation with fake-client tests.
- Eval harness and MVP1 fake deterministic evals.
- Lesson-plan curriculum grounding from local curriculum JSON.
- Reusable lesson-plan Markdown renderer.
- Generated/exported י"ב 5 יח"ל complex-numbers intro lesson plan: JSON, Markdown, DOCX, PDF.
- Local-only copyrighted resource guardrail for `data/resources/*`.

Missing:
- Rubric sign-off for LLM-judged lesson-plan quality.
- Prompt review before live automated generation spend.
- Live evals against real model output.
- UI for lesson-plan generation/export is not built yet.

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

Status: not started.

Done:
- Static curriculum JSON exists.
- Exam and lesson-plan prompts can already use grade/topic curriculum context.

Missing:
- Per-class taught-progress model.
- UI to mark topics/subtopics as not started, in progress, completed.
- Actual hours spent and last-taught date tracking.
- Narrowing exam/lesson topic options by what this class has actually learned.
- Continuity context from prior lessons into future lesson/exam generation.

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
- `npm test` passed: 102 tests, 100% coverage.
- `npm run test:evals` passed: MVP1 2/2, MVP2 4/4.

Immediate next decision:
- Commit/push the current large batch, then choose between MVP1 live lesson-plan gates, MVP3 question bank, or MVP4 curriculum tracker.
