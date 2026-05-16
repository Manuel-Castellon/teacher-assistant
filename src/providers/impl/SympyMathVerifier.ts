import { execFile } from 'node:child_process';
import { resolve } from 'node:path';
import type { IMathVerifier, VerificationResult } from '../interfaces/IMathVerifier';
import type { GeneratedExercise } from '../interfaces/ITextGenerator';
import type { VerificationItem } from '../../exam/types';

const PROJECT_ROOT = process.cwd();
const VERIFY_SCRIPT = resolve(PROJECT_ROOT, 'scripts/verify-math.py');
const VENV_PYTHON = resolve(PROJECT_ROOT, '.venv/bin/python3');

export interface SympyResult {
  questionRef: string;
  isValid: boolean;
  computedAnswer: string | null;
  message: string;
}

function runSympy(items: VerificationItem[]): Promise<SympyResult[]> {
  return new Promise((resolve, reject) => {
    const child = execFile(VENV_PYTHON, [VERIFY_SCRIPT], { timeout: 30_000 }, (err, stdout, stderr) => {
      if (err) {
        reject(new Error(`SymPy verification failed: ${err.message}\nstderr: ${stderr}`));
        return;
      }
      try {
        resolve(JSON.parse(stdout));
      } catch (parseErr) {
        reject(new Error(`Failed to parse SymPy output: ${stdout}`));
      }
    });
    child.stdin!.write(JSON.stringify(items));
    child.stdin!.end();
  });
}

export class SympyMathVerifier implements IMathVerifier {
  readonly providerName = 'sympy';

  async verifyExercise(exercise: GeneratedExercise): Promise<VerificationResult> {
    return this.verifySolution(exercise.content, exercise.solution);
  }

  async verifySolution(problem: string, proposedSolution: string): Promise<VerificationResult> {
    const item: VerificationItem = {
      questionRef: 'single',
      type: 'equation',
      sympyExpression: problem,
      expectedAnswer: proposedSolution,
    };

    const results = await runSympy([item]);
    const r = results[0]!;

    const result: VerificationResult = {
      isValid: r.isValid,
      computedAnswer: r.computedAnswer,
      provider: 'sympy',
      verifiedAt: new Date().toISOString(),
    };
    if (!r.isValid) {
      result.errorMessage = r.message;
    }
    return result;
  }

  async verifyExamItems(items: VerificationItem[]): Promise<SympyResult[]> {
    return runSympy(items);
  }
}
