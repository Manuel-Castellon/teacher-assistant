import type { VerificationItem } from '../exam/types';
import type { GradeLevel } from '../types/shared';

export type QuestionBankSourceKind =
  | 'generated_exam'
  | 'generated_lesson'
  | 'manual'
  | 'bagrut_archive'
  | 'teacher_provided';

export type QuestionBankDifficulty = 'בסיסי' | 'בינוני' | 'מתקדם' | 'אתגר';

export type RepresentationType = 'טקסט' | 'גרף' | 'טבלה' | 'שרטוט' | 'ציר_מספרים' | 'מעורב';

export interface QuestionBankItemInput {
  teacherId?: string;
  sourceArtifactId?: string;
  sourceKind: QuestionBankSourceKind;
  sourceLabel?: string;
  grade: GradeLevel;
  curriculumTopicId?: string;
  questionType: 'חישובי' | 'בעיה_מילולית' | 'הוכחה' | 'קריאה_וניתוח' | 'מעורב';
  difficulty?: QuestionBankDifficulty;
  representationType?: RepresentationType;
  promptMarkdown: string;
  answerMarkdown?: string;
  verificationItem?: VerificationItem;
  rubric?: unknown;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface QuestionBankItemSummary {
  id: string;
  grade: GradeLevel;
  curriculumTopicId?: string;
  questionType: QuestionBankItemInput['questionType'];
  difficulty?: QuestionBankDifficulty;
  representationType?: RepresentationType;
  tags: string[];
  createdAt: string;
}
