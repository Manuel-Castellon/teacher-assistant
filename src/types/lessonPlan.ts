// Derived from 5 real מערכי שיעור (מערכי שיעור) examples.
// Do not change the structure without re-validating against real examples.

import type { GradeLevel } from './shared';

export type LessonDuration = 45 | 90; // minutes — the two standard lesson lengths

export type LessonType =
  | 'שגרה'            // routine lesson (שגרה)
  | 'חזרה_לבגרות'  // Bagrut review (חזרה לבגרות)
  | 'חזרה_למבחן'  // test review (חזרה למבחן)
  | 'הקנייה'          // new material only (הקנייה)
  | 'תרגול'          // practice focus (תרגול)
  | 'מבחן';           // exam day (מבחן)

export type PracticeMode =
  | 'לוח_משותף'     // full class at board (לוח משותף)
  | 'לוחות_מחיקה'  // erasable whiteboards — raise answers, vote (לוחות מחיקה)
  | 'עצמאי'          // independent (עצמאי)
  | 'קבוצות';         // groups (קבוצות)

export interface TextbookReference {
  name: string;            // e.g. 'בכיוון הנכון עם ארכימדס' (בכיוון הנכון עם ארכימדס)
  grade?: string;
  part?: number;
  publisher?: string;      // e.g. 'מט"ח' (מט"ח)
  /**
   * false = teacher's preferred book, not the students' standard.
   * When false: exercises must be printed as a worksheet for students.
   */
  isStudentStandardBook: boolean;
}

export interface ExerciseRef {
  /** Where the exercise comes from */
  source: 'textbook' | 'generated' | 'bagrut_archive' | 'teacher_provided';

  /** For textbook references */
  textbookRef?: {
    page: number;
    exerciseId: string;    // e.g. '1', '4', '25' — or 'a,b,c,d,g,h,i,j' for sub-parts
  };

  /** For generated exercises — LaTeX or plain Hebrew text */
  generatedContent?: string;

  /** Populated only after Verifier Agent runs */
  verificationStatus?: 'pending' | 'verified' | 'failed';
  verificationError?: string;

  practiceMode: PracticeMode;
  estimatedMinutes: number;
  notes?: string;
}

export interface LessonPhase {
  name: string;
  durationMinutes: number;
  description?: string;
  exercises: ExerciseRef[];
  teacherNotes?: string;   // הערה לקלוד (הערה לקלוד) — explicit overrides, always honored
}

/**
 * Core lesson plan structure.
 * Phases are always present for routine lessons; some are optional for review/exam types.
 *
 * INVARIANTS (enforced by generator, verified by eval):
 * - opening exercise runs during teacher admin time — students work independently
 * - independentWork is always last; min 15 min (min 30 min for 90-min review lessons)
 * - homework may be null if teacher will see the class again later in the week
 */
export interface LessonPlan {
  id: string;
  createdAt: string;
  updatedAt: string;

  // Metadata
  topic: string;           // Hebrew, e.g. 'משפט פיתגורס' (משפט פיתגורס)
  subTopic: string;        // Hebrew, e.g. 'שימושים במשפט פיתגורס' (שימושים במשפט פיתגורס)
  grade: GradeLevel;
  duration: LessonDuration;
  lessonType: LessonType;
  textbook?: TextbookReference;
  curriculumTopicId?: string;  // links to CurriculumTopic.id
  classId?: string;

  // Structure
  phases: {
    /** Short exercise during attendance + board setup. Students work independently. */
    opening: LessonPhase;
    /** New material or difficulty elevation. Optional on pure review/practice days. */
    instruction?: LessonPhase;
    /** Board or interactive practice. */
    practice: LessonPhase;
    /** Always last. Min 15 min (min 30 for 90-min review). */
    independentWork: LessonPhase;
  };

  homework: ExerciseRef[] | null; // null = intentionally no homework

  /**
   * Teacher's intent notes written before the lesson.
   * Initially required while the system learns her style.
   * Goal: become unnecessary for familiar lesson types over time.
   */
  teacherNotes?: string;

  /**
   * Filled AFTER the lesson. Records what actually happened vs. planned.
   * Fed into continuity context for the next lesson plan generation.
   */
  postLessonNotes?: string;

  // Bagrut review specific fields
  bagrutReview?: {
    /** Topic chosen by student poll */
    studentSurveyTopic: string;
    /** Past exam sources, e.g. ['יואל גבע', 'בני גורן'] (יואל גבע, בני גורן) */
    exerciseSources: string[];
  };

  // Generation metadata
  generatedBy: 'claude-api' | 'teacher';
  modelVersion?: string;
  promptVersion?: string;
}

// ── Request shape fed to ITextGenerator ────────────────────────────────────────
export interface LessonPlanRequest {
  topic: string;
  subTopic: string;
  grade: GradeLevel;
  duration: LessonDuration;
  lessonType: LessonType;
  textbook?: TextbookReference;
  teacherNotes?: string;
  curriculumTopicId?: string;
  classId?: string;
  /** Summary of previous lesson for continuity — include postLessonNotes from last plan */
  previousLessonContext?: string;
}
