import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import pg from 'pg';

const DEFAULT_MIGRATIONS = [
  'db/migrations/2026-05-15-class-progress-persistence.sql',
  'db/migrations/2026-05-16-generated-artifacts-question-bank.sql',
  'db/migrations/2026-05-17-question-bank-provenance.sql',
  'db/migrations/2026-05-17-question-bank-license-tiers.sql',
];

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  try {
    const env = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8');
    for (const line of env.split(/\r?\n/)) {
      const match = line.match(/^DATABASE_URL=(.*)$/);
      if (match) return match[1]?.replace(/^["']|["']$/g, '');
    }
  } catch {
    // Fall through to the explicit error below.
  }

  throw new Error('DATABASE_URL is not set in the environment or .env.local');
}

const files = process.argv.slice(2);
const migrationFiles = files.length > 0 ? files : DEFAULT_MIGRATIONS;
const client = new pg.Client({ connectionString: loadDatabaseUrl() });

try {
  await client.connect();
  for (const file of migrationFiles) {
    const sql = readFileSync(resolve(process.cwd(), file), 'utf8');
    await client.query(sql);
    console.log(`applied ${file}`);
  }
} finally {
  await client.end().catch(() => {});
}
