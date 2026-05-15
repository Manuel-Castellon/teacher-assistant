# Handoff Snapshot

Date: 2026-05-15

## Current State

- The app is a real Next.js MVP, not a standalone script or notebook.
- `/lesson-plan` is live in the app router and `/api/lesson-plan/generate` is wired behind it.
- `/curriculum` is live as the first MVP 4 class-progress tracker.
- Class progress now has an authenticated server persistence path via `/api/curriculum/classes`.
- Browser-local storage remains the unauthenticated/offline fallback and cache.
- Lesson/exam pages can consume class progress as suggestions, but teachers can always override manually.
- Lesson-plan suggestions include a deterministic editable `בקשת המורה`; this is local template rendering, not an LLM call.
- The lesson-plan generator now uses the same backend selection as exams, so `GEMINI_API_KEY` is preferred for local play.
- Anthropic backend support still exists for a future `ANTHROPIC_API_KEY`, but the current lesson-plan UI/sign-off path does not expose Claude API.
- `/lesson-plan` now has an explicit model selector: Gemini 2.5 Flash, Gemini 3 Flash Preview, Gemini 2.5 Pro, Claude CLI, and GPT-5.5 (Codex).
- Codex CLI is routed as an ephemeral read-only completion backend, not as a repo-editing agent.
- The dev server is already running on `http://localhost:3000`.

## Implemented Recently

- Lesson-plan UI at [`src/app/lesson-plan/page.tsx`](src/app/lesson-plan/page.tsx)
- Lesson-plan generation API at [`src/app/api/lesson-plan/generate/route.ts`](src/app/api/lesson-plan/generate/route.ts)
- Shared lesson-plan generator abstraction at [`src/lessonPlan/LessonPlanGenerator.ts`](src/lessonPlan/LessonPlanGenerator.ts)
- Sign-off docs at [`docs/lesson-plan-signoff.md`](docs/lesson-plan-signoff.md)
- Curriculum topic helpers and validation for lesson plans in [`src/lessonPlan/curriculumContext.ts`](src/lessonPlan/curriculumContext.ts)
- Root nav and home-page links for the served MVP in [`src/app/layout.tsx`](src/app/layout.tsx) and [`src/app/page.tsx`](src/app/page.tsx)
- Dev auth fallback fix in [`src/auth.ts`](src/auth.ts) so a blank `AUTH_SECRET` does not break local dev
- Class progress helper at [`src/curriculumProgress/progress.ts`](src/curriculumProgress/progress.ts)
- Class progress Postgres mapper at [`src/curriculumProgress/serverStore.ts`](src/curriculumProgress/serverStore.ts)
- Curriculum tracker UI at [`src/app/curriculum/page.tsx`](src/app/curriculum/page.tsx)
- Authenticated class progress API at [`src/app/api/curriculum/classes/route.ts`](src/app/api/curriculum/classes/route.ts)
- DB migration at `db/migrations/2026-05-15-class-progress-persistence.sql`
- `/lesson-plan` class-context suggestion support
- `/lesson-plan` clears stale previous-lesson context when switching to `ללא הקשר כיתה`
- `/lesson-plan` DOCX/PDF filenames now include topic and grade by default
- `/exam` taught-material defaults and not-yet-taught warnings
- Lesson-plan parser now surfaces AI/backend `{error,message}` responses directly before schema validation

## Generated Lesson-Plan Artifacts

- Complex-numbers lesson plan: `data/lesson-plans/generated/grade12-5units-complex-intro-45min.*`
- Grade 7 geometry lesson plan: `data/lesson-plans/generated/grade7-geometry-quadrilateral-areas-45min.*`
- User-approved GPT-5.5 browser exports:
  - `data/lesson-plans/generated/grade7-equations-common-denominator-90min-approved-gpt55.pdf`
  - `data/lesson-plans/generated/grade11-complex-algebra-90min-approved-gpt55.pdf`

## Verification

- `npm run type-check` passes.
- `npm run test:lesson-plan` is the focused sign-off check for lesson-plan work.
- `npm run test:progress` is the focused deterministic check for MVP 4 progress helpers.
- `npm run test:signoff` runs type-check, lesson-plan checks, progress checks, and evals.
- Latest sign-off run passed: 62 lesson-plan focused tests, 7 progress/server-store tests, MVP1 2/2 evals, MVP2 4/4 evals.
- Latest production build passed with `npm run build`.
- Latest full deterministic run passed with `npm test -- --coverage=false`: 131 tests.
- `curl -I http://localhost:3000/curriculum` returns `200 OK`.
- `curl -I http://localhost:3000/lesson-plan` returns `200 OK`.
- The lesson-plan API returns Hebrew validation errors for incomplete requests.

## Current Working Tree

- Working tree may contain the MVP 4 tracker changes until committed.

## Important Behavior

- Lesson-plan generation now calls `createDefaultBackend()` from `src/exam/backends.ts`.
- That means the same `GEMINI_API_KEY` path used by exams is now the default for lesson plans.
- Explicit model choice is saved in the browser-local saved request. No server-side persistence exists yet.
- Class progress is cached in browser localStorage under `teacher-assistant.class-progress.v1`; when signed in, `/curriculum` loads/saves the same profiles through Postgres.
- Existing local databases need `psql "$DATABASE_URL" -f db/migrations/2026-05-15-class-progress-persistence.sql`; fresh DBs can use `db/schema.sql`.
- The unauthenticated API contract is `200 { authenticated: false, profiles: [] }` for GET and echoes submitted profiles for PUT so the UI can keep local fallback without console noise.
- Lesson suggestion text is generated by `buildLessonSuggestion()` / `renderLessonTeacherRequest()` in `src/curriculumProgress/progress.ts`.
- Download names are generated in `/lesson-plan` as `מערך שיעור {topic} כיתה {grade}` and sanitized for common filesystem-invalid characters.
- `/exam` warnings for not-yet-taught topics are advisory only and intentionally do not block teacher override.
- If a backend returns JSON shaped like `{ error, message }`, `/lesson-plan` now reports the backend message instead of `AI returned JSON without a "phases" object`.
- If neither Gemini nor Anthropic is configured and Claude CLI is not installed, generation fails with the existing “No AI backend configured” error.
- The lesson-plan prompt path still injects curriculum context and teacher notes.
- Observed model priority: GPT-5.5 (Codex) produced the best approved outputs; Claude CLI is the active Claude option until an API key exists; Gemini 2.5 Pro did not work with the current free key; Gemini 3 Flash Preview is the best free Gemini candidate observed so far.

## Likely Next Step

- Try the signed-in `/curriculum` -> `/lesson-plan` -> `/exam` loop with real class data after applying the DB migration.
- Next likely product slice: post-lesson update flow that writes actual taught status/hours/notes back into class progress.
