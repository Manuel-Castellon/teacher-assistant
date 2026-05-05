import type { GradeLevel, UnitLevel, EducationStage, AcademicYear } from './shared';

export interface CurriculumSubTopic {
  id: string;
  name: string;                    // Hebrew
  nameEn?: string;
  parentTopicId: string;
  learningObjectives: string[];    // Hebrew bullet points from Ministry PDF
}

export interface CurriculumTopic {
  id: string;
  name: string;                    // Hebrew
  nameEn?: string;
  subTopics: CurriculumSubTopic[];
  recommendedHours: number;        // Ministry guideline; actual pace varies
  gradeLevel: GradeLevel[];
  unitLevels: UnitLevel[];
  isBagrutTopic: boolean;
  prerequisites: string[];         // topic IDs
}

export interface CurriculumUnit {
  id: string;
  stage: EducationStage;
  unitLevel?: UnitLevel;           // only for תיכון (תיכון)
  gradeLevel: GradeLevel;
  academicYear: AcademicYear;      // must be תשפ"ו (תשפ"ו) or later
  topics: CurriculumTopic[];
  sourceUrl: string;               // Ministry PDF URL
  parsedAt: string;                // ISO date when JSON was generated from PDF
}

/** Tracks what has actually been taught in a specific class */
export interface TeacherProgress {
  id: string;
  curriculumUnitId: string;
  topicId: string;
  subTopicId?: string;
  classId: string;
  status: 'לא_הותחל' | 'בתהליך' | 'הושלם'; // לא_הותחל | בתהליך | הושלם
  hoursSpent: number;
  lastTaughtDate?: string;
  notes?: string;
  updatedAt: string;
}
