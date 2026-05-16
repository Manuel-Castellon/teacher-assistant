import { renderTeacherNotes } from './route';

describe('lesson-plan generate route worksheet instructions', () => {
  it('adds explicit worksheet creation instructions when enabled', () => {
    const notes = renderTeacherNotes({
      teacherRequest: 'שיעור תרגול עם עבודה עצמית',
      teacherNotes: 'להתחיל קל',
    }, true);

    expect(notes).toContain('העדפת דף עבודה:');
    expect(notes).toContain('כן - ליצור דף עבודה לתלמידים');
    expect(notes).toContain('תרגילים מקוריים מדורגים');
    expect(notes).toContain('פתרונות/מפתח קצר למורה');
    expect(notes).toContain('להתחיל קל');
  });

  it('adds explicit no-worksheet instructions when disabled', () => {
    const notes = renderTeacherNotes({
      teacherRequest: 'שיעור תרגול בלי דפים',
    }, false);

    expect(notes).toContain('לא - לא ליצור דף עבודה לתלמידים');
    expect(notes).toContain('לא ליצור דף עבודה לתלמידים');
    expect(notes).toContain('לוחות מחיקים');
  });
});
