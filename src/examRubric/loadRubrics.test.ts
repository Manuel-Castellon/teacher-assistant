import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { listExamRubrics, loadExamRubric } from './loadRubrics';
import type { ExamRubric } from './types';

function makeRubric(id: string, overrides: Partial<ExamRubric> = {}): ExamRubric {
  return {
    id,
    sourceExamPath: `data/exam-examples/${id}.pdf`,
    title: `מבחן ${id}`,
    className: "ח'1",
    date: '01.05.26',
    totalPoints: 100,
    projectLearnings: [`לקח עבור ${id}`],
    questions: [{
      questionNumber: 1,
      title: 'אלגברה',
      topic: 'משוואות',
      maxPoints: 100,
      subQuestions: [{
        label: '1.',
        maxPoints: 100,
        expectedAnswer: '$x=2$',
        criteria: [{ id: 'solve', description: 'פתרון נכון', points: 100 }],
      }],
    }],
    ...overrides,
  };
}

describe('loadRubrics', () => {
  let baseDir: string;
  let rubricsPath: string;

  beforeEach(() => {
    baseDir = mkdtempSync(resolve(tmpdir(), 'rubric-loader-'));
    rubricsPath = resolve(baseDir, 'data/exam-rubrics');
    mkdirSync(rubricsPath, { recursive: true });
  });

  afterEach(() => {
    rmSync(baseDir, { recursive: true, force: true });
  });

  function writeRubric(rubric: ExamRubric): void {
    writeFileSync(resolve(rubricsPath, `${rubric.id}.json`), JSON.stringify(rubric));
  }

  it('lists rubrics sorted by id and ignores non-JSON files', () => {
    writeRubric(makeRubric('beta'));
    writeRubric(makeRubric('alpha', { totalPoints: 50, projectLearnings: [] }));
    writeFileSync(resolve(rubricsPath, 'README.md'), '# notes');

    const summaries = listExamRubrics(baseDir);

    expect(summaries.map(s => s.id)).toEqual(['alpha', 'beta']);
    expect(summaries[0]).toMatchObject({
      id: 'alpha',
      title: 'מבחן alpha',
      totalPoints: 50,
      questionCount: 1,
      hasBonus: false,
      projectLearnings: [],
    });
  });

  it('reports hasBonus and full project learnings on the summary', () => {
    writeRubric(makeRubric('with-bonus', {
      projectLearnings: ['א', 'ב'],
      bonus: {
        maxPoints: 5,
        prompt: 'בונוס',
        expectedAnswer: '$2$',
        criteria: [{ id: 'b', description: 'בונוס', points: 5 }],
      },
    }));

    const [summary] = listExamRubrics(baseDir);

    expect(summary?.hasBonus).toBe(true);
    expect(summary?.projectLearnings).toEqual(['א', 'ב']);
  });

  it('loads a rubric and renders its markdown', () => {
    writeRubric(makeRubric('sample'));

    const { rubric, markdown } = loadExamRubric('sample', baseDir);

    expect(rubric.id).toBe('sample');
    expect(markdown).toContain('# מחוון - מבחן sample');
    expect(markdown).toContain('| פתרון נכון | 100 |');
  });

  it('rejects a rubric whose JSON id disagrees with its filename', () => {
    writeFileSync(resolve(rubricsPath, 'mismatch.json'), JSON.stringify(makeRubric('actually-other')));

    expect(() => loadExamRubric('mismatch', baseDir)).toThrow(/id mismatch/);
  });
});
