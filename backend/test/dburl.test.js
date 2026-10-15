process.env.NODE_ENV = 'test';

import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { inspectDatabaseUrl, explainConnectionError } from '../src/lib/dbUrl.js';

const REF = 'abcdefghijklmnopqrst';

test('Supabase session pooler URI is accepted without problems', () => {
  const i = inspectDatabaseUrl(`postgresql://postgres.${REF}:s3cret@aws-0-ap-south-1.pooler.supabase.com:5432/postgres`);
  assert.deepEqual(i.problems, []);
  assert.equal(i.kind, 'session-pooler');
  assert.equal(i.isSupabase, true);
  assert.equal(i.user, `postgres.${REF}`);
});

test('transaction pooler (port 6543) is recognised', () => {
  const i = inspectDatabaseUrl(`postgresql://postgres.${REF}:s3cret@aws-0-ap-south-1.pooler.supabase.com:6543/postgres`);
  assert.equal(i.kind, 'transaction-pooler');
  assert.deepEqual(i.problems, []);
});

test('direct connection is flagged as IPv6-only', () => {
  const i = inspectDatabaseUrl(`postgresql://postgres:s3cret@db.${REF}.supabase.co:5432/postgres`);
  assert.equal(i.kind, 'direct');
  assert.match(i.problems.join(' '), /IPv6/);
  assert.match(i.problems.join(' '), /Session pooler/);
});

test('placeholder password, missing pooler username and unparsable URLs are caught', () => {
  assert.match(inspectDatabaseUrl('postgresql://postgres.x:[YOUR-PASSWORD]@aws-0-x.pooler.supabase.com:5432/postgres').problems.join(' '), /placeholder/);
  assert.match(inspectDatabaseUrl('postgresql://postgres:pw@aws-0-x.pooler.supabase.com:5432/postgres').problems.join(' '), /postgres\.<project-ref>/);
  assert.match(inspectDatabaseUrl('not a url').problems.join(' '), /could not be parsed/);
  assert.match(inspectDatabaseUrl('').problems.join(' '), /empty/);
  assert.match(inspectDatabaseUrl('mysql://u:p@host/db').problems.join(' '), /postgresql:\/\//);
});

test('connection errors get specific, actionable hints (original message preserved)', () => {
  const url = `postgresql://postgres.${REF}:pw@aws-0-x.pooler.supabase.com:5432/postgres`;
  const cases = [
    [{ code: 'ENOTFOUND', message: 'getaddrinfo ENOTFOUND h' }, /does not exist/],
    [{ code: 'ENETUNREACH', message: 'connect ENETUNREACH' }, /Session pooler/],
    [{ code: 'ECONNREFUSED', message: 'connect ECONNREFUSED' }, /paused/],
    [{ code: '28P01', message: 'password authentication failed for user "postgres"' }, /Reset database password/],
    [{ message: 'Tenant or user not found' }, /postgres\.<project-ref>/],
    [{ message: 'remaining connection slots are reserved' }, /DATABASE_POOL_MAX/],
  ];
  for (const [err, re] of cases) {
    const e = explainConnectionError(err, url);
    assert.match(e.message, re);
    assert.ok(e.message.includes(err.message));
  }
});

test('SSL is automatic for Supabase hosts, and DATABASE_SSL overrides it', () => {
  const run = (env) => spawnSync(process.execPath, ['-e', "import('./src/config.js').then(m=>console.log(m.config.databaseSsl))"], {
    cwd: new URL('..', import.meta.url), env: { PATH: process.env.PATH, NODE_ENV: 'development', ...env }, encoding: 'utf8',
  }).stdout.trim();
  assert.equal(run({ DATABASE_URL: `postgresql://u:p@aws-0-x.pooler.supabase.com:5432/postgres` }), 'true');
  assert.equal(run({ DATABASE_URL: `postgresql://u:p@db.${REF}.supabase.co:5432/postgres` }), 'true');
  assert.equal(run({ DATABASE_URL: 'postgresql://u:p@localhost:5432/postgres' }), 'false');
  assert.equal(run({ DATABASE_URL: 'postgresql://u:p@aws-0-x.pooler.supabase.com:5432/postgres', DATABASE_SSL: 'false' }), 'false');
  assert.equal(run({ DATABASE_URL: 'postgresql://u:p@localhost:5432/postgres', DATABASE_SSL: 'true' }), 'true');
});

test('server fails fast with a readable message when DATABASE_URL points nowhere', () => {
  const r = spawnSync(process.execPath, ['src/server.js'], {
    cwd: new URL('..', import.meta.url),
    env: { PATH: process.env.PATH, NODE_ENV: 'development', PORT: '0', DATABASE_URL: 'postgresql://postgres.x:[YOUR-PASSWORD]@127.0.0.1:1/postgres' },
    encoding: 'utf8', timeout: 30000,
  });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /Database connection failed/);
  assert.match(r.stderr, /placeholder/);
});

test('db:reset refuses to run without --yes', () => {
  const r = spawnSync(process.execPath, ['scripts/db.js', 'reset'], {
    cwd: new URL('..', import.meta.url), env: { PATH: process.env.PATH, PGLITE_DIR: 'memory://' }, encoding: 'utf8', timeout: 30000,
  });
  assert.equal(r.status, 1);
  assert.match(r.stdout, /DELETE ALL DATA/);
});
