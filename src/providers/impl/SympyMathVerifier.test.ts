import { SympyMathVerifier } from './SympyMathVerifier';
import type { VerificationItem } from '../../exam/types';

const verifier = new SympyMathVerifier();

describe('SympyMathVerifier', () => {
  it('has providerName "sympy"', () => {
    expect(verifier.providerName).toBe('sympy');
  });

  describe('verifyExamItems', () => {
    it('verifies a correct linear equation', async () => {
      const items: VerificationItem[] = [
        { questionRef: 'Q1.1', type: 'equation', sympyExpression: 'Eq(2*x - 4, 0)', expectedAnswer: '{2}' },
      ];
      const results = await verifier.verifyExamItems(items);
      expect(results).toHaveLength(1);
      expect(results[0]!.isValid).toBe(true);
      expect(results[0]!.questionRef).toBe('Q1.1');
    });

    it('detects an incorrect expected answer', async () => {
      const items: VerificationItem[] = [
        { questionRef: 'Q1.2', type: 'equation', sympyExpression: 'Eq(x + 5, 10)', expectedAnswer: '{3}' },
      ];
      const results = await verifier.verifyExamItems(items);
      expect(results[0]!.isValid).toBe(false);
    });

    it('verifies a fractional equation', async () => {
      const items: VerificationItem[] = [
        { questionRef: 'Q2.1', type: 'equation', sympyExpression: 'Eq((x-1)/2 - (x-6)/3, 3)', expectedAnswer: '{9}' },
      ];
      const results = await verifier.verifyExamItems(items);
      expect(results[0]!.isValid).toBe(true);
    });

    it('verifies a two-variable system of equations', async () => {
      const items: VerificationItem[] = [
        {
          questionRef: 'Q1.2',
          type: 'equation',
          sympyExpression: '[Eq(5*x + 3*y, 29), Eq(3*x + 2*y, 18)]',
          expectedAnswer: '{x: 4, y: 3}',
        },
      ];
      const results = await verifier.verifyExamItems(items);
      expect(results[0]!.isValid).toBe(true);
      expect(results[0]!.message).toContain('system solution');
    });

    it('verifies an inequality', async () => {
      const items: VerificationItem[] = [
        { questionRef: 'Q1.3', type: 'inequality', sympyExpression: '2*x < 10', expectedAnswer: 'Interval.open(-oo, 5)' },
      ];
      const results = await verifier.verifyExamItems(items);
      expect(results[0]!.isValid).toBe(true);
    });

    it('verifies a numeric value', async () => {
      const items: VerificationItem[] = [
        { questionRef: 'Q4.2', type: 'numeric', sympyExpression: 'Rational(12, 5)', expectedAnswer: 'Rational(12, 5)' },
      ];
      const results = await verifier.verifyExamItems(items);
      expect(results[0]!.isValid).toBe(true);
    });

    it('passes proof items through as valid (human review)', async () => {
      const items: VerificationItem[] = [
        { questionRef: 'Q4.1', type: 'proof' },
      ];
      const results = await verifier.verifyExamItems(items);
      expect(results[0]!.isValid).toBe(true);
      expect(results[0]!.message).toContain('Proof');
    });

    it('handles identity equations', async () => {
      const items: VerificationItem[] = [
        { questionRef: 'identity', type: 'equation', sympyExpression: 'Eq(x, x)', expectedAnswer: '{0}' },
      ];
      const results = await verifier.verifyExamItems(items);
      expect(results[0]!.isValid).toBe(true);
      expect(results[0]!.message).toContain('Identity');
    });

    it('handles no-solution equations', async () => {
      const items: VerificationItem[] = [
        { questionRef: 'nosol', type: 'equation', sympyExpression: 'Eq(x + 1, x + 2)', expectedAnswer: '{0}' },
      ];
      const results = await verifier.verifyExamItems(items);
      expect(results[0]!.isValid).toBe(false);
      expect(results[0]!.message).toContain('No solution');
    });

    it('verifies a batch of mixed items', async () => {
      const items: VerificationItem[] = [
        { questionRef: 'Q1.1', type: 'equation', sympyExpression: 'Eq(3*x, 9)', expectedAnswer: '{3}' },
        { questionRef: 'Q1.2', type: 'inequality', sympyExpression: 'x - 1 > 0', expectedAnswer: 'Interval.open(1, oo)' },
        { questionRef: 'Q2.1', type: 'proof' },
        { questionRef: 'Q3.1', type: 'numeric', sympyExpression: '36', expectedAnswer: '36' },
      ];
      const results = await verifier.verifyExamItems(items);
      expect(results).toHaveLength(4);
      expect(results.every(r => r.isValid)).toBe(true);
    });
  });

  describe('verifySolution', () => {
    it('verifies a GeneratedExercise through verifyExercise', async () => {
      const result = await verifier.verifyExercise({
        id: 'ex-1',
        content: 'Eq(x - 4, 0)',
        solution: '4',
        difficulty: 'בסיסי',
        topic: 'משוואות',
        grade: 'חי',
        verificationStatus: 'pending',
      });
      expect(result.isValid).toBe(true);
      expect(result.provider).toBe('sympy');
    });

    it('verifies a simple equation and solution', async () => {
      const result = await verifier.verifySolution('Eq(x - 3, 0)', '3');
      expect(result.isValid).toBe(true);
      expect(result.provider).toBe('sympy');
      expect(result.verifiedAt).toBeDefined();
    });

    it('rejects an incorrect solution', async () => {
      const result = await verifier.verifySolution('Eq(x - 3, 0)', '5');
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBeDefined();
    });
  });
});
