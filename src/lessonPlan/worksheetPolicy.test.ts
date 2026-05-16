import {
  renderWorksheetPreference,
  resolveIncludeWorksheet,
  supportsWorksheetForLessonType,
} from './worksheetPolicy';

describe('lesson plan worksheet policy', () => {
  it('enables worksheets by default for teachable lesson types', () => {
    expect(supportsWorksheetForLessonType('תרגול')).toBe(true);
    expect(resolveIncludeWorksheet('תרגול', undefined)).toBe(true);
    expect(resolveIncludeWorksheet('הקנייה', true)).toBe(true);
    expect(resolveIncludeWorksheet('חזרה_למבחן', false)).toBe(false);
  });

  it('disables worksheets for exam-day lessons regardless of request flag', () => {
    expect(supportsWorksheetForLessonType('מבחן')).toBe(false);
    expect(resolveIncludeWorksheet('מבחן', undefined)).toBe(false);
    expect(resolveIncludeWorksheet('מבחן', true)).toBe(false);
  });

  it('renders clear prompt text for enabled and disabled worksheet preferences', () => {
    expect(renderWorksheetPreference(true)).toBe('כן - ליצור דף עבודה לתלמידים');
    expect(renderWorksheetPreference(false)).toBe('לא - לא ליצור דף עבודה לתלמידים');
  });
});
