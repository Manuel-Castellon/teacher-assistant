# CHECKPOINT.md — In-flight state (overwrite freely)

> Live cursor for the current task. PROGRESS.md is the milestone log; this file is "where I am RIGHT NOW".

## Current task
MVP 2 exam generation: curriculum grounding + topic selector hardening complete.

## Last action that succeeded
- Resumed from `PROGRESS.md` + `CHECKPOINT.md`.
- Confirmed `http://localhost:3000/exam` responds 200 over HTTP.
- Confirmed the live API did **not** previously inject `data/curriculum/*.json`; prompt only included grade/topic/notes.
- Added curriculum grounding in code: `ExamGenerator` now loads grade-specific scope from local curriculum JSON and injects it into `renderExamUserPrompt`.
- Added strict grade-scope guardrails, including grade ז out-of-scope examples such as systems, formal linear functions, rational equations, Pythagoras/trig.
- Fixed local `/exam` console errors: Auth.js now has a development-only fallback secret when `AUTH_SECRET` is missing; app metadata points to `/icon.svg`.
- `npm run type-check` passes after curriculum grounding.
- `npm test` passed after curriculum grounding: 11 suites, 79 tests, 100% statements/branches/functions/lines.
- Playwright MCP click-through passed on `http://localhost:3000/exam`:
  - Filled a grade ז short algebra request.
  - Clicked `ייצר מבחן`.
  - Result panel appeared with `2/2 תקינים`.
  - Preview opened; tabs for exam, answer key, verification worked.
  - Both DOCX buttons downloaded valid packages to `.playwright-mcp/מבחן.docx` and `.playwright-mcp/פתרון.docx`.
- Added curriculum topic selection hardening:
  - Exam UI now has a per-question `נושא בתוכנית` dropdown populated by selected grade.
  - Each question also has `מיקוד`; choosing a curriculum topic auto-fills it, but the teacher can refine it.
  - Added `אחר / פירוט חופשי` wildcard for intentional teacher-specific focus.
  - API validates selected topic IDs belong to the selected grade and rejects stale/out-of-grade IDs before model generation.
  - `npm run type-check` passes.
  - `npm test` passes: 12 suites, 87 tests, 100% statements/branches/functions/lines.
  - Playwright verified grade switching, custom wildcard UI, selected-topic autofill, and API rejection for a grade ח topic ID on a grade ז request.
- Added question type `קריאה וניתוח` for graph/table/diagram/coordinate-plane/number-line interpretation:
  - Wired into `ExamQuestionSpec`.
  - Added to `/exam` type dropdown.
  - Added prompt guidance so it means interpreting a representation, not a separate curriculum topic.
  - `npm run type-check` passes.
  - `npm test` passes: 12 suites, 88 tests, 100% statements/branches/functions/lines.
  - Playwright snapshot confirms the dropdown includes `קריאה וניתוח`.

## What I'm about to do next
- Next product step is either MVP 1 formal gates (rubric/prompt sign-off + live eval) or MVP 3 question-bank planning.
- Optional hardening: add actual taught-progress/class-placement layer so the topic list can be narrowed by class pace, not only by grade curriculum.

## Open question / waiting on user
Whether to prioritize MVP 1 formal gates or MVP 3 question-bank planning.

## Files created/modified this session
- `src/exam/curriculumContext.ts` (new: maps grades to curriculum JSON and renders strict prompt scope)
- `src/exam/ExamGenerator.ts` (updated: injects curriculum scope into the model prompt)
- `src/exam/examPrompt.ts` (updated: renders curriculum scope section)
- `src/exam/ExamGenerator.test.ts` (updated: asserts curriculum scope reaches backend prompt)
- `src/exam/examPrompt.test.ts` (updated: asserts grade ז scope/guardrails)
- `src/auth.ts` (updated: development-only fallback secret)
- `src/app/layout.tsx` (updated: icon metadata)
- `src/app/icon.svg` (new: app icon)
- `src/exam/types.ts` (updated: optional `curriculumTopicId` on question specs)
- `src/app/exam/page.tsx` (updated: curriculum topic dropdown + custom focus option)
- `src/app/api/exam/generate/route.ts` (updated: topic-ID validation before generation)
- `src/exam/curriculumContext.test.ts` (new: deterministic coverage for curriculum options/validation)
- `src/exam/types.ts` (updated: question type includes `קריאה_וניתוח`)
- `src/app/exam/page.tsx` (updated: question type dropdown includes `קריאה וניתוח`)
- `src/exam/examPrompt.ts` (updated: prompt guidance for reading/analysis tasks)
- `src/exam/backends.ts` (new: CompletionFn, Gemini/Anthropic backends, factory)
- `src/exam/ExamGenerator.ts` (refactored: uses CompletionFn instead of AnthropicLike)
- `src/exam/renderExam.test.ts` (new: 13 tests)
- `src/providers/impl/SympyMathVerifier.test.ts` (new: 12 tests)
- `src/providers/impl/SympyMathVerifier.errors.test.ts` (new: subprocess failure/invalid JSON tests)
- `src/app/exam/page.tsx` (new: exam generation form UI)
- `src/app/api/exam/generate/route.ts` (new: POST endpoint)
- `src/providers/index.ts` (updated: exports backends)
- `scripts/generate-exam.ts` (updated: uses createDefaultBackend)
- `scripts/verify-math.py` (fixed: identity-equation edge case)
- `.env.local` (updated: GEMINI_API_KEY)
- `.env.example` (updated: GEMINI_API_KEY placeholder)
- `src/exam/ExamGenerator.test.ts` (new)
- `src/exam/backends.test.ts` (new)
- `src/exam/examPrompt.test.ts` (new)
- `src/exam/exportDocx.ts` (exports `injectBidi` for deterministic coverage)
- `src/exam/exportDocx.test.ts` (new)
- `PROGRESS.md`, `CHECKPOINT.md` (updated)
