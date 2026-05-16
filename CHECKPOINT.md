# CHECKPOINT.md

## Last completed
- Session resumed from `CLAUDE.md`, `PROGRESS.md`, `CHECKPOINT.md`, `HANDOFF.md`, `MVP_STATUS.md`, and `AGENTS.md`.
- Current state stated: MVP 4 is active; missing slice is post-lesson update flow from generated/taught lesson back into class progress.
- Created branch `mvp-4-post-lesson-flow` from clean `main`.
- Inspected `src/curriculumProgress/progress.ts`, `serverStore.ts`, `/api/curriculum/classes`, `/curriculum`, `/lesson-plan`, `/exam`, and focused progress tests.
- Added `recordPostLessonProgress()` and focused tests for cumulative hours, last-taught date, status updates, and dated note appending.
- `npm run test:progress` passed: 9 progress/server-store tests.
- Wired `/lesson-plan` result view with an `עדכון אחרי השיעור` panel for selected class/topic: status, hours taught, date, actual notes, local cache update, and `/api/curriculum/classes` sync.
- Guarded post-lesson saves so only topics belonging to the selected class grade are written to class progress.
- `npm run type-check` passed after UI wiring.
- `npm run test:signoff` passed: type-check, 62 lesson-plan tests, 9 progress/server-store tests, MVP1 2/2 evals, MVP2 4/4 evals.
- `npm run build` passed.
- Started `npm run dev`; local app is serving on `http://localhost:3000`.
- `curl -I http://localhost:3000/lesson-plan` and `/curriculum` both returned `200 OK`.
- After interruption, restarted `npm run dev` and re-smoked `/lesson-plan`, `/curriculum`, and unauthenticated `/api/curriculum/classes`.
- `psql` is not installed in this shell and safe `.env.local` check did not find `DATABASE_URL`, so the DB migration was not applied from here.
- Playwright local fallback smoke passed: seeded a class and saved plan, opened `/lesson-plan?classId=playwright-class-7a&topicId=ms-grade7-t01`, saved post-lesson progress, and verified localStorage updated topic `ms-grade7-t01` to `completed`, `hoursSpent: 3.5`, `lastTaughtDate: 2026-05-16`, with the dated note appended.
- Playwright console check reported 0 warnings/errors.
- Re-ran `npm run test:progress` after resume/docs update; 9 tests passed.
- Updated `PROGRESS.md`, `HANDOFF.md`, and `MVP_STATUS.md` for the post-lesson flow.
- New priority completed: worksheet generation toggle for lesson plans.
- Added `includeWorksheet` to the lesson-plan request path, worksheet policy helper, UI checkbox, API prompt instructions, and generator prompt line.
- Worksheet toggle is visible for teachable lesson types and hidden/forced off for `מבחן`.
- Backed out repo-level Playwright dependency/config/spec churn; validation used the existing Playwright MCP browser instead.
- `npm run type-check` passed.
- `npm run test:lesson-plan` passed: 67 focused lesson-plan/API/prompt tests.
- Playwright MCP worksheet smoke passed: toggle off sent `includeWorksheet: false` and no worksheet result; toggle on sent `includeWorksheet: true` and rendered `דף עבודה לתלמידים`; `מבחן` hid the checkbox and sent `includeWorksheet: false`.
- Playwright MCP comprehensive loop passed: `/curriculum` suggestion -> `/lesson-plan` with worksheet -> post-lesson feedback -> `/exam` taught-material generation. The exam request included topic `ms-grade7-t01`, completed progress, cumulative `3.5` hours, and the dated feedback note.
- Playwright MCP console check reported 0 warnings/errors.
- `npm run test:signoff` passed: type-check, 67 lesson-plan tests, 9 progress/server-store tests, MVP1 2/2 evals, MVP2 4/4 evals.
- `npm run build` passed.
- Committed on branch `mvp-4-post-lesson-flow` with message `mvp-4: add worksheet toggle and post-lesson loop`.

## Next
- Try a real model generation with the worksheet toggle on/off and inspect whether the generated worksheet/key quality matches the hand-built artifacts in `data/lesson-plans/generated`.
- Try the full real-class loop with a teacher-selected class and real model output.
- DB migration remains tabled: apply later on a machine with `psql` and `DATABASE_URL`.

## Key files changed
- `src/curriculumProgress/progress.ts` — post-lesson update helper.
- `src/curriculumProgress/progress.test.ts` — post-lesson helper coverage.
- `src/app/lesson-plan/page.tsx` — post-lesson update panel and progress persistence from generated plans.
- `src/lessonPlan/worksheetPolicy.ts` — worksheet suitability/default policy.
- `src/lessonPlan/worksheetPolicy.test.ts`, `src/app/api/lesson-plan/generate/route.test.ts` — worksheet prompt contract tests.
- `src/types/lessonPlan.ts`, `src/lessonPlan/LessonPlanGenerator.ts`, `src/providers/impl/lessonPlanPrompt.ts`, `src/app/api/lesson-plan/generate/route.ts`, `src/app/lesson-plan/page.tsx` — worksheet toggle request/prompt/UI wiring.
- `package.json` — expanded `test:lesson-plan` to include worksheet contract tests.
- `PROGRESS.md`, `HANDOFF.md`, `MVP_STATUS.md`, `CHECKPOINT.md` — current status and next steps.
