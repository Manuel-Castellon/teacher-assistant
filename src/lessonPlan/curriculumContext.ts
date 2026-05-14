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
  sourceGrade?: string;
}

export interface LessonPlanCurriculumContext {
  unitId: string;
  academicYear: string;
  sourceUrl: string;
  topics: LessonPlanCurriculumTopic[];
  selectedTopic?: LessonPlanCurriculumTopic;
}

export const CUSTOM_LESSON_PLAN_TOPIC_ID = 'custom';

const CURRICULUM_BY_GRADE: Record<GradeLevel, CurriculumUnit> = {
  זי: grade7 as CurriculumUnit,
  חי: grade8 as CurriculumUnit,
  טי: grade9 as CurriculumUnit,
  יי: year10 as CurriculumUnit,
  יאי: year11 as CurriculumUnit,
  יבי: year12 as CurriculumUnit,
};

const ALL_CURRICULA: CurriculumUnit[] = Object.values(CURRICULUM_BY_GRADE);

const GRADE_LABELS: Record<GradeLevel, string> = {
  זי: "ז'",
  חי: "ח'",
  טי: "ט'",
  יי: "י'",
  יאי: "יא'",
  יבי: "יב'",
};

const UNIT_TO_GRADE: Map<string, GradeLevel> = new Map(
  (Object.entries(CURRICULUM_BY_GRADE) as [GradeLevel, CurriculumUnit][]).map(
    ([grade, unit]) => [unit.id, grade],
  ),
);

function toLessonPlanTopic(topic: CurriculumTopic): LessonPlanCurriculumTopic {
  return {
    id: topic.id,
    name: topic.name,
    recommendedHours: topic.recommendedHours,
    learningObjectives: topic.subTopics.flatMap(subTopic => subTopic.learningObjectives),
  };
}

function findTopicAcrossGrades(topicId: string): LessonPlanCurriculumTopic | undefined {
  for (const unit of ALL_CURRICULA) {
    const match = unit.topics.find(t => t.id === topicId);
    if (match) return toLessonPlanTopic(match);
  }
  return undefined;
}

export function getLessonPlanCurriculumContext(
  grade: GradeLevel,
  selectedTopicId?: string,
): LessonPlanCurriculumContext {
  const unit = CURRICULUM_BY_GRADE[grade];
  const topics = unit.topics.map(toLessonPlanTopic);
  let selectedTopic: LessonPlanCurriculumTopic | undefined;
  if (selectedTopicId) {
    selectedTopic = topics.find(topic => topic.id === selectedTopicId)
      ?? findTopicAcrossGrades(selectedTopicId);
  }

  return {
    unitId: unit.id,
    academicYear: unit.academicYear,
    sourceUrl: unit.sourceUrl,
    topics,
    ...(selectedTopic ? { selectedTopic } : {}),
  };
}

const MIDDLE_SCHOOL: Set<GradeLevel> = new Set(['זי', 'חי', 'טי']);
const HIGH_SCHOOL: Set<GradeLevel> = new Set(['יי', 'יאי', 'יבי']);

function sameStage(a: GradeLevel, b: GradeLevel): boolean {
  return (MIDDLE_SCHOOL.has(a) && MIDDLE_SCHOOL.has(b))
    || (HIGH_SCHOOL.has(a) && HIGH_SCHOOL.has(b));
}

export function getLessonPlanCurriculumTopicOptions(grade: GradeLevel): LessonPlanCurriculumTopic[] {
  const own = getLessonPlanCurriculumContext(grade).topics;
  const ownIds = new Set(own.map(t => t.id));
  const extras: LessonPlanCurriculumTopic[] = [];
  for (const unit of ALL_CURRICULA) {
    if (unit.id === CURRICULUM_BY_GRADE[grade].id) continue;
    const unitGrade = UNIT_TO_GRADE.get(unit.id);
    /* istanbul ignore next -- UNIT_TO_GRADE always covers ALL_CURRICULA */
    if (!unitGrade || !sameStage(grade, unitGrade)) continue;
    const sourceGrade = GRADE_LABELS[unitGrade];
    for (const topic of unit.topics) {
      if (!ownIds.has(topic.id)) {
        extras.push({ ...toLessonPlanTopic(topic), sourceGrade });
        ownIds.add(topic.id);
      }
    }
  }
  return [...own, ...extras];
}

export function validateLessonPlanRequestCurriculumTopic(
  _grade: GradeLevel,
  selectedTopicId?: string,
): string[] {
  if (!selectedTopicId || selectedTopicId === CUSTOM_LESSON_PLAN_TOPIC_ID) return [];
  if (findTopicAcrossGrades(selectedTopicId)) return [];
  return [`נושא תכנית הלימודים "${selectedTopicId}" לא נמצא בתכנית הלימודים.`];
}

export function renderLessonPlanCurriculumContext(context: LessonPlanCurriculumContext): string {
  const lines = [
    '## הקשר מתכנית הלימודים',
    `מקור תוכנית: ${context.unitId}, שנת ${context.academicYear}`,
    `קישור מקור: ${context.sourceUrl}`,
    '',
  ];

  if (context.selectedTopic) {
    lines.push(`נושא שנבחר: ${context.selectedTopic.name} (${context.selectedTopic.recommendedHours} שעות)`);
  } else {
    lines.push('נושאים זמינים לשכבה:', ...context.topics.map(topic => `- ${topic.name} (${topic.recommendedHours} שעות)`));
  }

  return lines.join('\n');
}
