// Database admin commands:  npm run db:check | db:setup | db:reset
//   check  - connect, report what you're connected to, list tables / RLS / row counts
//   setup  - create tables (idempotent) and seed demo data if the database is empty
//   reset  - TRUNCATE everything and re-seed (needs --yes). For resetting the demo before judging.
import { config } from '../src/config.js';
import { initDb, query, dbKind, closeDb } from '../src/db.js';
import { seedIfEmpty } from '../src/db/seed.js';
import { inspectDatabaseUrl } from '../src/lib/dbUrl.js';

const cmd = process.argv[2];
const TABLES = ['users', 'riders', 'admins', 'orders', 'messages', 'order_status_log', 'priority_change_log'];

function where() {
  if (!config.databaseUrl) return `embedded Postgres (PGlite) at ${config.pgliteDir}  [DATABASE_URL is not set]`;
  const i = inspectDatabaseUrl(config.databaseUrl);
  return `${i.host}:${i.port} as ${i.user} (${i.kind}, ssl ${config.databaseSsl ? 'on' : 'off'})`;
}

async function check() {
  console.log('Target :', where());
  const { rows: [v] } = await query('SELECT version() AS v, current_user AS u, current_database() AS d');
  console.log('Server :', v.v.split(',')[0]);
  console.log('Login  :', `${v.u} @ ${v.d}`);
  if (dbKind() === 'postgres') {
    const { rows } = await query('SELECT ssl FROM pg_stat_ssl WHERE pid = pg_backend_pid()').catch(() => ({ rows: [] }));
    if (rows[0]) console.log('TLS    :', rows[0].ssl ? 'yes' : 'NO (Supabase requires SSL)');
  }
  const { rows: rls } = await query(
    `SELECT c.relname, c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relname = ANY($1)`, [TABLES],
  );
  const rlsOf = Object.fromEntries(rls.map((r) => [r.relname, r.relrowsecurity]));
  console.log('\nTable                 rows   RLS');
  let missing = 0;
  for (const t of TABLES) {
    if (!(t in rlsOf)) { console.log(`${t.padEnd(20)}  MISSING`); missing++; continue; }
    const { rows: [{ n }] } = await query(`SELECT COUNT(*)::int AS n FROM ${t}`);
    console.log(`${t.padEnd(20)} ${String(n).padStart(5)}   ${rlsOf[t] ? 'on' : 'OFF  <- run npm run db:setup'}`);
  }
  console.log(missing ? '\nSome tables are missing - run: npm run db:setup' : '\nAll good.');
}

async function setup() {
  const seeded = await seedIfEmpty();
  console.log(`Schema is up to date. Demo data: ${seeded ? 'inserted' : 'skipped (database already has users, or SEED_DEMO_DATA=false)'}.`);
}

async function reset() {
  if (!process.argv.includes('--yes')) {
    console.log(`This will DELETE ALL DATA in: ${where()}\nRe-run with --yes to confirm:  npm run db:reset -- --yes`);
    process.exitCode = 1;
    return;
  }
  await query(`TRUNCATE ${TABLES.join(', ')} RESTART IDENTITY CASCADE`);
  await setup();
}

const commands = { check, setup, reset };
if (!commands[cmd]) {
  console.log('Usage: node scripts/db.js <check|setup|reset>');
  process.exit(1);
}
try {
  await initDb(); // applies the idempotent schema, so `check` also shows whether setup would be a no-op
  await commands[cmd]();
} catch (err) {
  console.error('\n' + err.message);
  process.exitCode = 1;
} finally {
  await closeDb();
}
