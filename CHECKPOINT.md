# CHECKPOINT.md

## Last completed
- Lesson-plan model selector wired end-to-end: Gemini 2.5 Flash, Gemini 3 Flash Preview, Gemini 2.5 Pro, Claude CLI, GPT-5.5 (Codex).
- GPT-5.5 (Codex CLI) is routed through `codexCliBackend()` as an ephemeral read-only completion backend.
- Teacher-facing renderer fixed for approved output style: `דגשים למורה`, no `מצב עבודה` / `זמן משוער`, structured generated Markdown preserved.
- Approved GPT-5.5 browser-export PDFs renamed descriptively:
  - `data/lesson-plans/generated/grade7-equations-common-denominator-90min-approved-gpt55.pdf`
  - `data/lesson-plans/generated/grade11-complex-algebra-90min-approved-gpt55.pdf`
- Lesson-plan sign-off docs added at `docs/lesson-plan-signoff.md`; focused script added as `npm run test:lesson-plan`.
- `npm run test:signoff` passed: type-check, 61 focused tests, MVP1 2/2 and MVP2 4/4 evals.
- Full deterministic suite passed with `npm test -- --coverage=false`: 128 tests.

## Next
- Anthropic API backend support remains in code for a future key, but is not exposed in the current lesson-plan UI because no key is configured.
- Gemini 2.5 Pro is wired but failed for the current free key; keep it as an explicit experimental option, not default.

## Key files changed
- `src/exam/backends.ts` — backend names, Gemini 3 Flash Preview, Gemini 2.5 Pro, Codex completion backend.
- `src/app/lesson-plan/page.tsx` — model selector, progress indicator, PDF/DOCX export buttons, robust non-JSON error display.
- `src/app/api/lesson-plan/generate/route.ts` — accepts explicit backend param.
- `src/lessonPlan/renderLessonPlan.ts` — teacher-facing cleanup and long-note formatting.
- `src/providers/impl/lessonPlanPrompt.ts` — prompt version/style contract for printable Markdown and LaTeX.
- `package.json` — `test:lesson-plan`, `test:signoff`.
- `docs/lesson-plan-signoff.md`, `data/lesson-plans/generated/README.md`, `HANDOFF.md`, `CLAUDE.md`.
