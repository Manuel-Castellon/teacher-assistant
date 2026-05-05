import type { StudentGradeRecord, GradeCalculationResult } from '../../types/grading';

export interface GradingSuggestion {
  questionId: string;
  subQuestionId?: string;
  suggestedScore: number;
  confidence: number;
  reasoning: string;
  /** Teacher must explicitly confirm before score is written */
  teacherConfirmed: false;
}

export interface GradingSession {
  examId: string;
  studentId: string;
  suggestions: GradingSuggestion[];
  status: 'pending_review' | 'confirmed' | 'rejected';
}

/**
 * AI grading interface — supervised, teacher confirms every mark.
 * Decision: GradeLab vs ExamAI vs custom — ASK USER at MVP 6 start.
 * No grade is written to StudentGradeRecord without teacher confirmation.
 */
export interface IGradingProvider {
  suggestGrades(examImageBuffer: Buffer, rubric: string): Promise<GradingSession>;
  calculateFinalGrade(record: StudentGradeRecord): GradeCalculationResult;
  readonly providerName: string;
}
