# CHECKPOINT.md — In-flight state (overwrite freely)

> Live cursor for the current task. PROGRESS.md is the milestone log; this file is "where I am RIGHT NOW".

## Current task
Lesson-plan UI readiness for 3 specific subjects.

## Last action that succeeded
- Fixed `parse_spread.py` detail extraction: NOISE_MARKERS now skipped (continue) instead of breaking collection.
- Ran parser on grade 7 and grade 8 spreads: extracted objectives for all middle school topics.
- Extracted 12 complex numbers objectives from year-12 raw PDF text (prose format, different from middle school table format).
- Hand-cleaned garbled math notation in complex numbers objectives and noisy items in grade 7/8.
- Wrote objectives to `subTopics[].learningObjectives` (not top-level `topic.learningObjectives`) to match the `CurriculumSubTopic` type.
- Updated test assertion to match new parser-extracted objective text.
- Playwright verified all 3 target subjects show hints in the UI:
  - יב' + מספרים מרוכבים: 12 objectives
  - ז' + פתרון משוואות: 4 objectives
  - ח' + משפט פיתגורס: 3 objectives
- Prior session work still in place: CurriculumHints UI component, cross-grade lookup, fallback chain, "(חובה)" teacher field.
- `npm test` passes: 17 suites, 120 tests, 100% coverage.
- `npm run type-check` passes.

## What I'm about to do next
- Teacher can use `localhost:3000/lesson-plan` for all 3 subjects.
- Pending: teacher test-drive, then iterate on output quality if needed.

## Open question / waiting on user
- Whether to commit this batch.

## Files modified (this + prior session)
- `scripts/parse-curriculum/parse_spread.py` — fixed NOISE_MARKERS from break to continue
- `data/curriculum/middle-school-grade7.json` — populated subTopic learningObjectives for 16 topics
- `data/curriculum/middle-school-grade8.json` — populated subTopic learningObjectives for 15 topics
- `data/curriculum/high-school-5units-year12.json` — 12 clean objectives for complex-numbers
- `src/lessonPlan/curriculumContext.test.ts` — updated assertion for new objective text
- `src/lessonPlan/curriculumContext.ts` — cross-grade lookup, same-stage filtering, sourceGrade label, objectives removed from prompt render
- `src/exam/backends.ts` — claudeCliBackend, fallbackChain, runtime fallback factory
- `src/exam/backends.test.ts` — CLI backend + fallback chain tests
- `src/lessonPlan/LessonPlanGenerator.test.ts` — handles claude CLI availability
- `src/app/lesson-plan/page.tsx` — CurriculumHints component, "(חובה)" label, cross-grade topic labels
