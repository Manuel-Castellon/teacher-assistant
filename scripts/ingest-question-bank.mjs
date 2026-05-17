// Idempotent seed ingester for the MVP3 question bank.
//
// Usage:
//   node scripts/ingest-question-bank.mjs            # all files in data/question-bank/seed/
//   node scripts/ingest-question-bank.mjs --dry      # validate JSON only, no DB writes
//   node scripts/ingest-question-bank.mjs path/...   # specific files
//
// Each seed file uses the shape defined in src/questionBank/seedIngest.ts.
// Re-running this is safe: rows are keyed on source_label (natural key) and
// upserted, so unchanged seeds produce no diff.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import pg from 'pg';

const SEED_DIR = 'data/question-bank/seed';
const args = process.argv.slice(2);
const dryRun = args.includes('--dry');
const explicitFiles = args.filter(a => !a.startsWith('--'));

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  try {
    const env = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8');
    for (const line of env.split(/\r?\n/)) {
      const match = line.match(/^DATABASE_URL=(.*)$/);
      if (match) return match[1]?.replace(/^["']|["']$/g, '');
    }
  } catch {
    // fall through
  }
  return null;
}

function discoverFiles() {
  if (explicitFiles.length > 0) return explicitFiles.map(p => resolve(process.cwd(), p));
  const dir = resolve(process.cwd(), SEED_DIR);
  if (!existsSync(dir)) {
    console.log(`no seed directory at ${SEED_DIR}, nothing to do`);
    return [];
  }
  return readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .sort()
    .map(f => join(dir, f));
}

// Re-implement the resolver in plain JS so this CLI doesn't need a TS loader.
// The canonical reference is src/questionBank/seedIngest.ts; keep them aligned.
const VALID_LICENSES = ['ministry-public','teacher-original','copyrighted-personal-use','student-submitted'];
const VALID_GRADES   = ['זי','חי','טי','יי','יאי','יבי'];
const VALID_QTYPES   = ['חישובי','בעיה_מילולית','הוכחה','קריאה_וניתוח','מעורב'];
const VALID_DIFF     = ['בסיסי','בינוני','מתקדם','אתגר'];
const VALID_REP      = ['טקסט','גרף','טבלה','שרטוט','ציר_מספרים','מעורב'];

function fail(file, idx, msg) {
  const where = idx === undefined ? file : `${file} item[${idx}]`;
  throw new Error(`${where}: ${msg}`);
}

function buildNaturalKey(p) {
  const title = p.sourceTitle.trim();
  if (p.pageNumber !== undefined && p.exerciseNumber) return `${title} p${p.pageNumber} ex${p.exerciseNumber}`;
  if (p.exerciseNumber) return `${title} ex${p.exerciseNumber}`;
  return title;
}

function dedupTags(tags) {
  return Array.from(new Set(tags.map(t => String(t).trim()).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b, 'he'));
}

function resolveSeedFile(file, raw) {
  const ingestedAt = new Date().toISOString();
  const ingestedBy = process.env.USER ?? process.env.LOGNAME ?? 'ingest-cli';

  if (!raw.source || typeof raw.source !== 'object') fail(file, undefined, 'source block is required');
  if (!raw.source.sourceTitle?.trim()) fail(file, undefined, 'source.sourceTitle is required');
  if (!VALID_LICENSES.includes(raw.source.license)) fail(file, undefined, `source.license must be one of ${VALID_LICENSES.join(', ')}`);
  if (!raw.source.sourceKind) fail(file, undefined, 'source.sourceKind is required');
  if (!Array.isArray(raw.items) || raw.items.length === 0) fail(file, undefined, 'items must be a non-empty array');

  return raw.items.map((item, idx) => {
    if (!VALID_GRADES.includes(item.grade)) fail(file, idx, `grade=${item.grade} invalid`);
    if (!VALID_QTYPES.includes(item.questionType)) fail(file, idx, `questionType=${item.questionType} invalid`);
    if (item.difficulty && !VALID_DIFF.includes(item.difficulty)) fail(file, idx, `difficulty=${item.difficulty} invalid`);
    if (item.representationType && !VALID_REP.includes(item.representationType)) fail(file, idx, `representationType=${item.representationType} invalid`);
    if (!item.promptMarkdown?.trim()) fail(file, idx, 'promptMarkdown required');

    const provenance = {
      license: raw.source.license,
      sourceTitle: raw.source.sourceTitle,
      ...(raw.source.author ? { author: raw.source.author } : {}),
      ...(raw.source.publisher ? { publisher: raw.source.publisher } : {}),
      ...(raw.source.year ? { year: raw.source.year } : {}),
      ...(raw.source.edition ? { edition: raw.source.edition } : {}),
      ...(raw.source.isbn ? { isbn: raw.source.isbn } : {}),
      ...(raw.source.sourceUrl ? { sourceUrl: raw.source.sourceUrl } : {}),
      ...(item.pageNumber !== undefined ? { pageNumber: item.pageNumber } : {}),
      ...(item.exerciseNumber ? { exerciseNumber: item.exerciseNumber } : {}),
      ingestedAt,
      ingestedBy,
      ...(item.notes ?? raw.source.notes ? { notes: item.notes ?? raw.source.notes } : {}),
    };

    if (provenance.license === 'copyrighted-personal-use') {
      if (!provenance.author) fail(file, idx, 'copyrighted-personal-use requires source.author');
      if (provenance.pageNumber === undefined) fail(file, idx, 'copyrighted-personal-use requires pageNumber');
      if (!provenance.exerciseNumber) fail(file, idx, 'copyrighted-personal-use requires exerciseNumber');
    }

    const naturalKey = buildNaturalKey(provenance);
    const tags = dedupTags([...(raw.defaultTags ?? []), ...(item.tags ?? [])]);

    return { item, provenance, naturalKey, tags, sourceKind: raw.source.sourceKind };
  });
}

async function upsert(client, resolved) {
  const { item, provenance, naturalKey, tags, sourceKind } = resolved;
  const metadata = { provenance };
  const result = await client.query(
    `INSERT INTO question_bank_items
      (teacher_id, source_kind, source_label, grade_level, curriculum_topic_id,
       question_type, difficulty, representation_type, license, prompt_markdown,
       answer_markdown, verification_item, rubric_json, metadata)
     VALUES (NULL, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12::jsonb, $13::jsonb)
     ON CONFLICT (source_label) WHERE teacher_id IS NULL AND source_label IS NOT NULL
     DO UPDATE SET
       source_kind         = EXCLUDED.source_kind,
       grade_level         = EXCLUDED.grade_level,
       curriculum_topic_id = EXCLUDED.curriculum_topic_id,
       question_type       = EXCLUDED.question_type,
       difficulty          = EXCLUDED.difficulty,
       representation_type = EXCLUDED.representation_type,
       license             = EXCLUDED.license,
       prompt_markdown     = EXCLUDED.prompt_markdown,
       answer_markdown     = EXCLUDED.answer_markdown,
       verification_item   = EXCLUDED.verification_item,
       rubric_json         = EXCLUDED.rubric_json,
       metadata            = EXCLUDED.metadata,
       updated_at          = now()
     RETURNING id, xmax::text AS xmax`,
    [
      sourceKind,
      naturalKey,
      item.grade,
      item.curriculumTopicId ?? null,
      item.questionType,
      item.difficulty ?? null,
      item.representationType ?? null,
      provenance.license,
      item.promptMarkdown,
      item.answerMarkdown ?? null,
      item.verification ? JSON.stringify(item.verification) : null,
      null,
      JSON.stringify(metadata),
    ],
  );
  const { id, xmax } = result.rows[0];
  const action = xmax === '0' ? 'inserted' : 'updated';
  await client.query(`DELETE FROM question_bank_tags WHERE question_id = $1::uuid`, [id]);
  for (const tag of tags) {
    await client.query(
      `INSERT INTO question_bank_tags (question_id, tag) VALUES ($1::uuid, $2) ON CONFLICT DO NOTHING`,
      [id, tag],
    );
  }
  return { id, action, naturalKey };
}

const files = discoverFiles();
if (files.length === 0) {
  console.log('no seed files to ingest');
  process.exit(0);
}

const allResolved = [];
for (const file of files) {
  const raw = JSON.parse(readFileSync(file, 'utf8'));
  const resolved = resolveSeedFile(file, raw);
  console.log(`validated ${file}: ${resolved.length} items`);
  for (const r of resolved) allResolved.push({ file, ...r });
}

if (dryRun) {
  console.log(`dry run OK: ${allResolved.length} items across ${files.length} file(s)`);
  process.exit(0);
}

const databaseUrl = loadDatabaseUrl();
if (!databaseUrl) {
  console.error('DATABASE_URL is not set in env or .env.local; re-run with --dry to validate without DB');
  process.exit(1);
}

const client = new pg.Client({ connectionString: databaseUrl });
let inserted = 0;
let updated = 0;

try {
  await client.connect();
  await client.query('BEGIN');
  for (const r of allResolved) {
    const out = await upsert(client, r);
    if (out.action === 'inserted') inserted += 1;
    else updated += 1;
    console.log(`  ${out.action.padEnd(8)} ${out.naturalKey}`);
  }
  await client.query('COMMIT');
  console.log(`ingest summary: ${inserted} inserted, ${updated} updated, ${allResolved.length} total`);
} catch (err) {
  try { await client.query('ROLLBACK'); } catch { /* ignore */ }
  throw err;
} finally {
  await client.end().catch(() => {});
}
