import { execFileSync } from 'node:child_process';
import { LessonPlanGenerator, parseLessonPlanJson, renderLessonPlanUserPrompt } from './LessonPlanGenerator';
import type { LessonPlan } from '../types/lessonPlan';

const claudeCliAvailable = (() => {
  try { execFileSync('which', ['claude'], { stdio: 'ignore' }); return true; }
  catch { return false; }
})();

function withEnv(env: Record<string, string | undefined>, fn: () => void) {
  const prev: Record<string, string | undefined> = {};
  for (const key of Object.keys(env)) {
    prev[key] = process.env[key];
    if (env[key] === undefined) delete process.env[key];
    else process.env[key] = env[key];
  }
  try {
    fn();
  } finally {
    for (const key of Object.keys(prev)) {
      if (prev[key] === undefined) delete process.env[key];
      else process.env[key] = prev[key];
    }
  }
}

const BASE_PLAN: LessonPlan = {
  id: 'generated-test-plan',
  createdAt: '2026-05-14T00:00:00.000Z',
  updatedAt: '2026-05-14T00:00:00.000Z',
  topic: 'גאומטריה',
  subTopic: 'שטחי מרובעים',
  grade: 'זי',
  duration: 45,
  lessonType: 'תרגול',
  curriculumTopicId: 'ms-grade7-t10',
  phases: {
    opening: {
      name: 'פתיחה',
      durationMinutes: 5,
      exercises: [],
    },
    instruction: {
      name: 'הקנייה קצרה',
      durationMinutes: 10,
      exercises: [],
    },
    practice: {
      name: 'תרגול',
      durationMinutes: 15,
      exercises: [],
    },
    independentWork: {
      name: 'עבודה עצמית',
      durationMinutes: 15,
      exercises: [],
    },
  },
  homework: null,
  generatedBy: 'claude-api',
};

describe('LessonPlanGenerator', () => {
  it('uses the default AI backend when no completion function is injected', () => {
    withEnv({ GEMINI_API_KEY: undefined, ANTHROPIC_API_KEY: undefined }, () => {
      if (claudeCliAvailable) {
        expect(() => new LessonPlanGenerator()).not.toThrow();
      } else {
        expect(() => new LessonPlanGenerator()).toThrow(/No AI backend/);
      }
    });
  });

  it('renders a prompt with curriculum, teacher notes, previous context, and textbook', () => {
    const prompt = renderLessonPlanUserPrompt({
      topic: 'גאומטריה',
      subTopic: 'שטחי מרובעים',
      grade: 'זי',
      duration: 45,
      lessonType: 'תרגול',
      curriculumTopicId: 'ms-grade7-t10',
      textbook: {
        name: 'ספר בדיקה',
        grade: "ז'",
        part: 1,
        isStudentStandardBook: false,
      },
      teacherNotes: 'רק משוואות ממעלה ראשונה',
      previousLessonContext: 'למדו שטח מלבן',
    });

    expect(prompt).toContain('נושא: גאומטריה');
    expect(prompt).toContain('מזהה נושא בתכנית: ms-grade7-t10');
    expect(prompt).toContain('נושא שנבחר: שטחים');
    expect(prompt).toContain('ספר בדיקה');
    expect(prompt).toContain('רק משוואות ממעלה ראשונה');
    expect(prompt).toContain('למדו שטח מלבן');
  });

  it('parses plain and fenced lesson-plan JSON', () => {
    expect(parseLessonPlanJson(JSON.stringify(BASE_PLAN)).id).toBe('generated-test-plan');
    expect(parseLessonPlanJson(`\`\`\`json\n${JSON.stringify(BASE_PLAN)}\n\`\`\``).id).toBe('generated-test-plan');
  });

  it('surfaces AI error envelopes instead of reporting missing phases', () => {
    expect(() => parseLessonPlanJson(JSON.stringify({
      error: { message: 'quota exceeded' },
      message: 'try another model',
    }))).toThrow('AI backend returned an error response instead of a lesson plan: quota exceeded — try another model');
  });

  it('generates with an injected completion backend and stamps metadata', async () => {
    const calls: { system: string; user: string }[] = [];
    const generator = new LessonPlanGenerator(async (system, user) => {
      calls.push({ system, user });
      return JSON.stringify({
        ...BASE_PLAN,
        createdAt: undefined,
        updatedAt: undefined,
        modelVersion: undefined,
        promptVersion: undefined,
      });
    });

    const plan = await generator.generate({
      topic: 'גאומטריה',
      subTopic: 'שטחי מרובעים',
      grade: 'זי',
      duration: 45,
      lessonType: 'תרגול',
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]!.system).toContain('עוזר תכנון שיעורים');
    expect(calls[0]!.user).toContain('שטחי מרובעים');
    expect(plan.generatedBy).toBe('claude-api');
    expect(plan.modelVersion).toBe('default-backend');
    expect(plan.promptVersion).toBe(generator.promptVersion);
    expect(plan.createdAt).toBeTruthy();
    expect(plan.updatedAt).toBeTruthy();
  });
});
