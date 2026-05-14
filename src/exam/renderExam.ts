import type { GeneratedExam } from './types';

// RTL rendering pattern: every logical line becomes its own paragraph
// (separated by a blank line in markdown). This prevents Word from merging
// Hebrew text with LTR math expressions into a single bidi paragraph,
// which causes display artifacts on Windows.

export function renderExamMarkdown(exam: GeneratedExam): string {
  const lines: string[] = [];

  lines.push('# שם ומשפחה:________________');
  lines.push('');

  const title = [
    exam.header.examNumber != null ? `מבחן ${exam.header.examNumber}` : 'מבחן',
    `ב${exam.header.subject}`,
    exam.header.className,
    exam.header.date,
  ].join('- ');
  lines.push(`## ${title}`);
  lines.push('');

  for (const part of exam.parts) {
    lines.push(`### ${part.title}`);
    lines.push('');

    for (const q of part.questions) {
      lines.push(`#### שאלה ${q.questionNumber} (${q.points} נק')`);
      lines.push('');

      if (q.instruction) {
        lines.push(q.instruction);
        lines.push('');
      }

      if (q.givenData?.length) {
        for (const datum of q.givenData) {
          lines.push(datum);
          lines.push('');
        }
      }

      if (q.diagramDescription) {
        lines.push(`[שרטוט: ${q.diagramDescription}]`);
        lines.push('');
      }

      for (const sub of q.subQuestions) {
        lines.push(`${sub.label} ${sub.content}`);
        lines.push('');
      }
    }
  }

  lines.push('בהצלחה!');
  return lines.join('\n');
}

export function renderAnswerKeyMarkdown(exam: GeneratedExam): string {
  const lines: string[] = [];

  const title = exam.header.examNumber != null
    ? `פתרון מבחן ${exam.header.examNumber}`
    : 'פתרון המבחן';
  lines.push(`# ${title}`);
  lines.push('');

  for (const solution of exam.answerKey) {
    lines.push(`## שאלה ${solution.questionNumber}`);
    lines.push('');

    for (const sub of solution.subAnswers) {
      lines.push(`**${sub.label}**`);
      lines.push('');
      for (const step of sub.steps) {
        lines.push(step);
        lines.push('');
      }
      lines.push(`**תשובה:** ${sub.finalAnswer}`);
      lines.push('');
    }
  }

  return lines.join('\n');
}
