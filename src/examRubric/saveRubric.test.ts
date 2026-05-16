import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { generateRubricId, saveExamRubric } from './saveRubric';
import type { ExamRubric } from './types';

function makeRubric(id: string): ExamRubric {
  return {
    id,
    sourceExamPath: 'generated:exam:test',
    title: 'מבחן בדיקה',
    className: "ח'1",
    date: '20.05.26',
    totalPoints: 10,
    projectLearnings: [],
    questions: [],
  };
}

describe('generateRubricId', () => {
  it('uses the injected clock and suffix', () => {
    const id = generateRubricId({
      now: () => new Date(Date.UTC(2026, 4, 16, 18, 45, 23)),
      randomSuffix: () => 'abc123',
    });
    expect(id).toBe('rubric-20260516-184523-abc123');
  });

  it('returns a filesystem-safe slug by default', () => {
    const id = generateRubricId();
    expect(id).toMatch(/^rubric-\d{8}-\d{6}-[a-f0-9]{6}$/);
  });
});

describe('saveExamRubric', () => {
  let baseDir: string;

  beforeEach(() => {
    baseDir = mkdtempSync(resolve(tmpdir(), 'save-rubric-'));
  });

  afterEach(() => {
    rmSync(baseDir, { recursive: true, force: true });
  });

  it('writes the rubric as JSON under data/exam-rubrics and returns the path', () => {
    const rubric = makeRubric('rubric-test-1');
    const { id, filePath } = saveExamRubric(rubric, { baseDir });

    expect(id).toBe('rubric-test-1');
    expect(existsSync(filePath)).toBe(true);
    const parsed = JSON.parse(readFileSync(filePath, 'utf8')) as ExamRubric;
    expect(parsed.id).toBe('rubric-test-1');
    expect(parsed.title).toBe('מבחן בדיקה');
  });

  it('rejects ids that would escape the rubrics directory', () => {
    expect(() => saveExamRubric(makeRubric('../escape'), { baseDir })).toThrow(/Unsafe/);
    expect(() => saveExamRubric(makeRubric('with space'), { baseDir })).toThrow(/Unsafe/);
    expect(() => saveExamRubric(makeRubric('with.dot'), { baseDir })).toThrow(/Unsafe/);
  });
});
