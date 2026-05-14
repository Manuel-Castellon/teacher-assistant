# MVP 2 Eval Suite — Exam Generation

Deterministic smoke cases for the exam generator contract. These are fake-output
cases by design: live LLM quality is reviewed by the teacher, while this suite
guards the request/schema/curriculum invariants that should hold before or after
generation.

## Deterministic Checks

- Selected `curriculumTopicId` belongs to the selected grade unless it is the
  explicit `__custom__` wildcard.
- Custom wildcard requests include teacher focus text.
- Generated fake output contains questions, answer keys, and verification items.
- Expected question type appears in the request.
- Case-specific banned terms are absent from generated question text.

Run with:

```bash
npm run test:evals
```
