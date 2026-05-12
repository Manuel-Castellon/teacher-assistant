import {
  CUSTOM_CURRICULUM_TOPIC_ID,
  getCurriculumExamScope,
  getCurriculumTopicOptions,
  renderCurriculumExamScope,
  validateExamRequestCurriculumTopics,
} from './curriculumContext';
import type { ExamRequest } from './types';

const BASE_REQUEST: ExamRequest = {
  className: "ז'1",
  date: '12.05.26',
  grade: 'זי',
  durationMinutes: 45,
  totalPoints: 20,
  parts: [
    {
      title: 'אלגברה',
      questionSpecs: [
        {
          topic: 'פתרון משוואות פשוטות',
          questionType: 'חישובי',
          points: 20,
        },
      ],
    },
  ],
};

describe('curriculumContext', () => {
  it('returns grade-specific topic options with ids and hour budgets', () => {
    const options = getCurriculumTopicOptions('זי');

    expect(options.length).toBeGreaterThan(0);
    expect(options[0]).toEqual(expect.objectContaining({
      id: expect.stringContaining('ms-grade7'),
      name: expect.any(String),
      recommendedHours: expect.any(Number),
    }));
  });

  it('renders the curriculum scope with allowed topics and blocked examples', () => {
    const text = renderCurriculumExamScope(getCurriculumExamScope('זי'));

    expect(text).toContain('נושאים מותרים לשכבה זו');
    expect(text).toContain('פתרון משוואות');
    expect(text).toContain('מערכות משוואות');
  });

  it('accepts a selected topic id for the matching grade', () => {
    const [topic] = getCurriculumTopicOptions('זי');
    const request: ExamRequest = {
      ...BASE_REQUEST,
      parts: [{ title: 'אלגברה', questionSpecs: [{ ...BASE_REQUEST.parts[0]!.questionSpecs[0]!, curriculumTopicId: topic!.id }] }],
    };

    expect(validateExamRequestCurriculumTopics(request)).toEqual([]);
  });

  it('allows legacy free-text requests without a selected curriculum topic id', () => {
    expect(validateExamRequestCurriculumTopics(BASE_REQUEST)).toEqual([]);
  });

  it('accepts the explicit custom topic wildcard when focus text is present', () => {
    const request: ExamRequest = {
      ...BASE_REQUEST,
      parts: [{
        title: 'אלגברה',
        questionSpecs: [{
          ...BASE_REQUEST.parts[0]!.questionSpecs[0]!,
          curriculumTopicId: CUSTOM_CURRICULUM_TOPIC_ID,
          topic: 'חזרה ממוקדת לפי דף העבודה האחרון',
        }],
      }],
    };

    expect(validateExamRequestCurriculumTopics(request)).toEqual([]);
  });

  it('rejects the custom topic wildcard without teacher focus text', () => {
    const request: ExamRequest = {
      ...BASE_REQUEST,
      parts: [{
        title: 'אלגברה',
        questionSpecs: [{
          ...BASE_REQUEST.parts[0]!.questionSpecs[0]!,
          curriculumTopicId: CUSTOM_CURRICULUM_TOPIC_ID,
          topic: '   ',
        }],
      }],
    };

    expect(validateExamRequestCurriculumTopics(request)).toEqual([
      'חלק 1, שאלה 1: יש למלא פירוט חופשי כשבוחרים "אחר"',
    ]);
  });

  it('rejects a curriculum topic id from a different grade', () => {
    const [grade8Topic] = getCurriculumTopicOptions('חי');
    const request: ExamRequest = {
      ...BASE_REQUEST,
      parts: [{ title: 'אלגברה', questionSpecs: [{ ...BASE_REQUEST.parts[0]!.questionSpecs[0]!, curriculumTopicId: grade8Topic!.id }] }],
    };

    expect(validateExamRequestCurriculumTopics(request)).toEqual([
      'חלק 1, שאלה 1: נושא הסילבוס שנבחר אינו שייך לשכבת הגיל',
    ]);
  });
});
