import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import dns from 'node:dns';
import { config } from './config.js';
import { initDb, closeDb } from './db.js';
import { seedIfEmpty } from './db/seed.js';
import { createApp } from './app.js';
import { attachSockets } from './sockets/index.js';

try {
  dns.setDefaultResultOrder('ipv4first');
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch { /* ignore */ }

// Boots DB -> seed -> Express -> Socket.IO. Returns handles so tests can start/stop on an ephemeral port.
export async function start({ port = config.port } = {}) {
  await initDb();
  const seeded = await seedIfEmpty();
  const httpServer = createServer(createApp());
  const io = attachSockets(httpServer);
  await new Promise((resolve) => httpServer.listen(port, resolve));

  const stop = async () => {
    io.close();
    await new Promise((resolve) => httpServer.close(resolve));
    await closeDb();
  };
  return { httpServer, io, port: httpServer.address().port, seeded, stop };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  start()
    .then(({ port, seeded, stop }) => {
      console.log(`LogiPulse API + sockets on http://localhost:${port}${seeded ? ' (demo data seeded)' : ''}`);
      // Close sockets + DB cleanly on deploy/restart so embedded Postgres never needs crash recovery.
      for (const sig of ['SIGINT', 'SIGTERM']) process.once(sig, () => stop().finally(() => process.exit(0)));
      // A stray rejection in a socket handler must not take the whole demo down.
      process.on('unhandledRejection', (err) => console.error('[unhandledRejection]', err));
    })
    .catch((err) => {
      console.error('Failed to start:', err);
      process.exit(1);
    });
}
