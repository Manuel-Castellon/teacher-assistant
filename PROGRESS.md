# PROGRESS.md — Math Teacher AI Assistant
## Read this first. Every session. State current state before writing any code.

---

## Last Completed
2026-05-12 — MVP 2 functional completion verified. Gemini backend + `/exam` UI + `/api/exam/generate` live route are wired; HTTP smoke against the running Next dev server generated a small Hebrew grade-8 algebra exam, rendered exam/answer-key markdown, and SymPy verified 2/2 generated answers. `/api/exam/export` returned a non-empty DOCX package. `npm run type-check` clean. `npm test` now passes: 88 tests, 100% coverage across collected deterministic code. `npm run test:evals` passes: MVP 1 fake-mode evals 2/2. Added focused deterministic coverage for exam prompt rendering, `ExamGenerator` parsing/default backend construction, Gemini/Anthropic backend behavior, DOCX RTL bidi injection/export, SymPy subprocess error handling, and curriculum prompt grounding/validation. Follow-up same day: Playwright MCP click-through passed on `/exam`; grade ז generation produced a short algebra exam with SymPy 2/2 valid, preview tabs worked, and both DOCX downloads were valid packages. Exam generation now injects grade-specific curriculum scope from `data/curriculum/*.json` into the model prompt, with explicit grade ז out-of-scope guardrails. Exam UI now uses grade-specific curriculum topic dropdowns, plus an explicit `אחר / פירוט חופשי` wildcard; API rejects selected topic IDs that do not belong to the selected grade before model generation. Added question type `קריאה וניתוח` for graph/table/diagram/coordinate-plane/number-line interpretation.

2026-05-06 — MVP 0 effectively done (everything except auth, blocked on #6). MVP 1 unblocked work landed: deterministic LessonPlan invariant validator + tests (100% coverage), `ClaudeTextGenerator` ITextGenerator impl with prompt caching + adaptive thinking + fake-mode test injection, eval harness (`evals/run.mjs`) that auto-discovers `mvp*/` suites and fails on deterministic violations. RTL+font smoke test: `next dev` serves `dir="rtl"`, `lang="he"`, `--font-rubik` CSS variable, Hebrew metadata + body text. PG 18 schema applied successfully against `postgres:18-alpine` (all 11 tables created).

2026-05-05 — MVP 0 sub-task **D complete**: high-school 5-יח"ל years 10/11/12 + middle-school grades 7/8/9/9-reduced parsed to `CurriculumUnit` JSON. Validator type-checks all 7 files; high-school totals hard-asserted at 450h, middle-school totals printed (gap from free / חזרות weeks documented per-grade in `_note`). Pivot for middle school: prisa.pdf is a portal, only the פריסת הוראה Hebrew Google Docs are publicly fetchable, so we use those (richer than תכנית הוראה anyway: per-month topic breakdown + hours).

## Currently Broken
Nothing known.

## Blocked On
| Blocker | Blocks | Action Required |
|---------|--------|-----------------|
| ~~Curriculum JSON not parsed~~ | MVP 1 start | ✅ Done 2026-05-05 |
| ~~Math verifier not decided~~ | MVP 2 start | ✅ Done 2026-05-12: SymPy primary, Wolfram available for 5-unit bagrut |
| OCR stack untested | MVP 2 (ingestion only) | Deferred: OCR only needed for scanning student work, not for exam generation |
| No Anthropic API key | Automated generation | User has free Gemini API key; wire GeminiExamGenerator next |

## Next Session Starts With
1. Read PROGRESS.md + CHECKPOINT.md, state current state
2. MVP 1: resolve rubric sign-off + prompt review gates
3. Decide whether to resume the formal MVP sequence at MVP 1 gates or move to MVP 3 question-bank planning.
4. Optional MVP 2 hardening: add actual taught-progress/class-placement data so grade-level curriculum topics can be narrowed by class pace.

## Done so far in MVP 0
- ✅ Git repo initialized (`main` branch)
- ✅ Versions verified: Node 24 (Active LTS), TS 6.0.3, React 19.2.5, Next.js 16.2, PostgreSQL 18.3
- ✅ Dependencies installed (548 packages, 2 moderate audit warnings, non-blocking) — `@anthropic-ai/sdk` added 2026-05-06 for the default ITextGenerator
- ✅ Scaffold type-checks under TS 6.0.3
- ✅ Hebrew-aware PDF extractor (`scripts/parse-curriculum/extract_text.py`, PyMuPDF 1.27, `get_text("words")` + per-line x-DESC sort)
- ✅ Raw curriculum PDFs committed: `prisa.pdf` (middle-school portal), `yod5/yodalef5/yodbet5.pdf` (5-יח"ל years 10/11/12)
- ✅ High-school 5-יח"ל JSON: years 10/11/12 in `data/curriculum/high-school-5units-yearNN.json`, 450h total, validator passes
- ✅ Middle-school JSON: grades 7/8/9 + 9-reduced in `data/curriculum/middle-school-gradeN.json`, parsed from publicly-fetchable פריסת הוראה Google Docs (raw `.txt` exports committed under `raw/middle-school/` as receipt). Heuristic parser at `scripts/parse-curriculum/parse_spread.py`; per-grade hour gap (rows vs monthly budget) documented in each file's `_note`. English topic slugs + per-topic learning objectives are TODO.
- ✅ `FETCH_INSTRUCTIONS.md` corrected: prisa.pdf is a portal (not content); documents the Doc-ID lookup procedure.
- ✅ Hebrew font wired: Rubik via `next/font/google` in `src/app/layout.tsx`; `lang="he" dir="rtl"` confirmed end-to-end via `next dev` HTTP fetch.
- ✅ PostgreSQL 18 schema (`db/schema.sql`) authored from `src/types/`; 11 tables apply cleanly against `postgres:18-alpine`. PG client / ORM choice deferred to land with auth (#6).
- ✅ Jest test scaffolding (`jest.config.mjs`, `tsconfig.jest.json`, ESM via `--experimental-vm-modules`); 100% coverage gate enforced; deterministic-only — no LLM-output asserts.
- ✅ Auth — NextAuth v5 + Google OAuth + `@auth/pg-adapter`. `allowDangerousEmailAccountLinking: true` on the Google provider. Auth tables added to `db/schema.sql`. `IAuthProvider` interface + `NextAuthProvider` impl (100% coverage). Layout updated with server-side nav. Env vars documented in `.env.local.example`.

## Done so far in MVP 1 (non-blocked items only)
- ✅ Deterministic `LessonPlan` invariant validator (`src/lessonPlan/validateInvariants.ts`) covering opening-mode, last-phase-min-duration (incl. 90-min review carve-out), phase-sum=duration, and Bagrut-review metadata + sources; 100% coverage on 9 cases.
- ✅ `ClaudeTextGenerator` (`src/providers/impl/ClaudeTextGenerator.ts`) — implements `ITextGenerator` for `generateLessonPlan`. Adaptive thinking, prompt caching on the system block, fake-client injection for tests. `generateExercises`/`generateExam` reject with "MVP 2" until verifier decided. 100% coverage on 11 cases.
- ✅ Lesson-plan system prompt versioned at `LESSON_PLAN_PROMPT_VERSION = 'lp-v0.1.0-mvp1'` (`src/providers/impl/lessonPlanPrompt.ts`). Awaiting user review before any live spend.
- ✅ Eval harness (`evals/run.mjs`) — auto-discovers `evals/mvp*/` suites, runs each `harness.mjs` over its `cases/*.json`, writes timestamped result files, exits non-zero on deterministic violations.
- ✅ MVP 1 eval suite (`evals/mvp1/`) — 2 fake-mode cases (routine 45-min + bagrut review 90-min) both pass deterministic scoring. README documents the proposed rubric. Judge-scored criteria are stubbed pending sign-off.

## MVP Status
| MVP | Status | Test Coverage | Eval Score | Completed |
|-----|--------|--------------|------------|-----------|
| 0   | ✅ Complete | 100% on all covered files (26 tests) | — | 2026-05-07 |
| 1   | 🟡 In progress (validator + generator + eval harness landed; rubric awaiting sign-off; live runs awaiting auth + rubric) | 100% on landed code | fake: 2/2 deterministic | — |
| 2   | ✅ Functionally complete | 100% deterministic coverage (88 tests total) | Playwright: grade ז exam generated, SymPy 2/2 valid, DOCX downloads valid | 2026-05-12 |
| 3   | 🔴 Not started | — | — | — |
| 4   | 🔴 Not started | — | — | — |
| 5   | 🔴 Not started | — | — | — |
| 6   | 🔴 Not started | — | — | — |

## Done so far in MVP 2
- ✅ Exam types (`src/exam/types.ts`): `ExamRequest`, `ExamPartSpec`, `ExamQuestionSpec`, `GeneratedExam`, `ExamPart`, `ExamQuestion`, `ExamSolution`, `VerificationItem`.
- ✅ Exam system prompt (`src/exam/examPrompt.ts`, version `exam-v0.1.0`): Hebrew exam generation grounded in real teacher examples; encodes structure, question types, math notation, and anti-patterns from task log.
- ✅ Exam renderer (`src/exam/renderExam.ts`): JSON → markdown with RTL-safe paragraph separation (every logical line is its own paragraph). Separate functions for exam and answer key.
- ✅ `ExamGenerator` class (`src/exam/ExamGenerator.ts`): backend-agnostic completion wrapper. Standalone from `ITextGenerator` (avoids breaking existing interface).
- ✅ Gemini/Anthropic backend factory (`src/exam/backends.ts`): uses `GEMINI_API_KEY` first, falls back to `ANTHROPIC_API_KEY`.
- ✅ `SympyMathVerifier` (`src/providers/impl/SympyMathVerifier.ts`): implements `IMathVerifier`; calls `scripts/verify-math.py` via child process. Handles equations, inequalities, numeric checks, proof passthrough.
- ✅ SymPy verification script (`scripts/verify-math.py`): equation solver, inequality solver, numeric comparator. Identity equations fixed via `solveset` distinction between all-real and no-solution.
- ✅ Geometry diagram generator (`scripts/generate-diagram.py`): computes coordinates from given side lengths, outputs SVG with vertex labels + angle markers (no side lengths per teacher feedback). Converts to PNG via cairosvg.
- ✅ Docx RTL post-processing: `<w:bidi/>` injection into all paragraphs of generated docx files.
- ✅ Generation script (`scripts/generate-exam.ts`): end-to-end pipeline (generate → verify → render markdown → pandoc docx), updated to use default backend factory.
- ✅ Exam generation UI page (`src/app/exam/page.tsx`): Hebrew RTL form for class/date/grade/duration/points/parts/questions/constraints/teacher notes, with result preview and DOCX download actions.
- ✅ API routes: `/api/exam/generate` wires `ExamGenerator` + `SympyMathVerifier` + markdown renderer; `/api/exam/export` returns RTL DOCX.
- ✅ Curriculum grounding: exam prompts now include the selected grade's local curriculum JSON scope (`data/curriculum/*.json`) and strict out-of-scope guardrails before the request details reach Gemini/Claude.
- ✅ Curriculum topic selection: `/exam` has a per-question grade-specific curriculum topic dropdown, editable focus field, and explicit `אחר / פירוט חופשי` wildcard. API validates selected topic IDs against the selected grade before calling the model.
- ✅ Question type taxonomy: `חישובי`, `בעיה מילולית`, `הוכחה`, `קריאה וניתוח`, `מעורב`. `קריאה וניתוח` covers graph/table/diagram/coordinate-plane/number-line interpretation.
- ✅ MVP 2 deterministic tests: prompt, renderer, generator parsing, backend behavior, SymPy verifier, DOCX export, curriculum prompt grounding/validation. `npm test`: 88 tests, 100% coverage. `npm run test:evals`: MVP 1 fake-mode evals 2/2.
- ✅ Live smoke: running Next dev server served `/exam`; `/api/exam/generate` produced a small Hebrew exam and SymPy verified 2/2 answers; `/api/exam/export` returned a valid DOCX package.
- ✅ Playwright smoke: `/exam` loaded without console errors after local Auth.js/favicon fixes; grade ז form generation returned `2/2 תקינים`; preview tabs and both DOCX downloads worked.
- ✅ First real exam generated and reviewed by teacher: "everything in the Qs and answer key was perfect" (after iteration on Q3.1 scenario, Q4.3 pedagogy, diagram, RTL).
- ✅ `.env.local.example` / `.env.example` updated: `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, and `WOLFRAM_APP_ID` placeholders where relevant.
- ✅ Python venv at `.venv/` with matplotlib, cairosvg, sympy.

## Session Log
| Date | Work Done | Blockers Hit |
|------|-----------|--------------|
| 2026-04-29 | Scaffold initialized | — |
| 2026-05-05 | git init; deps installed; versions verified (Node 24 / TS 6.0.3 / React 19.2.5 / Next 16.2 / PG 18.3); type-check passes; CHECKPOINT.md workflow added | — |
| 2026-05-05 | MVP 0 sub-task D high-school: PyMuPDF extractor; 4 raw PDFs committed; years 10/11/12 JSON parsed (450h total); validator passes; auth provider decision raised (#6) | Cognito default in PROGRESS.md conflicts with linking constraint, see Service Decision #6 |
| 2026-05-05 | MVP 0 sub-task D middle-school: prisa.pdf revealed as portal; 4 פריסת הוראה Google Docs identified by link-rect-to-cell mapping + fetched as txt (committed); heuristic parser written; 4 grade JSONs generated; FETCH_INSTRUCTIONS.md corrected; D done | Middle-school topic-hours don't match monthly budgets (free / חזרות weeks); shipped with `_note` documenting gap |
| 2026-05-06 | MVP 0 finishing: Rubik + RTL smoke-tested via `next dev`; PG 18 schema applied. Jest scaffolded. MVP 1 unblocked work: `validateLessonPlanInvariants` (100% cov, 9 cases), `ClaudeTextGenerator` with prompt caching + adaptive thinking + injectable fake (100% cov, 11 cases), versioned system prompt `lp-v0.1.0-mvp1`. Eval harness (`evals/run.mjs`) + MVP 1 suite with 2 fake-mode cases passing deterministic scoring. | Auth (#6) still blocks. MVP 1 rubric needs user sign-off before live runs. |
| 2026-05-07 | MVP 0 complete: Auth.js v5 wired — Google OAuth, `@auth/pg-adapter`, `allowDangerousEmailAccountLinking: true`. Auth tables in `db/schema.sql`. `IAuthProvider` + `NextAuthProvider` (5 tests, 100% cov). Sign-in page + route handler + layout nav. `.env.local.example` documents required vars. 26 tests total, 100% coverage. | MVP 1 rubric sign-off + prompt review pending. |
| 2026-05-12 | **MVP 2 jumpstart: end-to-end exam generation.** Skipped MVP 1 gates to produce real value. Built: exam types (`src/exam/types.ts`), Hebrew exam prompt (`examPrompt.ts`), exam renderer with RTL-safe paragraph separation (`renderExam.ts`), `ExamGenerator` class, `SympyMathVerifier` with Python backend (`scripts/verify-math.py`), geometry diagram generator (`scripts/generate-diagram.py` → SVG → PNG). Generated a full grade-8 exam (algebra + geometry, 100 pts) with answer key; SymPy verified 9/10 answers (1 identity edge case). Teacher feedback: Q3.1 rewritten (was too similar to reference), Q4.3 answer key fixed to use יחס שטחים, diagram cleaned (no side lengths), RTL docx improved with per-line paragraph separation + bidi injection. Wolfram AppID stored but SymPy chosen as primary (sufficient for this math level). `.env.local.example` updated with `ANTHROPIC_API_KEY` + `WOLFRAM_APP_ID`. | No Anthropic API key; need Gemini backend for automated runs. |
| 2026-05-12 | **MVP 2 finish:** Gemini backend/factory landed; `/exam` UI and `/api/exam/generate` route live; identity equation verifier bug fixed; generation script updated to backend factory; deterministic tests expanded to 78 passing with 100% coverage; type-check clean. Live HTTP smoke generated a small Hebrew exam through the running app, SymPy verified 2/2 answers, and DOCX export returned a valid package. | No Playwright MCP/CLI exposed in this Codex session; route-level live smoke used instead of interactive browser automation. |
| 2026-05-12 | **MVP 2 browser + curriculum follow-up:** Playwright MCP validation passed for `/exam` including generate, preview tabs, and DOCX downloads. Fixed local Auth.js missing-secret console error with a dev-only fallback and added app icon metadata. Added grade-specific curriculum prompt grounding from local JSON, including grade ז out-of-scope guardrails. Tests now 79 passing with 100% coverage; type-check clean. | Superseded by topic selector hardening below. |
| 2026-05-12 | **MVP 2 topic selector hardening:** Added grade-specific curriculum topic dropdowns to `/exam`, editable focus text, explicit `אחר / פירוט חופשי` wildcard, and API validation that rejects selected topic IDs outside the selected grade before LLM calls. Playwright verified grade switching/custom/selected-topic states; localhost API validation returned 400 for a grade ח topic ID in a grade ז request. Tests now 87 passing with 100% coverage; type-check clean. | Still no per-class taught-progress model; topic lists are grade curriculum-wide, not narrowed by teacher pace/class placement yet. |
| 2026-05-12 | **MVP 2 question taxonomy:** Added `קריאה וניתוח` as the fifth question type for graph/table/diagram/coordinate-plane/number-line interpretation. Kept `מעורב` as the broad escape hatch. Playwright verified the option appears in `/exam`; tests now 88 passing with 100% coverage; type-check clean. | — |
