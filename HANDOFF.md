# Handoff Snapshot

Date: 2026-05-14

## Current State

- The app is a real Next.js MVP, not a standalone script or notebook.
- `/lesson-plan` is live in the app router and `/api/lesson-plan/generate` is wired behind it.
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

## Generated Lesson-Plan Artifacts

- Complex-numbers lesson plan: `data/lesson-plans/generated/grade12-5units-complex-intro-45min.*`
- Grade 7 geometry lesson plan: `data/lesson-plans/generated/grade7-geometry-quadrilateral-areas-45min.*`
- User-approved GPT-5.5 browser exports:
  - `data/lesson-plans/generated/grade7-equations-common-denominator-90min-approved-gpt55.pdf`
  - `data/lesson-plans/generated/grade11-complex-algebra-90min-approved-gpt55.pdf`

## Verification

- `npm run type-check` passes.
- `npm run test:lesson-plan` is the focused sign-off check for lesson-plan work.
- `npm run test:signoff` runs type-check, lesson-plan checks, and evals.
- Latest sign-off run passed: 61 focused tests, MVP1 2/2 evals, MVP2 4/4 evals.
- Latest full deterministic run passed with `npm test -- --coverage=false`: 128 tests.
- `curl -I http://localhost:3000/lesson-plan` returns `200 OK`.
- The lesson-plan API returns Hebrew validation errors for incomplete requests.

## Current Working Tree

- Modified tracked files include the lesson-plan MVP, auth fallback, curriculum helpers/tests, and progress notes.
- Untracked files include the new lesson-plan source files and the generated DOCX/PDF/MD artifacts.

## Important Behavior

- Lesson-plan generation now calls `createDefaultBackend()` from `src/exam/backends.ts`.
- That means the same `GEMINI_API_KEY` path used by exams is now the default for lesson plans.
- Explicit model choice is saved in the browser-local saved request. No server-side persistence exists yet.
- If neither Gemini nor Anthropic is configured and Claude CLI is not installed, generation fails with the existing “No AI backend configured” error.
- The lesson-plan prompt path still injects curriculum context and teacher notes.
- Observed model priority: GPT-5.5 (Codex) produced the best approved outputs; Claude CLI is the active Claude option until an API key exists; Gemini 2.5 Pro did not work with the current free key; Gemini 3 Flash Preview is the best free Gemini candidate observed so far.

## Likely Next Step

- Decide whether the lesson-plan MVP should gain server-side persistence and sharing, or whether browser-local saved plans are enough for now.
- If the next increment is productization, auth-gated storage is the natural follow-up.
