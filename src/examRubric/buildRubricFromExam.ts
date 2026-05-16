import type { ExamRequest, GeneratedExam, ExamQuestion, ExamSolution, SolutionStep } from '@/exam/types';
import type { ExamRubric, RubricCriterion, RubricQuestion, RubricSubQuestion } from './types';

export interface BuildRubricOptions {
  id: string;
  sourceExamPath?: string;
}

const SOLVE_FRACTION = 0.7;

export function buildRubricFromExam(
  exam: GeneratedExam,
  request: ExamRequest,
  opts: BuildRubricOptions,
): ExamRubric {
  const answerByQuestion = new Map<number, ExamSolution>();
  for (const solution of exam.answerKey) {
    answerByQuestion.set(solution.questionNumber, solution);
  }

  const topicByQuestion = collectTopicsByQuestion(request, exam);

  const questions: RubricQuestion[] = [];
  for (const part of exam.parts) {
    for (const question of part.questions) {
      questions.push(buildQuestion(question, part.title, answerByQuestion.get(question.questionNumber), topicByQuestion.get(question.questionNumber)));
    }
  }

  return {
    id: opts.id,
    sourceExamPath: opts.sourceExamPath ?? `generated:exam:${exam.header.date}`,
    title: buildTitle(exam),
    className: exam.header.className,
    date: exam.header.date,
    totalPoints: exam.totalPoints,
    projectLearnings: [],
    questions,
  };
}

function buildTitle(exam: GeneratedExam): string {
  const num = exam.header.examNumber ? ` ${exam.header.examNumber}` : '';
  return `מבחן${num} ב${exam.header.subject} - ${exam.header.className}`;
}

function collectTopicsByQuestion(request: ExamRequest, exam: GeneratedExam): Map<number, string> {
  const requestSpecs = request.parts.flatMap(part => part.questionSpecs);
  const examQuestions = exam.parts.flatMap(part => part.questions);
  const topics = new Map<number, string>();
  for (let i = 0; i < examQuestions.length; i++) {
    const examQuestion = examQuestions[i]!;
    const spec = requestSpecs[i];
    if (spec?.topic) {
      topics.set(examQuestion.questionNumber, spec.topic);
    }
  }
  return topics;
}

function buildQuestion(
  question: ExamQuestion,
  partTitle: string,
  solution: ExamSolution | undefined,
  topic: string | undefined,
): RubricQuestion {
  const subQuestions = question.subQuestions.length > 0
    ? question.subQuestions
    : [{ label: '1.', content: question.instruction }];

  const pointSplits = splitPoints(question.points, subQuestions.length);
  const answerByLabel = new Map<string, SolutionStep>();
  for (const step of solution?.subAnswers ?? []) {
    answerByLabel.set(step.label, step);
  }

  return {
    questionNumber: question.questionNumber,
    title: deriveTitle(topic, partTitle, question.instruction),
    topic: topic ?? partTitle,
    maxPoints: question.points,
    subQuestions: subQuestions.map((sub, idx): RubricSubQuestion => {
      const maxPoints = pointSplits[idx]!;
      const step = answerByLabel.get(sub.label);
      return {
        label: sub.label,
        maxPoints,
        expectedAnswer: step?.finalAnswer?.trim() || '',
        criteria: deterministicCriteria(sub.label, maxPoints),
      };
    }),
  };
}

function deriveTitle(topic: string | undefined, partTitle: string, instruction: string): string {
  if (topic && topic.trim()) return topic.trim();
  if (partTitle && partTitle.trim()) return partTitle.trim();
  const condensed = instruction.replace(/\s+/g, ' ').trim();
  return condensed.length > 60 ? condensed.slice(0, 60) + '…' : condensed || 'שאלה';
}

export function splitPoints(total: number, count: number): number[] {
  if (count <= 1) return [total];
  const base = Math.floor(total / count);
  const remainder = total - base * count;
  const result: number[] = [];
  for (let i = 0; i < count; i++) {
    result.push(base + (i < remainder ? 1 : 0));
  }
  return result;
}

function deterministicCriteria(label: string, maxPoints: number): RubricCriterion[] {
  if (maxPoints <= 1) {
    return [{ id: `${slug(label)}-answer`, description: 'תשובה סופית נכונה', points: maxPoints }];
  }
  const solvePoints = Math.round(maxPoints * SOLVE_FRACTION);
  const answerPoints = maxPoints - solvePoints;
  return [
    { id: `${slug(label)}-solve`, description: 'פתרון מסודר ונכון על-פי שלבים', points: solvePoints },
    { id: `${slug(label)}-answer`, description: 'תשובה סופית נכונה', points: answerPoints },
  ];
}

function slug(label: string): string {
  return label.replace(/[^A-Za-z0-9]+/g, '').toLowerCase() || 'item';
}
