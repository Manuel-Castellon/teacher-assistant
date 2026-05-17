import { EXAM_PROMPT_VERSION, EXAM_SYSTEM_PROMPT, renderExamUserPrompt, renderRegenerateQuestionUserPrompt } from './examPrompt';
import { CUSTOM_CURRICULUM_TOPIC_ID, getCurriculumExamScope, getCurriculumTopicOptions } from './curriculumContext';
import type { GeneratedExam } from './types';

const SAMPLE_EXAM: GeneratedExam = {
  header: { subject: 'מתמטיקה', className: "ז'1", date: '13.05.26' },
  parts: [{
    title: 'אלגברה',
    questions: [{
      questionNumber: 1,
      points: 20,
      instruction: 'פתרו',
      subQuestions: [{ label: '1.', content: '$x+1=2$' }],
    }],
  }],
  totalPoints: 20,
  answerKey: [{
    questionNumber: 1,
    subAnswers: [{ label: '1.', steps: ['$x=1$'], finalAnswer: '$x=1$' }],
  }],
  verificationItems: [{ questionRef: 'Q1.1', type: 'equation', sympyExpression: 'Eq(x+1,2)', expectedAnswer: '{1}' }],
};

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

  it('renders question-bank verbatim and style-reference blocks', () => {
    const prompt = renderExamUserPrompt({
      className: "ח'1",
      date: '17.05.26',
      grade: 'חי',
      durationMinutes: 45,
      totalPoints: 20,
      parts: [{ title: 'אלגברה', questionSpecs: [{ topic: 'משוואות', questionType: 'חישובי', points: 20 }] }],
      bankSeed: {
        mode: 'verbatim',
        itemIds: ['a', 'b'],
        examples: [
          {
            id: 'a',
            requestedMode: 'verbatim',
            useMode: 'verbatim',
            license: 'teacher-original',
            sourceTitle: 'מבחן מורה',
            provenanceLabel: 'מבחן מורה · שאלה 1',
            promptMarkdown: 'פתרו $x+1=2$',
            answerMarkdown: '$x=1$',
          },
          {
            id: 'b',
            requestedMode: 'verbatim',
            useMode: 'style-reference',
            license: 'copyrighted-personal-use',
            sourceTitle: 'ספר',
            provenanceLabel: "ספר · עמ' 16 · תרגיל 8",
            promptMarkdown: 'פתרו $2x=8$',
          },
        ],
      },
    });

    expect(prompt).toContain('### שאלות לשילוב כלשונן');
    expect(prompt).toContain('פתרו $x+1=2$');
    expect(prompt).toContain('### דוגמאות סגנון בלבד');
    expect(prompt).toContain('אין להעתיק ניסוח');
    expect(prompt).toContain("ספר · עמ' 16 · תרגיל 8");
  });

  it('renders a scoped regenerate-question prompt', () => {
    const prompt = renderRegenerateQuestionUserPrompt({
      originalRequest: {
        className: "ז'1",
        date: '13.05.26',
        grade: 'זי',
        durationMinutes: 30,
        totalPoints: 20,
        parts: [{ title: 'אלגברה', questionSpecs: [{ topic: 'משוואות', questionType: 'חישובי', points: 20 }] }],
        curriculumScope: getCurriculumExamScope('זי'),
      },
      existingExam: SAMPLE_EXAM,
      questionNumber: 1,
      teacherNotes: 'להחליף לניסוח פחות דומה לדף העבודה.',
    });

    expect(prompt).toContain('החלף שאלה אחת בלבד');
    expect(prompt).toContain('מספר השאלה להחלפה: 1');
    expect(prompt).toContain('אל תשנה שאלות אחרות');
    expect(prompt).toContain('להחליף לניסוח פחות דומה לדף העבודה.');
    expect(prompt).toContain('"questionNumber": 1');
  });
});
