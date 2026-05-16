import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import type { ExamRubric } from './types';

export interface SaveRubricOptions {
  baseDir?: string;
  now?: () => Date;
  randomSuffix?: () => string;
}

const RUBRICS_DIR = 'data/exam-rubrics';
const SAFE_ID = /^[A-Za-z0-9_-]+$/;

export function generateRubricId(opts: SaveRubricOptions = {}): string {
  const now = (opts.now ?? (() => new Date()))();
  const yyyy = now.getUTCFullYear();
  const mm = pad(now.getUTCMonth() + 1);
  const dd = pad(now.getUTCDate());
  const hh = pad(now.getUTCHours());
  const mi = pad(now.getUTCMinutes());
  const ss = pad(now.getUTCSeconds());
  const suffix = (opts.randomSuffix ?? defaultSuffix)();
  return `rubric-${yyyy}${mm}${dd}-${hh}${mi}${ss}-${suffix}`;
}

export function saveExamRubric(rubric: ExamRubric, opts: SaveRubricOptions = {}): { id: string; filePath: string } {
  if (!SAFE_ID.test(rubric.id)) {
    throw new Error(`Unsafe rubric id: "${rubric.id}"`);
  }
  const dir = resolve(opts.baseDir ?? process.cwd(), RUBRICS_DIR);
  mkdirSync(dir, { recursive: true });
  const filePath = resolve(dir, `${rubric.id}.json`);
  writeFileSync(filePath, JSON.stringify(rubric, null, 2) + '\n', 'utf8');
  return { id: rubric.id, filePath };
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function defaultSuffix(): string {
  return randomBytes(3).toString('hex');
}
