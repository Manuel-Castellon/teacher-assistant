// Provider registry — swap implementations here, not throughout the codebase.
// Each provider is injected via constructor, not imported directly in feature code.

export type { ITextGenerator, GeneratedExercise, ExerciseRequest, ExamRequest, GeneratedExam } from './interfaces/ITextGenerator';
export type { IMathVerifier, VerificationResult } from './interfaces/IMathVerifier';
export type { IOCRProvider, OCRResult, MathExpression } from './interfaces/IOCRProvider';
export type { IGradingProvider, GradingSession, GradingSuggestion } from './interfaces/IGradingProvider';
export type { IDocumentExporter, ExportResult, ExportFormat } from './interfaces/IDocumentExporter';

// TODO (MVP 0): implement and register concrete providers after user chooses:
// - ITextGenerator  → ClaudeTextGenerator (default)
// - IMathVerifier   → decide at MVP 2: WolframVerifier | SympyVerifier | BothVerifier
// - IOCRProvider    → decide at MVP 0 after testing: MathPixProvider | GoogleDocAIProvider | TesseractProvider | AzureProvider
// - IGradingProvider → decide at MVP 6: GradeLabProvider | ExamAIProvider | CustomProvider
// - IDocumentExporter → DocxExporter (default)
