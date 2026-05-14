import type { ExerciseRef, LessonPhase, LessonPlan } from '../types/lessonPlan';

export function renderLessonPlanMarkdown(plan: LessonPlan): string {
  const lines: string[] = [
    `# מערך שיעור - ${plan.topic}`,
    '',
    `כיתה: ${plan.grade}`,
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
    lines.push('## הערות למורה', '', plan.teacherNotes, '');
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
    renderExercises(lines, plan.homework);
  }

  return lines.join('\n').trimEnd() + '\n';
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

function renderExercises(lines: string[], exercises: ExerciseRef[]) {
  exercises.forEach((exercise, index) => {
    const label = exercise.textbookRef
      ? `עמוד ${exercise.textbookRef.page}, תרגיל ${exercise.textbookRef.exerciseId}`
      : exercise.generatedContent ?? 'תרגיל';
    lines.push(`${index + 1}. ${label}`);
    lines.push(`   מצב עבודה: ${exercise.practiceMode}; זמן משוער: ${exercise.estimatedMinutes} דקות`);
    if (exercise.notes) {
      lines.push(`   הערות: ${exercise.notes}`);
    }
  });
  lines.push('');
}
