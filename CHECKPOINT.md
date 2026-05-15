# CHECKPOINT.md

## Last completed
- MVP 4 first slice landed: `/curriculum` tracks class-by-class curriculum progress in browser-local storage.
- MVP 4 server persistence started: authenticated users now load/save class progress through `/api/curriculum/classes`.
- Unauthenticated users keep the browser-local fallback; the API returns `{ authenticated: false }` without noisy 401 console errors.
- Added `db/migrations/2026-05-15-class-progress-persistence.sql` for existing local DBs; fresh schema is updated in `db/schema.sql`.
- Teachers can mark each topic as not started, in progress, completed, or needs review, with actual hours, last-taught date, and notes.
- `/curriculum` suggests the next lesson and can open `/lesson-plan` with class context and the suggested topic prefilled.
- Lesson suggestions now also prefill a deterministic, editable `בקשת המורה` from class name, topic, status, learning objective, and teacher progress notes.
- Selecting `ללא הקשר כיתה` in `/lesson-plan` clears stale `הקשר מהשיעור הקודם` without deleting class progress or wiping the teacher request.
- `/exam` can build editable defaults from taught/review topics and warns when selected topics are not yet taught for the chosen class.
- Manual override remains available everywhere: suggestions only prefill fields and warnings do not block generation.
- Lesson-plan DOCX/PDF downloads now default to descriptive filenames such as `מערך שיעור משפט פיתגורס כיתה ח'`.
- Lesson-plan JSON parsing now detects AI/provider error envelopes (`{error,message}`) and surfaces the real backend error instead of a misleading missing-`phases` schema error.
- Added `src/curriculumProgress/progress.ts` and `npm run test:progress`; `npm run test:signoff` now includes progress tests.
- Lesson-plan model selector wired end-to-end: Gemini 2.5 Flash, Gemini 3 Flash Preview, Gemini 2.5 Pro, Claude CLI, GPT-5.5 (Codex).
- GPT-5.5 (Codex CLI) is routed through `codexCliBackend()` as an ephemeral read-only completion backend.
- Teacher-facing renderer fixed for approved output style: `דגשים למורה`, no `מצב עבודה` / `זמן משוער`, structured generated Markdown preserved.
- Approved GPT-5.5 browser-export PDFs renamed descriptively:
  - `data/lesson-plans/generated/grade7-equations-common-denominator-90min-approved-gpt55.pdf`
  - `data/lesson-plans/generated/grade11-complex-algebra-90min-approved-gpt55.pdf`
- Lesson-plan sign-off docs added at `docs/lesson-plan-signoff.md`; focused script added as `npm run test:lesson-plan`.
- `npm run test:signoff` passed: type-check, 62 focused lesson-plan tests, 7 progress/server-store tests, MVP1 2/2 and MVP2 4/4 evals.
- `npm run build` passed after the latest client-page changes.
- Full deterministic suite passed with `npm test -- --coverage=false`: 128 tests.

## Next
- Move MVP 4 persistence from browser-local storage to auth-gated server storage when cross-device/classroom use matters.
- Broaden class-progress context in prompts after teacher tries the current loop in real workflow.
- Anthropic API backend support remains in code for a future key, but is not exposed in the current lesson-plan UI because no key is configured.
- Gemini 2.5 Pro is wired but failed for the current free key; keep it as an explicit experimental option, not default.

## Key files changed
- `src/curriculumProgress/progress.ts` — class progress model, summaries, lesson/exam suggestions, warnings.
- `src/curriculumProgress/serverStore.ts` — Postgres load/save mapping for class progress.
- `src/app/curriculum/page.tsx` — class progress tracker UI.
- `src/app/api/curriculum/classes/route.ts` — authenticated class progress API with local fallback contract.
- `db/schema.sql`, `db/migrations/2026-05-15-class-progress-persistence.sql` — teacher-owned class progress persistence.
- `src/app/lesson-plan/page.tsx` — optional class context, tracker-driven editable lesson suggestion, descriptive export filenames.
- `src/app/exam/page.tsx` — optional class context, taught-material exam defaults, not-yet-taught warnings.
- `src/curriculumProgress/progress.test.ts`, `package.json` — focused progress signoff.
- `src/lessonPlan/LessonPlanGenerator.ts` — clearer provider error-envelope reporting before schema validation.
- `src/exam/backends.ts` — backend names, Gemini 3 Flash Preview, Gemini 2.5 Pro, Codex completion backend.
- `src/app/lesson-plan/page.tsx` — model selector, progress indicator, PDF/DOCX export buttons, robust non-JSON error display.
- `src/app/api/lesson-plan/generate/route.ts` — accepts explicit backend param.
- `src/lessonPlan/renderLessonPlan.ts` — teacher-facing cleanup and long-note formatting.
- `src/providers/impl/lessonPlanPrompt.ts` — prompt version/style contract for printable Markdown and LaTeX.
- `package.json` — `test:lesson-plan`, `test:signoff`.
- `docs/lesson-plan-signoff.md`, `data/lesson-plans/generated/README.md`, `HANDOFF.md`, `CLAUDE.md`.
