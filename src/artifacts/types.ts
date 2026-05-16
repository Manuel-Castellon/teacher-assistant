import type { GradeLevel } from '../types/shared';

export type GeneratedArtifactKind = 'lesson_plan' | 'exam' | 'rubric';

export interface GeneratedArtifactInput {
  teacherId: string;
  kind: GeneratedArtifactKind;
  title: string;
  grade?: GradeLevel;
  classId?: string;
  curriculumTopicId?: string;
  sourceArtifactId?: string;
  payload: unknown;
  markdown?: string;
  metadata?: Record<string, unknown>;
}

export interface GeneratedArtifactSummary {
  id: string;
  kind: GeneratedArtifactKind;
  title: string;
  grade?: GradeLevel;
  classId?: string;
  curriculumTopicId?: string;
  sourceArtifactId?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}
