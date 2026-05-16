import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ExamRubric } from './types';
import { renderExamRubricMarkdown } from './renderRubric';

export interface ExamRubricSummary {
  id: string;
  title: string;
  className: string;
  date: string;
  totalPoints: number;
  questionCount: number;
  hasBonus: boolean;
  sourceExamPath: string;
  projectLearnings: string[];
}

export interface ExamRubricWithMarkdown {
  rubric: ExamRubric;
  markdown: string;
}

const DEFAULT_DIR = 'data/exam-rubrics';

function rubricsDir(baseDir?: string): string {
  return resolve(baseDir ?? process.cwd(), DEFAULT_DIR);
}

function readRubricJson(dir: string, id: string): ExamRubric {
  const filePath = resolve(dir, `${id}.json`);
  const raw = readFileSync(filePath, 'utf8');
  const parsed = JSON.parse(raw) as ExamRubric;
  if (parsed.id !== id) {
    throw new Error(`Rubric id mismatch: file "${id}.json" declares id "${parsed.id}"`);
  }
  return parsed;
}

export function listExamRubrics(baseDir?: string): ExamRubricSummary[] {
  const dir = rubricsDir(baseDir);
  const entries = readdirSync(dir, { withFileTypes: true });
  const summaries: ExamRubricSummary[] = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
    const id = entry.name.slice(0, -'.json'.length);
    const rubric = readRubricJson(dir, id);
    summaries.push({
      id: rubric.id,
      title: rubric.title,
      className: rubric.className,
      date: rubric.date,
      totalPoints: rubric.totalPoints,
      questionCount: rubric.questions.length,
      hasBonus: Boolean(rubric.bonus),
      sourceExamPath: rubric.sourceExamPath,
      projectLearnings: rubric.projectLearnings,
    });
  }
  return summaries.sort((a, b) => a.id.localeCompare(b.id));
}

export function loadExamRubric(id: string, baseDir?: string): ExamRubricWithMarkdown {
  const dir = rubricsDir(baseDir);
  const rubric = readRubricJson(dir, id);
  const markdown = renderExamRubricMarkdown(rubric);
  return { rubric, markdown };
}
