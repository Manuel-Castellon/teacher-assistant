import { ExamGenerator } from './ExamGenerator';
import type { GeneratedExam } from './types';

const SAMPLE_EXAM: GeneratedExam = {
  header: { examNumber: 2, subject: 'מתמטיקה', className: "ח'1", date: '12.05.26' },
  parts: [
    {
      title: 'אלגברה',
      questions: [
        {
          questionNumber: 1,
          points: 20,
          instruction: 'פתרו',
          subQuestions: [{ label: '1.', content: '$x+1=2$' }],
        },
      ],
    },
  ],
  totalPoints: 20,
  answerKey: [
    {
      questionNumber: 1,
      subAnswers: [{ label: '1.', steps: ['$x=1$'], finalAnswer: '$x=1$' }],
    },
  ],
  verificationItems: [
    { questionRef: 'Q1.1', type: 'equation', sympyExpression: 'Eq(x+1,2)', expectedAnswer: '{1}' },
  ],
};

const REQUEST = {
  className: "ח'1",
  date: '12.05.26',
  grade: 'חי' as const,
  durationMinutes: 45,
  totalPoints: 20,
  parts: [{ title: 'אלגברה', questionSpecs: [{ topic: 'משוואות', questionType: 'חישובי' as const, points: 20 }] }],
};

describe('ExamGenerator', () => {
  it('constructs with the default backend when configured', () => {
    const prev = process.env['GEMINI_API_KEY'];
    process.env['GEMINI_API_KEY'] = 'gem-test';
    try {
      expect(() => new ExamGenerator()).not.toThrow();
    } finally {
      if (prev === undefined) delete process.env['GEMINI_API_KEY'];
      else process.env['GEMINI_API_KEY'] = prev;
    }
  });

  it('passes system and user prompts to the injected completion function', async () => {
    const calls: { system: string; user: string }[] = [];
    const gen = new ExamGenerator(async (system, user) => {
      calls.push({ system, user });
      return JSON.stringify(SAMPLE_EXAM);
    });

    const exam = await gen.generate(REQUEST);

    expect(exam.header.className).toBe("ח'1");
    expect(gen.promptVersion).toBe('exam-v0.1.0');
    expect(calls).toHaveLength(1);
    expect(calls[0]!.system).toContain('מחולל מבחנים');
    expect(calls[0]!.user).toContain('משוואות');
    expect(calls[0]!.user).toContain('## סילבוס / תוכנית לימודים מחייבת');
    expect(calls[0]!.user).toContain('ms-grade8-tashpav');
  });

  it('strips json code fences from model output', async () => {
    const gen = new ExamGenerator(async () => `\`\`\`json\n${JSON.stringify(SAMPLE_EXAM)}\n\`\`\``);
    await expect(gen.generate(REQUEST)).resolves.toMatchObject({ totalPoints: 20 });
  });

  it('strips bare code fences from model output', async () => {
    const gen = new ExamGenerator(async () => `\`\`\`\n${JSON.stringify(SAMPLE_EXAM)}\n\`\`\``);
    await expect(gen.generate(REQUEST)).resolves.toMatchObject({ totalPoints: 20 });
  });

  it('surfaces invalid JSON responses', async () => {
    const gen = new ExamGenerator(async () => 'not json');
    await expect(gen.generate(REQUEST)).rejects.toThrow();
  });

  it('passes scoped regenerate-question prompts to the backend', async () => {
    const calls: { system: string; user: string }[] = [];
    const gen = new ExamGenerator(async (system, user) => {
      calls.push({ system, user });
      return JSON.stringify(SAMPLE_EXAM);
    });

    const exam = await gen.regenerateQuestion({
      request: REQUEST,
      exam: SAMPLE_EXAM,
      questionNumber: 1,
      teacherNotes: 'להחליף לשאלה חדשה.',
    });

    expect(exam.totalPoints).toBe(20);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.system).toContain('מחולל מבחנים');
    expect(calls[0]!.user).toContain('החלף שאלה אחת בלבד');
    expect(calls[0]!.user).toContain('מספר השאלה להחלפה: 1');
    expect(calls[0]!.user).toContain('להחליף לשאלה חדשה.');
    expect(calls[0]!.user).toContain('ms-grade8-tashpav');
  });

  it('omits regenerate teacher notes when none are provided', async () => {
    const calls: { user: string }[] = [];
    const gen = new ExamGenerator(async (_system, user) => {
      calls.push({ user });
      return JSON.stringify(SAMPLE_EXAM);
    });

    await gen.regenerateQuestion({
      request: REQUEST,
      exam: SAMPLE_EXAM,
      questionNumber: 1,
    });

    expect(calls[0]!.user).not.toContain('## הנחיות להחלפה');
  });
});
