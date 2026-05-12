import { EXAM_PROMPT_VERSION, EXAM_SYSTEM_PROMPT, renderExamUserPrompt } from './examPrompt';
import { CUSTOM_CURRICULUM_TOPIC_ID, getCurriculumExamScope, getCurriculumTopicOptions } from './curriculumContext';

describe('examPrompt', () => {
  it('exposes the current prompt version and core system contract', () => {
    expect(EXAM_PROMPT_VERSION).toBe('exam-v0.1.0');
    expect(EXAM_SYSTEM_PROMPT).toContain('JSON תקני');
    expect(EXAM_SYSTEM_PROMPT).toContain('verificationItems');
    expect(EXAM_SYSTEM_PROMPT).toContain('LaTeX inline');
    expect(EXAM_SYSTEM_PROMPT).toContain('קריאה וניתוח');
  });

  it('renders request fields, exam number, constraints, and teacher notes', () => {
    const prompt = renderExamUserPrompt({
      examNumber: 3,
      className: "ח' מואצת",
      date: '12.05.26',
      grade: 'חי',
      durationMinutes: 90,
      totalPoints: 100,
      parts: [
        {
          title: 'אלגברה',
          questionSpecs: [
            {
              topic: 'משוואות עם נעלם במכנה',
              questionType: 'חישובי',
              points: 35,
              subQuestionCount: 3,
              constraints: ['לכלול תחום הצבה', 'לא להשתמש בשאלות אמריקאיות'],
            },
          ],
        },
      ],
      teacherNotes: 'רמת קושי בינונית.',
    });

    expect(prompt).toContain('מספר מבחן: 3');
    expect(prompt).toContain("שכבה: ח' מואצת");
    expect(prompt).toContain('משוואות עם נעלם במכנה (חישובי, 35 נק');
    expect(prompt).toContain('3 תת-שאלות');
    expect(prompt).toContain('* לכלול תחום הצבה');
    expect(prompt).toContain('רמת קושי בינונית.');
    expect(prompt).toContain('## סכמת JSON');
  });

  it('omits optional fields when they are absent', () => {
    const prompt = renderExamUserPrompt({
      className: "ט'1",
      date: '13.05.26',
      grade: 'טי',
      durationMinutes: 45,
      totalPoints: 50,
      parts: [{ title: 'גיאומטריה', questionSpecs: [{ topic: 'דמיון', questionType: 'הוכחה', points: 50 }] }],
    });

    expect(prompt).not.toContain('מספר מבחן:');
    expect(prompt).not.toContain('הערות מהמורה');
    expect(prompt).toContain('דמיון (הוכחה, 50 נק');
  });

  it('renders strict curriculum scope when provided', () => {
    const prompt = renderExamUserPrompt({
      className: "ז'1",
      date: '13.05.26',
      grade: 'זי',
      durationMinutes: 45,
      totalPoints: 50,
      parts: [{ title: 'אלגברה', questionSpecs: [{ topic: 'משוואות', questionType: 'חישובי', points: 50 }] }],
      curriculumScope: getCurriculumExamScope('זי'),
    });

    expect(prompt).toContain('## סילבוס / תוכנית לימודים מחייבת');
    expect(prompt).toContain('ms-grade7-tashpav');
    expect(prompt).toContain('פתרון משוואות');
    expect(prompt).toContain('משוואות עם נעלם במכנה');
    expect(prompt).toContain('אין להכניס חומר מתקדם יותר');
  });

  it('renders selected curriculum anchors and custom wildcard topics', () => {
    const topics = getCurriculumTopicOptions('זי');
    const equationsTopic = topics.find(topic => topic.name === 'פתרון משוואות');
    const expressionsTopic = topics.find(topic => topic.name === 'ביטויים אלגבריים');
    const prompt = renderExamUserPrompt({
      className: "ז'1",
      date: '13.05.26',
      grade: 'זי',
      durationMinutes: 45,
      totalPoints: 50,
      parts: [{
        title: 'אלגברה',
        questionSpecs: [
          {
            topic: 'משוואות עם סוגריים',
            curriculumTopicId: equationsTopic!.id,
            questionType: 'חישובי',
            points: 25,
          },
          {
            topic: 'ביטויים אלגבריים',
            curriculumTopicId: expressionsTopic!.id,
            questionType: 'חישובי',
            points: 25,
          },
          {
            topic: 'חזרה לפי דף עבודה אישי',
            curriculumTopicId: CUSTOM_CURRICULUM_TOPIC_ID,
            questionType: 'חישובי',
            points: 25,
          },
          {
            topic: 'עוגן לא תקין',
            curriculumTopicId: 'unknown-topic',
            questionType: 'חישובי',
            points: 0,
          },
        ],
      }],
      curriculumScope: getCurriculumExamScope('זי'),
    });

    expect(prompt).toContain('משוואות עם סוגריים — עוגן סילבוס: פתרון משוואות');
    expect(prompt).toContain('ביטויים אלגבריים — עוגן סילבוס');
    expect(prompt).toContain('חזרה לפי דף עבודה אישי — מיקוד חופשי/אחר שנבחר במפורש על ידי המורה');
    expect(prompt).toContain('עוגן לא תקין — עוגן סילבוס: unknown-topic');
  });

  it('renders reading and analysis question type', () => {
    const prompt = renderExamUserPrompt({
      className: "ז'1",
      date: '13.05.26',
      grade: 'זי',
      durationMinutes: 30,
      totalPoints: 20,
      parts: [{ title: 'גרפים', questionSpecs: [{ topic: 'קריאת גרפים', questionType: 'קריאה_וניתוח', points: 20 }] }],
    });

    expect(prompt).toContain('קריאת גרפים (קריאה_וניתוח, 20 נק');
  });
});
