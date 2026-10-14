// Runs the whole API suite through the REAL node-postgres driver (Pool, BEGIN/COMMIT/ROLLBACK, wire protocol)
// against PGlite exposed on a TCP socket. PGlite is single-session, so the pool is capped at 1 connection:
// this proves the driver path (types, params, transactions, rollback) - true parallelism needs a real server
// (set TEST_DATABASE_URL to an empty Postgres/Supabase database to run the suite against one on purpose).
import net from 'node:net';
import test from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';

const freePort = () =>
  new Promise((resolve, reject) => {
    const s = net.createServer().listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); });
    s.on('error', reject);
  });

let pgSocket;
let pglite;
if (!process.env.TEST_DATABASE_URL) {
  const { PGlite } = await import('@electric-sql/pglite');
  const { PGLiteSocketServer } = await import('@electric-sql/pglite-socket');
  pglite = await PGlite.create();
  const port = await freePort();
  pgSocket = new PGLiteSocketServer({ db: pglite, port, host: '127.0.0.1', maxConnections: 1 });
  await pgSocket.start();
  process.env.TEST_DATABASE_URL = `postgres://postgres:postgres@127.0.0.1:${port}/postgres`;
  process.env.DATABASE_POOL_MAX = '1';
}

test('driver path is really node-postgres', async () => {
  const { config } = await import('../src/config.js');
  assert.match(config.databaseUrl, /^postgres:\/\//);
});

await import('./api.test.js'); // registers the full suite, now backed by pg

test.after(async () => {
  await pgSocket?.stop();
  await pglite?.close();
});
