// Shared primitive types used across the application

export type GradeLevel =
  | 'זי' | 'חי' | 'טי'   // middle school: ז' ח' ט'
  | 'יי' | 'יאי' | 'יבי'; // high school: י' יא' יב'

export type UnitLevel = 3 | 4 | 5; // יח"ל

export type EducationStage = 'חטיבת_ביניים' | 'תיכון'; // חטיבת_ביניים | תיכון

export type AcademicYear = string; // e.g. 'תשפ"ו' (תשפ"ו)

export type HebrewDate = string; // ISO 8601 date string
