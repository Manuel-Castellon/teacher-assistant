import grade7 from '../../data/curriculum/middle-school-grade7.json';
import grade8 from '../../data/curriculum/middle-school-grade8.json';
import grade9 from '../../data/curriculum/middle-school-grade9.json';
import year10 from '../../data/curriculum/high-school-5units-year10.json';
import year11 from '../../data/curriculum/high-school-5units-year11.json';
import year12 from '../../data/curriculum/high-school-5units-year12.json';
import type { CurriculumTopic, CurriculumUnit } from '../types/curriculum';
import type { GradeLevel } from '../types/shared';

export interface LessonPlanCurriculumTopic {
  id: string;
  name: string;
  recommendedHours: number;
  learningObjectives: string[];
}

export interface LessonPlanCurriculumContext {
  unitId: string;
  academicYear: string;
  sourceUrl: string;
  topics: LessonPlanCurriculumTopic[];
  selectedTopic?: LessonPlanCurriculumTopic;
}

const CURRICULUM_BY_GRADE: Record<GradeLevel, CurriculumUnit> = {
  זי: grade7 as CurriculumUnit,
  חי: grade8 as CurriculumUnit,
  טי: grade9 as CurriculumUnit,
  יי: year10 as CurriculumUnit,
  יאי: year11 as CurriculumUnit,
  יבי: year12 as CurriculumUnit,
};

function toLessonPlanTopic(topic: CurriculumTopic): LessonPlanCurriculumTopic {
  return {
    id: topic.id,
    name: topic.name,
    recommendedHours: topic.recommendedHours,
    learningObjectives: topic.subTopics.flatMap(subTopic => subTopic.learningObjectives),
  };
}

export function getLessonPlanCurriculumContext(
  grade: GradeLevel,
  selectedTopicId?: string,
): LessonPlanCurriculumContext {
  const unit = CURRICULUM_BY_GRADE[grade];
  const topics = unit.topics.map(toLessonPlanTopic);
  const selectedTopic = selectedTopicId
    ? topics.find(topic => topic.id === selectedTopicId)
    : undefined;

  return {
    unitId: unit.id,
    academicYear: unit.academicYear,
    sourceUrl: unit.sourceUrl,
    topics,
    ...(selectedTopic ? { selectedTopic } : {}),
  };
}

export function renderLessonPlanCurriculumContext(context: LessonPlanCurriculumContext): string {
  const lines = [
    '## הקשר מתכנית הלימודים',
    `מקור תוכנית: ${context.unitId}, שנת ${context.academicYear}`,
    `קישור מקור: ${context.sourceUrl}`,
    '',
  ];

  if (context.selectedTopic) {
    lines.push(
      `נושא שנבחר: ${context.selectedTopic.name} (${context.selectedTopic.recommendedHours} שעות)`,
      '',
      'יעדי למידה רלוונטיים:',
    );

    if (context.selectedTopic.learningObjectives.length === 0) {
      lines.push('- לא הוזנו יעדי למידה מפורטים לנושא זה בקובץ הסילבוס המקומי.');
    } else {
      for (const objective of context.selectedTopic.learningObjectives) {
        lines.push(`- ${objective}`);
      }
    }
  } else {
    lines.push('נושאים זמינים לשכבה:', ...context.topics.map(topic => `- ${topic.name} (${topic.recommendedHours} שעות)`));
  }

  return lines.join('\n');
}
