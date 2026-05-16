# Lesson Plan Sign-Off

Use this page instead of expanding `CLAUDE.md` with more operational reminders.

## Current Model Choices

The `/lesson-plan` UI exposes explicit model choices:

- `אוטומטי`: current fallback chain from `createDefaultBackend()`.
- `Gemini 2.5 Flash`: `gemini-2.5-flash`.
- `Gemini 3 Flash Preview`: `gemini-3-flash-preview`.
- `Gemini 2.5 Pro`: `gemini-2.5-pro`; may fail if the active free Gemini key does not have access.
- `Claude CLI`: requires local `claude`.
- `GPT-5.5 (Codex)`: local `codex exec`, run as an ephemeral read-only completion backend.

Anthropic API backend support still exists in code for a future key, but it is not exposed in the lesson-plan UI or current sign-off path.

Observed quality order on 2026-05-14:

1. GPT-5.5 (Codex)
2. Claude CLI, not yet re-smoked in the final pass
3. Gemini 2.5 Pro, if the key has access; failed for the current free key
4. Gemini 3 Flash Preview
5. Gemini 3.1 Flash-Lite, not wired yet
6. Gemini 2.5 Flash

## Sign-Off Command

For deterministic checks before handing off lesson-plan work:

```bash
npm run test:signoff
```

For a narrower lesson-plan pass:

```bash
npm run test:lesson-plan
```

These scripts encode the core pipeline checks so future sessions do not need to
remember the individual Jest paths.

## Browser Smoke

Use `/lesson-plan` with a known prompt and an explicit model choice. The current
approved reference path is:

- model: `GPT-5.5 (Codex)`
- grade: `יא'`
- duration: `90 דקות`
- lesson type: `תרגול`
- topic: `מספרים מרוכבים`
- curriculum topic: `מספרים מרוכבים (תכנית יב')`

Expected result:

- generation completes and invariant checks pass;
- preview includes `דגשים למורה`;
- preview/export do not include `מצב עבודה`, `זמן משוער`, or internal enum values;
- PDF and DOCX downloads both complete.

Approved PDF references live in `data/lesson-plans/generated/`:

- `grade7-equations-common-denominator-90min-approved-gpt55.pdf`
- `grade11-complex-algebra-90min-approved-gpt55.pdf`

## Real Model Worksheet Sign-Off — 2026-05-16

Scope:

- model: `Gemini 3 Flash Preview`
- grade: `ז'`
- duration: `90 דקות`
- lesson type: `תרגול`
- topic: `משוואות`
- sub-topic: `פתרון משוואות עם מכנה משותף`
- curriculum topic: `ms-grade7-t03`
- teacher request: heterogeneous class, short review, common mistakes, graded practice
- teacher notes: class struggles with common denominators and minus signs

Mechanical result:

- worksheet on: generation completed, JSON parsed, invariant checks passed, and the rendered plan included `דף עבודה לתלמידים`;
- worksheet off: generation completed, JSON parsed, invariant checks passed, and the rendered plan avoided a worksheet section while still giving notebook/self practice;
- API/prompt contract for the worksheet toggle is therefore structurally signed off.

Quality result:

- not approved for unsupervised teacher-ready use;
- answer keys contained wrong algebra answers in both variants;
- worksheet-off included a malformed `\frac` escape in one displayed equation;
- conclusion: Gemini 3 Flash Preview is acceptable for smoke tests and UI flow checks, but generated math exercises/answer keys need teacher review or deterministic verification before classroom use.

Manual Teacher Steps

Before approving a generated lesson plan for real use, the teacher should:

1. Check every exercise answer key, including warm-up, board practice, independent work, worksheet, and homework.
2. Verify that the difficulty progression matches the actual class: basic examples first, then common-denominator work, then minus/sign traps.
3. Confirm that the timing is realistic for the class and that independent work is at least 15 minutes, preferably 30 minutes in a 90-minute practice lesson.
4. Decide whether the worksheet should be printed, copied into a notebook workflow, or replaced with textbook/classroom exercises.
5. Mark any generated item as either usable, needs edit, or reject.
6. After teaching, record what actually happened in the post-lesson update panel: status, hours taught, date, and notes for the next lesson.

Next Engineering Step

The first math-answer verification pass is now wired into `/api/lesson-plan/generate` for generated worksheets. Worksheet exercises that include structured `verificationItem` data are checked with SymPy and surfaced in the `/lesson-plan` result panel; missing or failed checks warn the teacher before printing.

Wolfram remains a good fallback candidate for later parser gaps, but not the default verifier: SymPy is offline, deterministic, faster, and already uses structured inputs. Use Wolfram only for cases SymPy cannot model cleanly, and keep its network/quota failures non-blocking.

## Pipeline Notes

- Manual Markdown artifacts still export through `scripts/export-markdown.mjs`.
- Browser exports use `/api/exam/export`, backed by `src/exam/exportDocx.ts` and
  `src/exam/exportPdf.ts`.
- The renderer owns teacher-facing cleanup. Do not push presentation fixes into
  the model prompt if deterministic rendering can enforce them.
- Prompt changes should be versioned in `LESSON_PLAN_PROMPT_VERSION` and tested
  against the approved references.
