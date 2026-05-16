import type { ExerciseRef, LessonPhase, LessonPlan } from '../types/lessonPlan';
import { gradeLabel } from '../types/shared';

export function renderLessonPlanMarkdown(plan: LessonPlan): string {
  const lines: string[] = [
    `# מערך שיעור - ${plan.topic}`,
    '',
    `כיתה: ${gradeLabel(plan.grade)}`,
    '',
    `משך: ${plan.duration} דקות`,
    '',
    `סוג שיעור: ${plan.lessonType}`,
    '',
    `תת-נושא: ${plan.subTopic}`,
    '',
  ];

  if (plan.textbook) {
    lines.push(
      '## מקורות',
      '',
      `- ${plan.textbook.name}${plan.textbook.grade ? `, ${plan.textbook.grade}` : ''}${plan.textbook.part ? `, חלק ${plan.textbook.part}` : ''}${plan.textbook.publisher ? `, ${plan.textbook.publisher}` : ''}`,
      '',
    );
  }

  if (plan.teacherNotes) {
    lines.push('## דגשים למורה', '', plan.teacherNotes, '');
  }

  lines.push('## מהלך השיעור', '');
  renderPhase(lines, plan.phases.opening);
  if (plan.phases.instruction) {
    renderPhase(lines, plan.phases.instruction);
  }
  renderPhase(lines, plan.phases.practice);
  renderPhase(lines, plan.phases.independentWork);

  lines.push('## שיעורי בית', '');
  if (plan.homework === null) {
    lines.push('אין שיעורי בית.', '');
  } else if (plan.homework.length === 0) {
    lines.push('לא הוגדרו שיעורי בית.', '');
  } else {
    renderExercises(lines, plan.homework, { numberGenerated: true });
  }

  return lines.join('\n').trimEnd() + '\n';
}

export function renderStudentWorksheetMarkdown(plan: LessonPlan): string | undefined {
  if (!hasWorksheet(plan)) return undefined;

  const lines: string[] = [
    `# דף עבודה - ${plan.topic}`,
    '',
    `כיתה: ${gradeLabel(plan.grade)}`,
    '',
    `נושא: ${plan.subTopic}`,
    '',
  ];

  if (plan.phases.independentWork.description) {
    lines.push(plan.phases.independentWork.description, '');
  }

  const exercises = plan.phases.independentWork.exercises;
  if (exercises.length === 0) return undefined;

  exercises.forEach((exercise, index) => {
    const content = renderExerciseContent(exercise);
    if (exercise.generatedContent && isStructuredMarkdown(content)) {
      lines.push(content);
    } else {
      lines.push(`${index + 1}. ${content}`);
    }
    lines.push('');
  });

  return lines.join('\n').trimEnd() + '\n';
}

function hasWorksheet(plan: LessonPlan): boolean {
  const independent = plan.phases.independentWork;
  const searchable = [
    independent.name,
    independent.description ?? '',
    ...independent.exercises.map(exercise => exercise.generatedContent ?? ''),
  ].join('\n');
  return /דף עבודה|worksheet/i.test(searchable);
}

function renderPhase(lines: string[], phase: LessonPhase) {
  lines.push(`### ${phase.name} (${phase.durationMinutes} דקות)`, '');
  if (phase.description) {
    lines.push(phase.description, '');
  }
  if (phase.teacherNotes) {
    lines.push(`דגשי מורה: ${phase.teacherNotes}`, '');
  }
  if (phase.exercises.length > 0) {
    renderExercises(lines, phase.exercises);
  }
}

function renderExercises(lines: string[], exercises: ExerciseRef[], opts: { numberGenerated?: boolean } = {}) {
  exercises.forEach((exercise, index) => {
    const content = renderExerciseContent(exercise);
    if (exercise.generatedContent) {
      appendGeneratedExercise(lines, content, index, opts.numberGenerated ?? false);
    } else {
      lines.push(`${index + 1}. ${content}`);
    }
    if (exercise.notes) {
      renderExerciseNote(lines, exercise.notes);
    }
    lines.push('');
  });
}

function renderExerciseContent(exercise: ExerciseRef): string {
  if (exercise.textbookRef) {
    return `עמוד ${exercise.textbookRef.page}, תרגיל ${exercise.textbookRef.exerciseId}`;
  }
  return exercise.generatedContent?.trim() || 'תרגיל';
}

function appendGeneratedExercise(lines: string[], content: string, index: number, numberGenerated: boolean) {
  if (!numberGenerated || isStructuredMarkdown(content)) {
    lines.push(content);
    return;
  }

  lines.push(`${index + 1}. ${content}`);
}

function isStructuredMarkdown(content: string): boolean {
  return content.includes('\n')
    || /^(\d+[.)]|[-*]\s|[א-ת][.)]\s|תרגיל[:\s]|דוגמה[:\s]|דף עבודה[:\s])/u.test(content);
}

function renderExerciseNote(lines: string[], note: string) {
  const trimmed = note.trim();
  if (trimmed.length <= 80) {
    lines.push('', `דגש: ${trimmed}`);
    return;
  }

  const label = /^פתרונות/u.test(trimmed) ? 'פתרונות קצרים למורה:' : 'דגשים למורה:';
  lines.push('', label);
  splitLongNote(trimmed).forEach(part => lines.push(`- ${part}`));
}

function splitLongNote(note: string): string[] {
  const withoutLabel = note.replace(/^פתרונות למורה[:：]?\s*/u, '').trim();
  return withoutLabel
    .split(/(?:\.\s+|;\s+|,\s+)(?=(?:\d+[א-ת]?|[א-ת]{1,2})\.)/u)
    .map(part => part.trim())
    .filter(Boolean);
}
