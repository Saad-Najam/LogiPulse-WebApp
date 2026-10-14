// Single data layer shared by REST routes and socket handlers.
// Exposes one tiny interface - query / tx / exec - over either:
//   * node-postgres Pool   (when DATABASE_URL is set, e.g. Render / Supabase / Neon)
//   * PGlite, embedded real Postgres (zero-setup local dev, tests and demo fallback)
import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';

let impl = null;

export async function initDb() {
  if (impl) return impl;

  if (config.databaseUrl) {
    const { default: pg } = await import('pg');
    const pool = new pg.Pool({
      connectionString: config.databaseUrl,
      ssl: config.databaseSsl ? { rejectUnauthorized: false } : undefined,
      max: 10,
    });
    impl = {
      kind: 'postgres',
      query: (text, params) => pool.query(text, params),
      exec: (sql) => pool.query(sql),
      async tx(fn) {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const result = await fn(client);
          await client.query('COMMIT');
          return result;
        } catch (err) {
          await client.query('ROLLBACK').catch(() => {});
          throw err;
        } finally {
          client.release();
        }
      },
      close: () => pool.end(),
    };
  } else {
    const { PGlite } = await import('@electric-sql/pglite');
    if (!config.pgliteDir.startsWith('memory://')) fs.mkdirSync(path.dirname(config.pgliteDir), { recursive: true });
    const db = new PGlite(config.pgliteDir);
    await db.waitReady;
    impl = {
      kind: 'pglite',
      query: (text, params) => db.query(text, params),
      exec: (sql) => db.exec(sql),
      tx: (fn) => db.transaction((t) => fn(t)), // rolls back automatically if fn throws
      close: () => db.close(),
    };
  }

  await impl.exec(fs.readFileSync(path.join(import.meta.dirname, 'db', 'schema.sql'), 'utf8'));
  return impl;
}

const need = () => {
  if (!impl) throw new Error('Database not initialised - call initDb() first');
  return impl;
};

export const query = (text, params) => need().query(text, params);
// Run fn(client) inside BEGIN/COMMIT; any throw rolls everything back. client.query(text, params) as usual.
export const withTransaction = (fn) => need().tx(fn);
export const dbKind = () => need().kind;
export const closeDb = async () => {
  if (impl) await impl.close();
  impl = null;
};
