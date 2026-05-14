import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, '..', '..');

const CUSTOM_TOPIC_ID = '__custom__';

const CURRICULUM_FILES = {
  'זי': 'data/curriculum/middle-school-grade7.json',
  'חי': 'data/curriculum/middle-school-grade8.json',
  'טי': 'data/curriculum/middle-school-grade9.json',
  'יי': 'data/curriculum/high-school-5units-year10.json',
  'יאי': 'data/curriculum/high-school-5units-year11.json',
  'יבי': 'data/curriculum/high-school-5units-year12.json',
};

const curriculumCache = new Map();

async function loadTopicIds(grade) {
  if (!curriculumCache.has(grade)) {
    const file = CURRICULUM_FILES[grade];
    if (!file) throw new Error(`No curriculum file mapped for grade ${grade}`);
    const unit = JSON.parse(await readFile(join(REPO_ROOT, file), 'utf8'));
    curriculumCache.set(grade, new Set(unit.topics.map((topic) => topic.id)));
  }
  return curriculumCache.get(grade);
}

function allQuestionText(exam) {
  return exam.parts
    .flatMap((part) => part.questions)
    .flatMap((question) => [
      question.instruction,
      ...(question.givenData || []),
      question.diagramDescription,
      ...question.subQuestions.map((sub) => sub.content),
    ])
    .filter(Boolean)
    .join('\n');
}

export async function runCase(caseInput) {
  const violations = [];
  const topicIds = await loadTopicIds(caseInput.request.grade);

  for (const [partIdx, part] of caseInput.request.parts.entries()) {
    for (const [questionIdx, question] of part.questionSpecs.entries()) {
      const label = `part ${partIdx + 1} question ${questionIdx + 1}`;
      if (question.curriculumTopicId === CUSTOM_TOPIC_ID) {
        if (!question.topic?.trim()) {
          violations.push({ code: 'custom-topic-empty', message: `${label} uses custom topic without focus text` });
        }
      } else if (question.curriculumTopicId && !topicIds.has(question.curriculumTopicId)) {
        violations.push({ code: 'topic-grade-mismatch', message: `${label} topic does not belong to selected grade` });
      }
    }
  }

  const questionTypes = caseInput.request.parts.flatMap((part) => part.questionSpecs.map((q) => q.questionType));
  for (const expectedType of caseInput.expectedQuestionTypes || []) {
    if (!questionTypes.includes(expectedType)) {
      violations.push({ code: 'missing-question-type', message: `Expected question type ${expectedType}` });
    }
  }

  const exam = caseInput.fakeExam;
  const questions = exam.parts.flatMap((part) => part.questions);
  if (questions.length === 0) {
    violations.push({ code: 'no-questions', message: 'Generated exam has no questions' });
  }
  if (!exam.answerKey || exam.answerKey.length === 0) {
    violations.push({ code: 'no-answer-key', message: 'Generated exam has no answer key' });
  }
  if ((exam.verificationItems || []).length < (caseInput.minVerificationItems ?? 1)) {
    violations.push({ code: 'missing-verification', message: 'Generated exam has too few verification items' });
  }

  const text = allQuestionText(exam);
  for (const banned of caseInput.bannedTerms || []) {
    if (text.includes(banned)) {
      violations.push({ code: 'banned-term', message: `Generated exam includes banned term: ${banned}` });
    }
  }

  return {
    mode: 'fake',
    exam,
    scoring: {
      deterministic: {
        violations,
        passed: violations.length === 0,
      },
      judged: {
        hebrew_quality: null,
        teacher_notes_honored: null,
      },
    },
  };
}
