// Shared primitive types used across the application

export type GradeLevel =
  | 'זי' | 'חי' | 'טי'   // middle school: ז' ח' ט'
  | 'יי' | 'יאי' | 'יבי'; // high school: י' יא' יב'

const GRADE_LABELS: Record<GradeLevel, string> = {
  'זי': "ז'",
  'חי': "ח'",
  'טי': "ט'",
  'יי': "י'",
  'יאי': "יא'",
  'יבי': "יב'",
};

export function gradeLabel(grade: GradeLevel): string {
  return GRADE_LABELS[grade] ?? grade;
}

export type UnitLevel = 3 | 4 | 5; // יח"ל

export type EducationStage = 'חטיבת_ביניים' | 'תיכון'; // חטיבת_ביניים | תיכון

export type AcademicYear = string; // e.g. 'תשפ"ו' (תשפ"ו)

export type HebrewDate = string; // ISO 8601 date string
