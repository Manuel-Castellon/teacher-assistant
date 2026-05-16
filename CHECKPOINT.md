# CHECKPOINT.md

## Last completed
- Session resumed on `mvp-4-post-lesson-flow` after the worksheet/post-lesson commit.
- Decision: with MVP 4 manual steps (DB migration, real-class signed-in loop) still blocked, prioritized software-only follow-ups.
- MVP 4 software-only — server-side class context loading by `classId`:
  - New `src/curriculumProgress/classContextResolver.ts` with explicit source modes (`none` / `manual` / `auto`) and graceful fallback to client-rendered context for signed-out users.
  - New `src/curriculumProgress/loadClassProgressProfile()` in `serverStore.ts`.
  - `/api/lesson-plan/generate` and `/api/exam/generate` accept `classId` + `classContextSource`; signed-in path loads profile from Postgres fresh per request. Exam path appends resolved context to teacherNotes under a labeled block.
  - `/lesson-plan` and `/exam` UIs gained a "הקשר כיתה בפרומפט" selector with auto/manual/none, defaulting to auto when a class is selected.
  - 8 focused resolver tests covering all source modes, fallback, and back-compat.
- MVP 2 polish — exam PDF buttons:
  - `/api/exam/export` already supported `format=pdf`; lesson-plan UI already used it.
  - Exam UI now exposes four download buttons (exam/answers × docx/pdf) wired through the existing route.
- MVP 4 software-only — class continuity timeline:
  - `buildClassActivityTimeline()` in `progress.ts` parses dated post-lesson notes plus `lastTaughtDate` and returns a desc-sorted activity stream.
  - `/curriculum` shows an 8-entry "פעילות אחרונה בכיתה" panel between the suggestions panel and the topic list.
  - `/lesson-plan` class panel shows a compact 4-entry timeline inline with the context controls.
  - 3 focused tests for the helper.
- Quality gates:
  - `npm run type-check` passed.
  - `npm run test:progress` passed: 20 tests (progress + serverStore + classContextResolver).
  - `npm run test:lesson-plan` passed: 67 tests.
  - `npm run test:signoff` passed: type-check + lesson-plan + progress + MVP1 2/2 evals + MVP2 4/4 evals.
  - `npm run build` passed.
- Playwright MCP smoke (unauthenticated, localStorage seeded):
  - `/lesson-plan` three source modes sent expected payloads (auto with client-rendered fallback; manual; none with empty context).
  - `/exam` three source modes confirmed; none preserves teacher-typed notes without adding class context.
  - `/curriculum` 8-entry timeline rendered with date/status/topic/note.
  - `/lesson-plan` mini-timeline rendered with 4 entries.
  - PDF route returned real `%PDF` bytes (15KB) with correct headers; all four exam download buttons rendered after generation.
  - Console: 0 warnings / 0 errors across runs.

## Next
- Optional: PRIOR worksheet sign-off doc updates (CHECKPOINT.md / docs/lesson-plan-signoff.md from before this session) are still in the working tree and folded into this commit.
- Resume options when ready:
  - MVP 1 LLM-judge rubric (dev-only eval; modest token cost when run).
  - MVP 2 rubric artifacts browser/export UI.
  - MVP 3 question bank schema + tagging + stub list/search UI.
  - MVP 4 subtopic-level progress (larger schema/UI change).
- Real-class signed-in loop and DB migration remain tabled until a usable local Postgres path exists.

## Key files changed
- `src/curriculumProgress/classContextResolver.ts` and `classContextResolver.test.ts` — new resolver + tests.
- `src/curriculumProgress/serverStore.ts` — added `loadClassProgressProfile()`.
- `src/curriculumProgress/progress.ts`, `progress.test.ts` — new `buildClassActivityTimeline()` + 3 tests.
- `src/app/api/lesson-plan/generate/route.ts`, `src/app/api/exam/generate/route.ts` — accept `classId` + `classContextSource`, server-resolve via the new helper.
- `src/app/lesson-plan/page.tsx` — class context source selector + mini-timeline.
- `src/app/exam/page.tsx` — class context source selector + four download buttons (docx/pdf for exam and answers).
- `src/app/curriculum/page.tsx` — activity timeline panel and component.
- `package.json` — `test:progress` now includes `classContextResolver.test.ts`.
- `CHECKPOINT.md`, `docs/lesson-plan-signoff.md` — updated.
