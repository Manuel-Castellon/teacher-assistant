// MVP 1 eval harness. Picks a generator (fake or live), produces a LessonPlan,
// scores it via the deterministic invariant validator. LLM-judged criteria are
// stubbed pending user sign-off on the rubric (see ./README.md).

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, '..', '..');

/**
 * Compile + import the validator. ts-jest handles tests, but eval runs Node
 * directly, so we compile the validator on demand into evals/.cache/.
 *
 * Returns { validateLessonPlanInvariants }.
 */
let validatorPromise;
function loadValidator() {
  if (!validatorPromise) {
    validatorPromise = (async () => {
      const cacheDir = join(__dirname, '..', '.cache');
      const srcRoot = join(REPO_ROOT, 'src');
      const src = join(srcRoot, 'lessonPlan', 'validateInvariants.ts');
      const result = spawnSync(
        'npx',
        ['--no-install', 'tsc', src, '--ignoreConfig', '--rootDir', srcRoot, '--outDir', cacheDir, '--module', 'esnext', '--target', 'es2022', '--moduleResolution', 'bundler', '--skipLibCheck', '--esModuleInterop'],
        { encoding: 'utf8', cwd: REPO_ROOT },
      );
      if (result.status !== 0) {
        throw new Error(`tsc failed for validator: ${result.stderr || result.stdout}`);
      }
      // Ensure Node loads .js as ESM under this cache root.
      mkdirSync(cacheDir, { recursive: true });
      writeFileSync(join(cacheDir, 'package.json'), '{"type":"module"}');
      const compiledJs = join(cacheDir, 'lessonPlan', 'validateInvariants.js');
      return await import(`file://${compiledJs}`);
    })();
  }
  return validatorPromise;
}

function fakeLessonPlan(req) {
  // Minimal well-formed plan. Just enough to wire the harness end-to-end
  // before live runs. Bagrut-review lessons get the required metadata.
  const isReview = req.lessonType === 'חזרה_לבגרות' || req.lessonType === 'חזרה_למבחן';
  const independent = req.duration === 90 && isReview ? 30 : 15;
  const opening = Math.max(5, Math.floor(req.duration * 0.2));
  const practice = req.duration - opening - independent;
  const isBagrut = req.lessonType === 'חזרה_לבגרות';
  const exerciseSource = isBagrut ? 'bagrut_archive' : 'textbook';

  const plan = {
    id: `eval-fake-${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    topic: req.topic,
    subTopic: req.subTopic,
    grade: req.grade,
    duration: req.duration,
    lessonType: req.lessonType,
    phases: {
      opening: {
        name: 'משימת פתיחה',
        durationMinutes: opening,
        exercises: [{ source: exerciseSource, practiceMode: 'עצמאי', estimatedMinutes: opening }],
      },
      practice: {
        name: 'תרגול',
        durationMinutes: practice,
        exercises: [{ source: exerciseSource, practiceMode: 'לוח_משותף', estimatedMinutes: practice }],
      },
      independentWork: {
        name: 'עבודה עצמית',
        durationMinutes: independent,
        exercises: [{ source: exerciseSource, practiceMode: 'עצמאי', estimatedMinutes: independent }],
      },
    },
    homework: null,
    generatedBy: 'teacher',
    promptVersion: 'eval-fake',
  };

  if (isBagrut) {
    plan.bagrutReview = {
      studentSurveyTopic: req.subTopic || req.topic,
      exerciseSources: ['יואל גבע'],
    };
  }
  return plan;
}

async function runWithLive(req) {
  // Defer the import so fake-mode runs don't require the SDK.
  // Reuse the same on-demand compile path as the validator.
  throw new Error('EVAL_MODE=live requires the ClaudeTextGenerator compile path; not wired in this scaffold. Set EVAL_MODE=fake.');
}

export async function runCase(caseInput) {
  const mode = process.env.EVAL_MODE || 'fake';
  const plan = mode === 'live' ? await runWithLive(caseInput) : fakeLessonPlan(caseInput);

  const { validateLessonPlanInvariants } = await loadValidator();
  const violations = validateLessonPlanInvariants(plan);

  return {
    mode,
    plan,
    scoring: {
      deterministic: {
        violations,
        passed: violations.length === 0,
      },
      judged: {
        // Stubbed — rubric pending user sign-off (see ./README.md).
        teacher_notes_honored: null,
        hebrew_quality: null,
        structural_similarity: null,
      },
    },
  };
}
