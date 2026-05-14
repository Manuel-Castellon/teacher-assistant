import type { BonusRubric, ExamRubric, RubricCriterion, RubricQuestion, RubricSubQuestion } from './types';

export function renderExamRubricMarkdown(rubric: ExamRubric): string {
  const lines: string[] = [
    `# מחוון - ${rubric.title}`,
    '',
    `כיתה: ${rubric.className}`,
    '',
    `תאריך: ${rubric.date}`,
    '',
    `ניקוד כולל: ${rubric.totalPoints}`,
    '',
  ];

  if (rubric.projectLearnings.length > 0) {
    lines.push('## לקחים לפרויקט', '');
    for (const learning of rubric.projectLearnings) {
      lines.push(`- ${learning}`);
    }
    lines.push('');
  }

  for (const question of rubric.questions) {
    renderQuestion(lines, question);
  }

  if (rubric.bonus) {
    renderBonus(lines, rubric.bonus);
  }

  return lines.join('\n').trimEnd() + '\n';
}

function renderQuestion(lines: string[], question: RubricQuestion) {
  lines.push(`## שאלה ${question.questionNumber} - ${question.title} (${question.maxPoints} נק')`, '');
  lines.push(`נושא: ${question.topic}`, '');

  for (const subQuestion of question.subQuestions) {
    renderSubQuestion(lines, subQuestion);
  }
}

function renderSubQuestion(lines: string[], subQuestion: RubricSubQuestion) {
  lines.push(`### סעיף ${subQuestion.label} (${subQuestion.maxPoints} נק')`, '');
  lines.push(`תשובה צפויה: ${subQuestion.expectedAnswer}`, '');

  if (subQuestion.acceptedAlternatives?.length) {
    lines.push('חלופות מתקבלות:', '');
    for (const alternative of subQuestion.acceptedAlternatives) {
      lines.push(`- ${alternative}`);
    }
    lines.push('');
  }

  renderCriteria(lines, subQuestion.criteria);

  if (subQuestion.commonMistakes?.length) {
    lines.push('טעויות נפוצות להורדה:', '');
    for (const mistake of subQuestion.commonMistakes) {
      lines.push(`- ${mistake}`);
    }
    lines.push('');
  }
}

function renderBonus(lines: string[], bonus: BonusRubric) {
  lines.push(`## בונוס (עד ${bonus.maxPoints} נק' בונוס)`, '');
  lines.push(bonus.prompt, '');
  lines.push(`תשובה צפויה: ${bonus.expectedAnswer}`, '');
  renderCriteria(lines, bonus.criteria);
}

function renderCriteria(lines: string[], criteria: RubricCriterion[]) {
  lines.push('| קריטריון | נקודות |', '|---|---:|');
  for (const criterion of criteria) {
    lines.push(`| ${criterion.description} | ${criterion.points} |`);
  }
  lines.push('');
}
