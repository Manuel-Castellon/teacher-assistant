import type { LessonType } from '../types/lessonPlan';

export function supportsWorksheetForLessonType(lessonType: LessonType): boolean {
  return lessonType !== 'מבחן';
}

export function resolveIncludeWorksheet(
  lessonType: LessonType,
  requested: boolean | undefined,
): boolean {
  if (!supportsWorksheetForLessonType(lessonType)) return false;
  return requested ?? true;
}

export function renderWorksheetPreference(includeWorksheet: boolean): string {
  return includeWorksheet ? 'כן - ליצור דף עבודה לתלמידים' : 'לא - לא ליצור דף עבודה לתלמידים';
}
