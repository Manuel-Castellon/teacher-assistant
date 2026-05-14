# Generated Lesson Plans

Reusable lesson-plan artifacts created from teacher requests.

Each generated plan should have:

- a structured `.json` file following `src/types/lessonPlan.ts`;
- a teacher-readable `.md` file;
- original exercises unless explicit textbook page/exercise references are available;
- `curriculumTopicId` when the plan is tied to a local curriculum topic.
- a separate printable worksheet artifact whenever the lesson plan asks the
  teacher to distribute a `דף עבודה`; keep the teacher plan and student handout
  as separate files.

For textbook-inspired plans, use the textbook only for scope and sequencing unless
page/exercise references are explicitly available and allowed. Do not copy exercise
sets from copyrighted books into the repository.

Export a teacher-readable Markdown plan to DOCX and PDF with:

```bash
node scripts/export-markdown.mjs data/lesson-plans/generated/grade12-5units-complex-intro-45min.md
```

## Approved UI Outputs

These PDFs were generated through the `/lesson-plan` UI with `GPT-5.5 (Codex)` and
approved by the user as quality references:

- `grade7-equations-common-denominator-90min-approved-gpt55.pdf`
- `grade11-complex-algebra-90min-approved-gpt55.pdf`

They are PDF-only references because they came from the browser export flow, not the
manual Markdown artifact pipeline. Keep them as visual/quality examples for future
model comparisons.

Quality traits to preserve:

- includes `## דגשים למורה`;
- uses teacher-facing Hebrew, not raw implementation metadata;
- does not expose `מצב עבודה`, `זמן משוער`, or enum values such as `לוחות_מחיקה`;
- keeps math in printable math formatting;
- separates examples, board work, worksheet sections, and homework clearly.

Run the focused sign-off checks with:

```bash
npm run test:lesson-plan
```
