# Eval Framework — Math Teacher AI Assistant

## Why Evals, Not Unit Tests
LLM outputs are non-deterministic. Unit tests that assert exact string matches will be
brittle and misleading. Instead, we use an eval framework: structured rubrics scored by
a judge model (or human spot-check), with pass/fail thresholds per MVP.

## Contract
- Every MVP that produces AI output ships with an eval suite in `/evals/mvpN/`
- Rubric is defined and agreed with user BEFORE implementation starts (not after)
- Run via: `npm run test:evals` (calls `node evals/run.js`)
- Scores are recorded in PROGRESS.md before the MVP is marked complete
- No MVP merges to main without passing eval score

## Directory Structure
```
evals/
├── README.md           (this file)
├── run.js              (eval runner — create at MVP 1)
├── mvp1/
│   ├── README.md       (rubric for lesson plan generator)
│   ├── cases/          (input/expected pairs)
│   └── results/        (timestamped score outputs — gitignored)
├── mvp2/
│   ├── README.md       (rubric for exercise generator)
│   └── ...
└── ...
```

## MVP 1 Eval Rubric (lesson plan generator) — TO BE AGREED BEFORE IMPLEMENTATION
Draft criteria (confirm with user before finalising):

| Criterion | Weight | Pass threshold |
|-----------|--------|---------------|
| Opening exercise present and marked as independent work during admin | 15% | 100% |
| Independent work is last phase, ≥15 min (≥30 min for 90-min review) | 15% | 100% |
| Duration of all phases sums to lesson duration | 10% | 100% |
| teacherNotes instructions honored (if provided) | 20% | 100% |
| Topic matches curriculum unit (if curriculumTopicId provided) | 15% | ≥95% |
| Hebrew quality (fluency, terminology) — judge model | 15% | ≥80% |
| Structural similarity to real example plans | 10% | ≥75% |

## MVP 2 Eval Rubric (exercise generator) — TBD at MVP 2 start
Requires: math verifier decided and running. Do not define until then.

## Judge Model
Default: Claude API with a strict rubric prompt.
For math correctness: defer to IMathVerifier (Wolfram/SymPy), not the judge model.
