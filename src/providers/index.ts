// Provider registry — swap implementations here, not throughout the codebase.
// Each provider is injected via constructor, not imported directly in feature code.

export type { ITextGenerator, GeneratedExercise, ExerciseRequest } from './interfaces/ITextGenerator';
export type { IMathVerifier, VerificationResult } from './interfaces/IMathVerifier';
export type { IOCRProvider, OCRResult, MathExpression } from './interfaces/IOCRProvider';
export type { IGradingProvider, GradingSession, GradingSuggestion } from './interfaces/IGradingProvider';
export type { IDocumentExporter, ExportResult, ExportFormat } from './interfaces/IDocumentExporter';

// Concrete providers
export { ClaudeTextGenerator } from './impl/ClaudeTextGenerator';
export { SympyMathVerifier } from './impl/SympyMathVerifier';

// Exam generation
export { ExamGenerator } from '../exam/ExamGenerator';
export { geminiBackend, anthropicBackend, createDefaultBackend } from '../exam/backends';
export type { CompletionFn } from '../exam/backends';
export type {
  ExamRequest, GeneratedExam, ExamPart, ExamQuestion,
  ExamSolution, VerificationItem,
} from '../exam/types';
