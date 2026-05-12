import type { GradeLevel } from '../types/shared';

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
}
