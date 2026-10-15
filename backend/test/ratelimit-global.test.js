process.env.NODE_ENV = 'test';
// Separate file: the global limiter is per-process, so it needs a process that hasn't spent its budget elsewhere.

import test from 'node:test';
import assert from 'node:assert/strict';
import { call, setBase } from '../testing/helpers.js';

const { start } = await import('../src/server.js');

test('global limiter: 200 requests / min / IP across the API', async () => {
  const app = await start({ port: 0 });
  setBase(`http://localhost:${app.port}`);
  try {
    let ok = 0;
    let first429 = null;
    for (let i = 0; i < 205; i++) {
      const r = await call('GET', '/api/health');
      if (r.status === 200) ok++;
      else if (!first429) first429 = r;
    }
    assert.equal(ok, 200);
    assert.equal(first429.status, 429);
    assert.equal(first429.body.error, 'TOO_MANY_REQUESTS');
  } finally {
    await app.stop();
  }
});
