# Exam Rubrics

Structured rubrics for real or generated exams. These are designed for two uses:

- immediate teacher-facing מחוון documents;
- later MVP 6 supervised grading, where each sub-question can become a grading unit.

In MVP terms: rubric artifacts are immediately useful alongside MVP 2 exams, but
the reusable criterion model mainly belongs to MVP 6 grading infrastructure.

The JSON shape follows `src/examRubric/types.ts`. The Markdown files are rendered
or hand-kept from the same structure for easy review by the teacher.

Export a rubric Markdown file to DOCX and PDF with:

```bash
node scripts/export-markdown.mjs data/exam-rubrics/mivhan-b-may-26.md
```

The DOCX path uses the same RTL reference document and bidi post-processing as the
exam exporter. The PDF path uses headless Chrome for reliable Hebrew rendering.
