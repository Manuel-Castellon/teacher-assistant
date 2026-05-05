import type { GeneratedExercise } from './ITextGenerator';

export interface VerificationResult {
  isValid: boolean;
  computedAnswer: string | null;
  steps?: string[];          // solution steps if available
  errorMessage?: string;     // set when isValid = false
  alternativeForms?: string[]; // equivalent forms of the answer
  provider: 'wolfram' | 'sympy' | 'both';
  verifiedAt: string;        // ISO timestamp
}

/**
 * Math verification interface.
 * Decision: Wolfram Alpha API vs SymPy-only vs both — ASK USER at MVP 2 start.
 *
 * HARD RULE: No generated math exercise may be shown to the teacher
 * without a VerificationResult where isValid = true.
 */
export interface IMathVerifier {
  verifyExercise(exercise: GeneratedExercise): Promise<VerificationResult>;
  verifySolution(problem: string, proposedSolution: string): Promise<VerificationResult>;
  readonly providerName: string;
}
