import grade7 from '../../data/curriculum/middle-school-grade7.json';
import grade8 from '../../data/curriculum/middle-school-grade8.json';
import grade9 from '../../data/curriculum/middle-school-grade9.json';
import year10 from '../../data/curriculum/high-school-5units-year10.json';
import year11 from '../../data/curriculum/high-school-5units-year11.json';
import year12 from '../../data/curriculum/high-school-5units-year12.json';
import type { CurriculumUnit } from '../types/curriculum';
import type { GradeLevel } from '../types/shared';
import type { ExamRequest } from './types';

export interface CurriculumTopicScope {
  id: string;
  name: string;
  recommendedHours: number;
}

export interface CurriculumExamScope {
  unitId: string;
  academicYear: string;
  sourceUrl: string;
  topics: CurriculumTopicScope[];
  outOfScopeExamples: string[];
}

export const CUSTOM_CURRICULUM_TOPIC_ID = '__custom__';

const CURRICULUM_BY_GRADE: Record<GradeLevel, CurriculumUnit> = {
  זי: grade7 as CurriculumUnit,
  חי: grade8 as CurriculumUnit,
  טי: grade9 as CurriculumUnit,
  יי: year10 as CurriculumUnit,
  יאי: year11 as CurriculumUnit,
  יבי: year12 as CurriculumUnit,
};

const OUT_OF_SCOPE_EXAMPLES_BY_GRADE: Record<GradeLevel, string[]> = {
  זי: [
    'מערכות משוואות',
    'פונקציה קווית פורמלית: שיפוע, חיתוך עם הצירים ומשוואת ישר',
    'משוואות ריבועיות',
    'משוואות עם נעלם במכנה',
    'דמיון משולשים, פיתגורס וטריגונומטריה',
  ],
  חי: [
    'משוואות ריבועיות',
    'טריגונומטריה',
    'חדו"א',
  ],
  טי: [
    'חדו"א',
    'וקטורים',
    'מספרים מרוכבים',
  ],
  יי: [
    'חדו"א מתקדם של י"א/י"ב',
    'וקטורים',
    'מספרים מרוכבים',
  ],
  יאי: [
    'מספרים מרוכבים',
    'שאלות בגרות י"ב שלא נלמדו עדיין',
  ],
  יבי: [
    'נושאים מחוץ ל-5 יח"ל מתמטיקה',
  ],
};

export function getCurriculumExamScope(grade: GradeLevel): CurriculumExamScope {
  const unit = CURRICULUM_BY_GRADE[grade];
  return {
    unitId: unit.id,
    academicYear: unit.academicYear,
    sourceUrl: unit.sourceUrl,
    topics: unit.topics.map(topic => ({
      id: topic.id,
      name: topic.name,
      recommendedHours: topic.recommendedHours,
    })),
    outOfScopeExamples: OUT_OF_SCOPE_EXAMPLES_BY_GRADE[grade],
  };
}

export function getCurriculumTopicOptions(grade: GradeLevel): CurriculumTopicScope[] {
  return getCurriculumExamScope(grade).topics;
}

export function validateExamRequestCurriculumTopics(request: ExamRequest): string[] {
  const knownTopicIds = new Set(getCurriculumTopicOptions(request.grade).map(topic => topic.id));
  const errors: string[] = [];

  request.parts.forEach((part, partIdx) => {
    part.questionSpecs.forEach((question, questionIdx) => {
      const topicId = question.curriculumTopicId?.trim();
      if (!topicId) return;

      const questionLabel = `חלק ${partIdx + 1}, שאלה ${questionIdx + 1}`;
      if (topicId === CUSTOM_CURRICULUM_TOPIC_ID) {
        if (!question.topic.trim()) {
          errors.push(`${questionLabel}: יש למלא פירוט חופשי כשבוחרים "אחר"`);
        }
        return;
      }

      if (!knownTopicIds.has(topicId)) {
        errors.push(`${questionLabel}: נושא הסילבוס שנבחר אינו שייך לשכבת הגיל`);
      }
    });
  });

  return errors;
}

export function renderCurriculumExamScope(scope: CurriculumExamScope): string {
  const lines = [
    '## סילבוס / תוכנית לימודים מחייבת',
    `מקור תוכנית: ${scope.unitId}, שנת ${scope.academicYear}`,
    `קישור מקור: ${scope.sourceUrl}`,
    '',
    'נושאים מותרים לשכבה זו:',
    ...scope.topics.map(topic => `- ${topic.name} (${topic.recommendedHours} שעות)`),
    '',
    'כל שאלה חייבת להישאר בתוך הנושאים המותרים לעיל וברמת העומק המתאימה להם.',
    'אין להכניס חומר מתקדם יותר גם אם כותרת הבקשה כללית, אלא אם המורה כתבה במפורש בהערות שמותר לחרוג מהסילבוס.',
    'אם נושא שהמורה הזינה רחב מדי, צור גרסה שמתאימה לרשימת הנושאים המותרים בלבד.',
    '',
    'דוגמאות לחומר שאסור לשלב ללא אישור מפורש מהמורה:',
    ...scope.outOfScopeExamples.map(example => `- ${example}`),
  ];

  return lines.join('\n');
}
