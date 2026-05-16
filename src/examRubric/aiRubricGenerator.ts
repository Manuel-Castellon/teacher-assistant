import type { CompletionFn } from '@/exam/backends';
import type { ExamRubric, RubricQuestion, RubricSubQuestion } from './types';

export const RUBRIC_AI_PROMPT_VERSION = 'rubric-v0.1';

const SYSTEM_PROMPT = `You are an experienced Israeli high-school math teacher writing a detailed grading rubric (מחוון) for an exam.

You receive:
- A baseline rubric in JSON form, derived deterministically from the exam.
- The exam markdown and the answer key markdown.

Your job is to enrich the baseline rubric with criterion-level partial credit and common mistakes, while keeping the structure and totals identical.

Rules:
- Do not change: id, sourceExamPath, title, className, date, totalPoints, the question/sub-question count or labels, or any sub-question's maxPoints.
- For each sub-question, replace the criteria array with 2-4 criteria that decompose the work (e.g. setup, manipulation, final answer, notation). The sum of criteria.points MUST equal the sub-question's maxPoints.
- Each criterion needs: id (kebab-case slug), description (Hebrew, short), points (positive integer).
- Add 1-3 commonMistakes per sub-question when applicable (Hebrew, short bullets). Omit the field if none.
- Add acceptedAlternatives only when the answer admits visibly different equivalent forms (e.g. set vs inequality notation).
- Preserve expectedAnswer verbatim unless it's blank; if blank, fill it from the answer key.
- Write all teacher-facing text in Hebrew.

Output strict JSON matching the input schema. No prose, no markdown fences.`;

export interface GenerateAiRubricInput {
  baseRubric: ExamRubric;
  examMarkdown: string;
  answerKeyMarkdown: string;
  complete: CompletionFn;
}

export async function generateAiRubric(input: GenerateAiRubricInput): Promise<ExamRubric> {
  const userPrompt = renderUserPrompt(input.baseRubric, input.examMarkdown, input.answerKeyMarkdown);
  const text = await input.complete(SYSTEM_PROMPT, userPrompt);
  const parsed = parseRubricJson(text);
  return reconcileWithBase(parsed, input.baseRubric);
}

function renderUserPrompt(base: ExamRubric, examMarkdown: string, answerKeyMarkdown: string): string {
  return [
    'Baseline rubric (JSON):',
    '```json',
    JSON.stringify(base, null, 2),
    '```',
    '',
    'Exam markdown:',
    '```markdown',
    examMarkdown,
    '```',
    '',
    'Answer key markdown:',
    '```markdown',
    answerKeyMarkdown,
    '```',
    '',
    'Return the enriched rubric JSON.',
  ].join('\n');
}

function parseRubricJson(raw: string): ExamRubric {
  let text = raw.trim();
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  }
  return JSON.parse(text) as ExamRubric;
}

// The model may drift on totals or omit fields. Snap structure to the deterministic base so a partial
// failure still produces a usable rubric: identity fields from base, criteria from AI only when totals
// match the sub-question's maxPoints, otherwise fall back to the deterministic criteria.
function reconcileWithBase(aiRubric: ExamRubric, base: ExamRubric): ExamRubric {
  const aiQuestionsByNumber = new Map<number, RubricQuestion>();
  for (const q of aiRubric.questions ?? []) {
    aiQuestionsByNumber.set(q.questionNumber, q);
  }

  const questions = base.questions.map(baseQuestion => {
    const aiQuestion = aiQuestionsByNumber.get(baseQuestion.questionNumber);
    return {
      ...baseQuestion,
      subQuestions: baseQuestion.subQuestions.map((baseSub, idx) =>
        reconcileSubQuestion(baseSub, aiQuestion?.subQuestions?.[idx]),
      ),
    };
  });

  return {
    ...base,
    projectLearnings: aiRubric.projectLearnings?.length ? aiRubric.projectLearnings : base.projectLearnings,
    questions,
  };
}

function reconcileSubQuestion(base: RubricSubQuestion, ai: RubricSubQuestion | undefined): RubricSubQuestion {
  if (!ai) return base;

  const criteria = Array.isArray(ai.criteria) ? ai.criteria : [];
  const sum = criteria.reduce((acc, c) => acc + (typeof c.points === 'number' ? c.points : 0), 0);
  const useAiCriteria = criteria.length > 0 && sum === base.maxPoints;

  const expectedAnswer = ai.expectedAnswer?.trim() || base.expectedAnswer;
  const acceptedAlternatives = filterStrings(ai.acceptedAlternatives);
  const commonMistakes = filterStrings(ai.commonMistakes);

  return {
    label: base.label,
    maxPoints: base.maxPoints,
    expectedAnswer,
    criteria: useAiCriteria ? criteria : base.criteria,
    ...(acceptedAlternatives.length ? { acceptedAlternatives } : {}),
    ...(commonMistakes.length ? { commonMistakes } : {}),
  };
}

function filterStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
}
