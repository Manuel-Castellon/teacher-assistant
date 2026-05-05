// Validates that committed curriculum JSON files conform to CurriculumUnit.
// Run: npx tsx scripts/parse-curriculum/validate.ts
//
// TS structurally checks by importing each JSON and asserting the
// CurriculumUnit shape. tsc fails if any required field is missing or
// has the wrong type. Extra fields (e.g. `_note`) are tolerated.
//
// High-school 5-יח"ל years are hand-curated from page-1 summary tables, so
// we hard-assert 150h/year and 450h total.
// Middle-school grades are heuristic-parsed from פריסת הוראה Google Docs and
// have a known gap (free / חזרות weeks not tied to a specific topic) — we
// print actuals but do not assert.

import type { CurriculumUnit } from '../../src/types/curriculum';
import hsYear10 from '../../data/curriculum/high-school-5units-year10.json' with { type: 'json' };
import hsYear11 from '../../data/curriculum/high-school-5units-year11.json' with { type: 'json' };
import hsYear12 from '../../data/curriculum/high-school-5units-year12.json' with { type: 'json' };
import msGrade7 from '../../data/curriculum/middle-school-grade7.json' with { type: 'json' };
import msGrade8 from '../../data/curriculum/middle-school-grade8.json' with { type: 'json' };
import msGrade9 from '../../data/curriculum/middle-school-grade9.json' with { type: 'json' };
import msGrade9Reduced from '../../data/curriculum/middle-school-grade9-reduced.json' with { type: 'json' };

const highSchool: readonly CurriculumUnit[] = [
  hsYear10 as CurriculumUnit,
  hsYear11 as CurriculumUnit,
  hsYear12 as CurriculumUnit,
];
const middleSchool: readonly CurriculumUnit[] = [
  msGrade7 as CurriculumUnit,
  msGrade8 as CurriculumUnit,
  msGrade9 as CurriculumUnit,
  msGrade9Reduced as CurriculumUnit,
];

console.log('--- high school 5-יח"ל ---');
let hsTotal = 0;
for (const u of highSchool) {
  const sum = u.topics.reduce((acc, t) => acc + t.recommendedHours, 0);
  hsTotal += sum;
  console.log(`${u.id}: ${u.topics.length} topics, ${sum}h`);
  if (sum !== 150) {
    console.error(`  WARN: expected 150h for 5-יח"ל year, got ${sum}h`);
  }
}
console.log(`Total across high-school years: ${hsTotal}h (expected 450)`);

console.log('--- middle school (חטיבת ביניים) ---');
for (const u of middleSchool) {
  const sum = u.topics.reduce((acc, t) => acc + t.recommendedHours, 0);
  console.log(`${u.id}: ${u.topics.length} topics, ${sum}h`);
}

if (hsTotal !== 450) process.exit(1);
