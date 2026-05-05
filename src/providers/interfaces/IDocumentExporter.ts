import type { LessonPlan } from '../../types/lessonPlan';

export type ExportFormat = 'docx' | 'pdf' | 'google-doc';

export interface ExportResult {
  format: ExportFormat;
  buffer?: Buffer;        // for docx / pdf
  url?: string;           // for google-doc
  filename: string;
}

/**
 * Document export interface.
 * Teachers export lesson plans + exams to Word / PDF for printing.
 * RTL formatting must be preserved in all output formats.
 */
export interface IDocumentExporter {
  exportLessonPlan(plan: LessonPlan, format: ExportFormat): Promise<ExportResult>;
  exportExam(examContent: string, format: ExportFormat): Promise<ExportResult>;
  readonly providerName: string;
}
