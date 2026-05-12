#!/usr/bin/env node
// Entry point for `npm run test:evals` (see package.json).
//
// Discovers eval suites in evals/mvp*/ and runs each. A suite is a directory
// with a `cases/` subfolder of *.json case files and a `harness.mjs` that
// exports `runCase(caseInput)`. The deterministic invariant scorer in
// `scoring/invariants.mjs` runs against every produced LessonPlan; LLM-judged
// criteria (Hebrew quality, structural similarity) are stubbed pending user
// sign-off on the rubric.

import { readdir, mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function listSuites(root) {
  const entries = await readdir(root, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory() && /^mvp\d+$/.test(e.name))
    .map((e) => join(root, e.name))
    .sort();
}

async function listCases(suiteDir) {
  const casesDir = join(suiteDir, 'cases');
  if (!existsSync(casesDir)) return [];
  const entries = await readdir(casesDir);
  return entries.filter((f) => f.endsWith('.json')).map((f) => join(casesDir, f));
}

async function loadHarness(suiteDir) {
  const path = join(suiteDir, 'harness.mjs');
  if (!existsSync(path)) return null;
  const mod = await import(pathToFileURL(path).href);
  if (typeof mod.runCase !== 'function') {
    throw new Error(`${path} must export runCase(caseInput)`);
  }
  return mod;
}

async function main() {
  const evalsRoot = __dirname;
  const suites = await listSuites(evalsRoot);
  if (suites.length === 0) {
    console.log('No eval suites found under', evalsRoot);
    return;
  }

  const overallSummary = [];
  let anyFailed = false;

  for (const suiteDir of suites) {
    const suiteName = suiteDir.split('/').pop();
    console.log(`\n=== ${suiteName} ===`);

    const harness = await loadHarness(suiteDir);
    if (!harness) {
      console.log(`  (skipping — no harness.mjs)`);
      continue;
    }

    const cases = await listCases(suiteDir);
    if (cases.length === 0) {
      console.log(`  (skipping — no cases/*.json)`);
      continue;
    }

    const resultsDir = join(suiteDir, 'results');
    await mkdir(resultsDir, { recursive: true });

    const suiteResults = [];
    for (const casePath of cases) {
      const caseInput = JSON.parse(await readFile(casePath, 'utf8'));
      const caseName = casePath.split('/').pop().replace(/\.json$/, '');
      try {
        const result = await harness.runCase(caseInput);
        const passed = result?.scoring?.deterministic?.violations?.length === 0;
        if (!passed) anyFailed = true;
        suiteResults.push({ case: caseName, passed, result });
        console.log(`  ${passed ? '✓' : '✗'} ${caseName}`);
        if (!passed) {
          for (const v of result.scoring.deterministic.violations) {
            console.log(`      - ${v.code}: ${v.message}`);
          }
        }
      } catch (err) {
        anyFailed = true;
        suiteResults.push({ case: caseName, passed: false, error: String(err) });
        console.log(`  ✗ ${caseName} — ${err.message}`);
      }
    }

    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const out = join(resultsDir, `${stamp}.json`);
    await writeFile(out, JSON.stringify({ suite: suiteName, results: suiteResults }, null, 2));
    overallSummary.push({ suite: suiteName, total: suiteResults.length, passed: suiteResults.filter((r) => r.passed).length });
  }

  console.log('\n=== summary ===');
  for (const s of overallSummary) {
    console.log(`  ${s.suite}: ${s.passed}/${s.total} passed`);
  }
  if (anyFailed) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
