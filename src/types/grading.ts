// Grading data model derived from מעקב ציונים 2025-2026.xlsx
// Full complexity required from day one — do not simplify.

export interface SubQuestion {
  id: string;              // e.g. '1א', '1ב', '1ג', '1ד' (1א, 1ב, 1ג, 1ד)
  topic: string;           // e.g. 'טריגונומטריה', 'גאומטריה', 'אנליזה' (טריגונומטריה, גאומטריה, אנליזה)
  maxPoints: number;
  studentScore?: number;   // undefined = not yet graded
}

export interface ExamResult {
  id: string;
  name: string;            // e.g. 'מבחן 1' (מבחן 1)
  date: string;            // ISO date
  maxScore: number;
  subQuestions: SubQuestion[];

  // Computed from subQuestions
  totalScore?: number;

  /**
   * If true, this is a מועד מיוחד (מועד מיוחד) sitting.
   * It replaces the score of the specific exam it targets.
   */
  isMoadMeyuhad: boolean;
  replacesExamId?: string;
}

export interface BonusTask {
  id: string;
  name: string;
  readonly maxPoints: 10;    // always 10 — per grade file analysis
  studentScore?: number;
  /** Which exam's grade this bonus supplements */
  targetExamId?: string;
}

/**
 * Full grade record for one student in one class/year.
 *
 * Grade formula:
 *   annualGrade = 70% × average of best 3 out of exams (max 4)
 *   finalGrade  = 70% × annualGrade + 30% × matkonaScore
 *   Bonus tasks supplement individual exam grades (up to +10 per task)
 *   Absence deduction applied above threshold
 */
export interface StudentGradeRecord {
  studentId: string;
  classId: string;
  academicYear: string;

  /** Up to 4 exams; best 3 count toward annual grade */
  exams: ExamResult[];

  /** מתכונות (מתכונות) — counts as 30% of final grade */
  matkona?: ExamResult;

  /** Up to 5 bonus tasks × 10 pts each */
  bonusTasks: BonusTask[];

  absenceDays: number;
  absenceDeductionApplied: boolean;

  // Computed — populated by grade calculation service
  computed?: GradeCalculationResult;
}

export interface GradeCalculationResult {
  bestThreeExamIds: string[];
  annualGrade: number;           // 70% × mean of best 3
  matkonaGrade: number;          // 30% weight
  finalGrade: number;            // annualGrade + matkonaGrade
  bonusApplied: number;          // total bonus points added
  absenceDeduction: number;      // points deducted
  topicMastery: Record<string, {
    earned: number;
    possible: number;
    pct: number;
  }>;                            // per-topic breakdown from subQuestions
}
