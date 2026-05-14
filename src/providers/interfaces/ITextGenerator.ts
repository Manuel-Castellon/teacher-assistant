import type { LessonPlan, LessonPlanRequest } from '../../types/lessonPlan';
import type { GradeLevel } from '../../types/shared';

export interface ExerciseRequest {
  topic: string;
  subTopic: string;
  grade: GradeLevel;
  difficulty: 'בסיסי' | 'בינוני' | 'מתקדם' | 'בגרות'; // בסיסי | בינוני | מתקדם | בגרות
  count: number;
  style?: string;      // e.g. 'בעיה מילולית', 'חישובי', 'הוכחה' (בעיה מילולית, חישובי, הוכחה)
  teacherNotes?: string;
}

export interface GeneratedExercise {
  id: string;
  content: string;     // LaTeX or plain Hebrew; to be verified before use
  solution: string;
  difficulty: string;
  topic: string;
  grade: GradeLevel;
  verificationStatus: 'pending' | 'verified' | 'failed';
}

export interface ExamRequest {
  topic: string;
  subTopics: string[];
  grade: GradeLevel;
  durationMinutes: number;
  totalPoints: number;
  teacherNotes?: string;
}

export interface GeneratedExam {
  id: string;
  questions: GeneratedExercise[];
  totalPoints: number;
  estimatedDurationMinutes: number;
}

/**
 * All AI text generation goes through this interface.
 * Runtime default selection is owned by src/exam/backends.ts.
 * Alternative implementations must satisfy this contract exactly.
 * Swap = change constructor injection, not a refactor.
 */
export interface ITextGenerator {
  generateLessonPlan(request: LessonPlanRequest): Promise<LessonPlan>;
  generateExercises(request: ExerciseRequest): Promise<GeneratedExercise[]>;
  generateExam(request: ExamRequest): Promise<GeneratedExam>;
  readonly providerName: string;
}
