export interface RubricCriterion {
  id: string;
  description: string;
  points: number;
}

export interface RubricSubQuestion {
  label: string;
  maxPoints: number;
  expectedAnswer: string;
  acceptedAlternatives?: string[];
  criteria: RubricCriterion[];
  commonMistakes?: string[];
}

export interface RubricQuestion {
  questionNumber: number;
  title: string;
  topic: string;
  maxPoints: number;
  subQuestions: RubricSubQuestion[];
}

export interface BonusRubric {
  maxPoints: number;
  prompt: string;
  expectedAnswer: string;
  criteria: RubricCriterion[];
}

export interface ExamRubric {
  id: string;
  sourceExamPath: string;
  title: string;
  className: string;
  date: string;
  totalPoints: number;
  projectLearnings: string[];
  questions: RubricQuestion[];
  bonus?: BonusRubric;
}
