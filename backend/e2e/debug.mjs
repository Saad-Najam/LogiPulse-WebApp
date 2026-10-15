import { launch, apiLogin, openAs, sleep } from './browser.mjs';
const b = await launch();
const s = await apiLogin('admin', 'admin@logipulse.com');
const p = await openAs(b, s, '/admin.html#orders', { theme: 'light' });
await sleep(2500);
console.log(await p.evaluate(() => ({ rows: document.querySelectorAll('#o-body tr').length, html: document.querySelector('#o-body').innerHTML.slice(0, 200), count: document.querySelector('#o-count').textContent, hidden: document.querySelector('#sec-orders').className })));
console.log(p.logs.join('\n'));
await b.close();
