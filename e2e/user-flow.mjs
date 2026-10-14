import { launch, apiLogin, openAs, sleep } from './browser.mjs';
const b = await launch();
try {
  const s = await apiLogin('user', 'user@logipulse.com');
  const p = await openAs(b, s, '/user.html', { width: 1440, height: 900, theme: process.argv[2] || 'light' });
  await sleep(1200);
  await p.screenshot({ path: 'shots/user-1-home.png' });
  // fill the form via UI
  await p.click('#pickup'); await sleep(300);
  await p.screenshot({ path: 'shots/user-2-combo.png' });
  await p.click('#combo-list li:nth-child(2)'); await sleep(900);
  await p.type('#delivery', 'House 12, Block 5, Gulshan-e-Iqbal');
  await p.type('#desc', 'Birthday gift box, fragile. Please call on arrival.');
  await p.screenshot({ path: 'shots/user-3-filled.png' });
  await p.click('#req-submit'); await sleep(1400);
  await p.screenshot({ path: 'shots/user-4-created.png' });
  // open the newest order
  await p.click('#orders article:first-child'); await sleep(1500);
  await p.screenshot({ path: 'shots/user-5-drawer.png' });
  console.log(p.logs.join('\n') || 'no console issues');
} finally { await b.close(); }
