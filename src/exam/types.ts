import type { GradeLevel } from '../types/shared';
import type { QuestionLicense, QuestionProvenance } from '../questionBank/types';

// ── Request types (what the teacher specifies) ──

export interface ExamQuestionSpec {
  topic: string;
  curriculumTopicId?: string;
  questionType: 'חישובי' | 'בעיה_מילולית' | 'הוכחה' | 'קריאה_וניתוח' | 'מעורב';
  points: number;
  subQuestionCount?: number;
  constraints?: string[];
}

export interface ExamPartSpec {
  title: string;
  questionSpecs: ExamQuestionSpec[];
}

export interface ExamRequest {
  examNumber?: number;
  className: string;
  date: string;
  grade: GradeLevel;
  durationMinutes: number;
  totalPoints: number;
  parts: ExamPartSpec[];
  teacherNotes?: string;
  bankSeed?: ExamQuestionBankSeed;
}

export type ExamQuestionBankSeedMode = 'verbatim' | 'style-reference';

export interface ExamQuestionBankSeed {
  mode: ExamQuestionBankSeedMode;
  itemIds: string[];
  copyrightAcknowledged?: boolean;
  copyrightAcknowledgedAt?: string;
  examples?: ExamQuestionBankSeedExample[];
}

export interface ExamQuestionBankSeedExample {
  id: string;
  requestedMode: ExamQuestionBankSeedMode;
  useMode: ExamQuestionBankSeedMode;
  license: QuestionLicense;
  sourceTitle: string;
  provenanceLabel: string;
  promptMarkdown: string;
  answerMarkdown?: string;
}

export interface ExamQuestionBankAttribution {
  itemId: string;
  sourceTitle: string;
  license: QuestionLicense;
  provenance: QuestionProvenance;
}

export interface RegenerateQuestionRequest {
  request: ExamRequest;
  exam: GeneratedExam;
  questionNumber: number;
  teacherNotes?: string;
}

// ── Generated output types (what Claude returns) ──

export interface ExamSubQuestion {
  label: string;
  content: string;
}

export interface ExamQuestion {
  questionNumber: number;
  points: number;
  instruction: string;
  subQuestions: ExamSubQuestion[];
  givenData?: string[];
  diagramDescription?: string;
  diagramSvg?: string;
}

export interface ExamPart {
  title: string;
  questions: ExamQuestion[];
}

export interface SolutionStep {
  label: string;
  steps: string[];
  finalAnswer: string;
}

export interface ExamSolution {
  questionNumber: number;
  subAnswers: SolutionStep[];
}

export interface VerificationItem {
  questionRef: string;
  type: 'equation' | 'inequality' | 'numeric' | 'proof';
  sympyExpression?: string;
  expectedAnswer?: string;
}

export interface GeneratedExam {
  header: {
    examNumber?: number;
    subject: string;
    className: string;
    date: string;
  };
  parts: ExamPart[];
  totalPoints: number;
  answerKey: ExamSolution[];
  verificationItems: VerificationItem[];
  questionBankAttributions?: ExamQuestionBankAttribution[];
}
