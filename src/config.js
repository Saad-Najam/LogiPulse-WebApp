import path from 'node:path';

const env = process.env;
const root = path.resolve(import.meta.dirname, '..');
const isProd = env.NODE_ENV === 'production';
const isTest = env.NODE_ENV === 'test';

export const config = {
  isProd,
  isTest,
  port: Number(env.PORT) || 3000,
  // Required in production. Dev/test fall back to a fixed string so --watch restarts keep tokens valid.
  jwtSecret: env.JWT_SECRET || (isProd ? null : 'dev-only-secret-change-me'),
  jwtExpiresIn: env.JWT_EXPIRES_IN || '24h',
  // Comma-separated list of allowed browser origins. Unset = same-origin only.
  frontendOrigins: env.FRONTEND_URL ? env.FRONTEND_URL.split(',').map((s) => s.trim()) : false,
  // Real PostgreSQL when set; otherwise embedded Postgres (PGlite) so the app runs with zero setup.
  databaseUrl: env.DATABASE_URL || null,
  databaseSsl: env.DATABASE_SSL === 'true',
  pgliteDir: env.PGLITE_DIR || (isTest ? 'memory://' : path.join(root, 'data', 'pgdata')),
  rateLimitDisabled: env.DISABLE_RATE_LIMIT === '1',
  seedDemoData: env.SEED_DEMO_DATA !== 'false',
  bcryptRounds: isTest ? 4 : 10,
};

if (!config.jwtSecret) throw new Error('JWT_SECRET must be set when NODE_ENV=production');
