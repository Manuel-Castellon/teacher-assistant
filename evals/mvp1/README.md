# MVP 1 Evals — Lesson Plan Generator

## Status

**Awaiting user sign-off on rubric.** Per AGENTS.md the rubric must be agreed before MVP 1 implementation merges. The harness here scores only the deterministic criteria; the LLM-judged criteria are stubbed and will be filled in once the rubric is approved.

## Proposed rubric (draft from `evals/README.md`)

| # | Criterion | Type | Pass threshold |
|---|-----------|------|---------------|
| 1 | Opening exercise present and is `practiceMode='עצמאי'` | Deterministic | 100% |
| 2 | independentWork last and ≥15 min (≥30 min on 90-min review) | Deterministic | 100% |
| 3 | Phase durations sum to lesson duration | Deterministic | 100% |
| 4 | Bagrut review has studentSurveyTopic + bagrut_archive sources | Deterministic | 100% |
| 5 | teacherNotes (הערה לקלוד) honored when supplied | Judge model | 100% |
| 6 | Topic matches `curriculumTopicId` curriculum data | Deterministic | ≥95% |
| 7 | Hebrew quality / fluency / terminology | Judge model | ≥80% |
| 8 | Structural similarity to real example plans | Judge model | ≥75% |

Criteria 1–4 are covered today by `src/lessonPlan/validateInvariants.ts`. The harness reuses that validator. Criteria 5, 7, 8 need a judge prompt + threshold sign-off. Criterion 6 needs the curriculum-lookup helper (lands with the first MVP that reads curriculum from disk — likely MVP 4, but a stub is fine for MVP 1 if the case omits `curriculumTopicId`).

## Running

```
npm run test:evals
```

Reads `cases/*.json`, runs the harness on each, writes a timestamped result file under `results/`. Deterministic violations fail the case; judge-scored criteria are reported but don't fail until the rubric is signed off.

## Case format

Each `cases/<name>.json` is a `LessonPlanRequest` (see `src/types/lessonPlan.ts`):

```json
{
  "topic": "משפט פיתגורס",
  "subTopic": "שימושים",
  "grade": "חי",
  "duration": 45,
  "lessonType": "שגרה",
  "teacherNotes": "פתחו בעצמאית קצרה."
}
```

## Live model vs fake

`harness.mjs` reads `EVAL_MODE`:

- `EVAL_MODE=fake` (default) — uses a deterministic stub generator. Verifies the harness wiring without spending tokens.
- `EVAL_MODE=live` — calls the real Claude API via `ClaudeTextGenerator`. Requires `ANTHROPIC_API_KEY`.

CI should run `fake`. The teacher / dev runs `live` before recording scores in PROGRESS.md.
