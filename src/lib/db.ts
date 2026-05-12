import { Pool } from 'pg';

// pg.Pool is lazy — no connection is made until the first query.
// DATABASE_URL is validated at runtime by the auth/query layer, not here.
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
