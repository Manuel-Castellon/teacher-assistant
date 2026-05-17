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

      if (q.diagramSvg) {
        lines.push(`![שרטוט](data:image/svg+xml;base64,${svgToBase64(q.diagramSvg)})`);
        lines.push('');
      }

      if (q.diagramDescription) {
        lines.push(q.diagramSvg ? `תיאור שרטוט: ${q.diagramDescription}` : `[שרטוט: ${q.diagramDescription}]`);
        lines.push('');
      }

      for (const sub of q.subQuestions) {
        for (const line of renderSubQuestionLines(sub.label, sub.content)) {
          lines.push(line);
          lines.push('');
        }
      }
    }
  }

  lines.push('בהצלחה!');

  if (exam.questionBankAttributions?.length) {
    lines.push('', '---', '', 'ייחוס שאלות מבנק השאלות:');
    for (const attribution of exam.questionBankAttributions) {
      lines.push(`- ${renderAttribution(attribution)}`);
    }
  }

  return lines.join('\n');
}

function renderAttribution(attribution: NonNullable<GeneratedExam['questionBankAttributions']>[number]): string {
  const p = attribution.provenance;
  const parts = [
    p.sourceTitle,
    p.author,
    p.publisher,
    p.year ? String(p.year) : undefined,
    p.pageNumber !== undefined ? `עמ' ${p.pageNumber}` : undefined,
    p.exerciseNumber ? `תרגיל ${p.exerciseNumber}` : undefined,
  ].filter(Boolean);
  return parts.join(' · ');
}

function renderSubQuestionLines(label: string, content: string): string[] {
  const contentLines = content
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);
  if (contentLines.length === 0) return [label];
  return contentLines.map((line, index) => index === 0 ? `${label} ${line}` : line);
}

function svgToBase64(svg: string): string {
  return Buffer.from(svg, 'utf-8').toString('base64');
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
