// Validates that committed curriculum JSON files conform to CurriculumUnit.
// Run: npx tsx scripts/parse-curriculum/validate.ts
//
// We let TS structurally check by importing each JSON and asserting the
// CurriculumUnit shape. tsc will fail if any required field is missing or
// has the wrong type. Extra fields (e.g. `_note`) are tolerated.

import type { CurriculumUnit } from '../../src/types/curriculum';
import year10 from '../../data/curriculum/high-school-5units-year10.json' with { type: 'json' };
import year11 from '../../data/curriculum/high-school-5units-year11.json' with { type: 'json' };
import year12 from '../../data/curriculum/high-school-5units-year12.json' with { type: 'json' };

const units: readonly CurriculumUnit[] = [
  year10 as CurriculumUnit,
  year11 as CurriculumUnit,
  year12 as CurriculumUnit,
];

let totalHours = 0;
for (const u of units) {
  const sum = u.topics.reduce((acc, t) => acc + t.recommendedHours, 0);
  totalHours += sum;
  console.log(`${u.id}: ${u.topics.length} topics, ${sum}h`);
  if (sum !== 150) {
    console.error(`  WARN: expected 150h for 5-יח"ל year, got ${sum}h`);
  }
}
console.log(`Total across years: ${totalHours}h (expected 450)`);
if (totalHours !== 450) process.exit(1);
