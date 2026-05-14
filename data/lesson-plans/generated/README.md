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
