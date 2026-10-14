process.env.NODE_ENV = 'test';
// rate limiting stays ENABLED in this file

import test from 'node:test';
import assert from 'node:assert/strict';

const { start } = await import('../src/server.js');

test('auth limiter blocks brute force after 10 failed logins, then reports 429', async () => {
  const app = await start({ port: 0 });
  try {
    const attempt = () =>
      fetch(`http://localhost:${app.port}/api/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ role: 'user', email: 'user@logipulse.com', password: 'wrong' }),
      });
    for (let i = 0; i < 10; i++) assert.equal((await attempt()).status, 401);
    const blocked = await attempt();
    assert.equal(blocked.status, 429);
    assert.equal((await blocked.json()).error, 'TOO_MANY_LOGIN_ATTEMPTS');
  } finally {
    await app.stop();
  }
});
