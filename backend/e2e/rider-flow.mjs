import { launch, apiLogin, openAs, sleep } from './browser.mjs';
const b = await launch();
try {
  const s = await apiLogin('rider', 'rider@logipulse.com');
  const p = await openAs(b, s, '/rider.html', { width: 1440, height: 900, theme: process.argv[2] || 'dark' });
  await sleep(1800);
  await p.screenshot({ path: 'shots/rider-1-list.png' });
  // move the rider by clicking the map far to the north -> order of cards should change
  await p.mouse.click(1000, 420); await sleep(1500);
  await p.screenshot({ path: 'shots/rider-2-moved.png' });
  // select first card
  await p.click('#rlist article:first-child'); await sleep(1400);
  await p.screenshot({ path: 'shots/rider-3-selected.png' });
  console.log(await p.evaluate(() => [...document.querySelectorAll('#rlist article')].map((a) => a.querySelector('.dist').innerText.replace(/\s+/g,'') + ' ' + a.querySelector('[data-priority]')?.innerText).join(' | ')));
  console.log(p.logs.filter(l => !/openstreetmap/.test(l)).join('\n') || 'no console issues');
} finally { await b.close(); }
