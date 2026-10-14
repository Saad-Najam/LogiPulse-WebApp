import { launch, apiLogin, openAs, sleep } from './browser.mjs';
const b = await launch();
try {
  const s = await apiLogin('admin', 'admin@logipulse.com');
  const theme = process.argv[2] || 'light';
  const p = await openAs(b, s, '/admin.html', { width: 1440, height: 900, theme });
  await sleep(2200);
  await p.screenshot({ path: 'shots/admin-1-overview.png', fullPage: true });
  for (const r of ['orders', 'riders', 'users', 'priority']) {
    await p.evaluate((x) => { location.hash = x; }, r); await sleep(1800);
    if (r === 'orders') { await p.click('#o-body tr.row:nth-child(1)'); await sleep(900); }
    await p.screenshot({ path: `shots/admin-${r}.png`, fullPage: true });
  }
  console.log(p.logs.filter((l) => !/openstreetmap/.test(l)).join('\n') || 'no console issues');
} finally { await b.close(); }
