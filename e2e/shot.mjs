// usage: node e2e/shot.mjs <path> <out.png> [--role user|rider|admin] [--theme dark|light] [--w 1440] [--h 900] [--wait 800] [--full]
import { launch, apiLogin, openAs, sleep } from './browser.mjs';
const [rawPath, out, ...rest] = process.argv.slice(2);
// Git Bash rewrites a leading '/' into a Windows path, so accept 'login' | 'user.html' without the slash.
const path = rawPath === 'login' ? '/' : rawPath.startsWith('/') && !rawPath.includes(':') ? rawPath : `/${rawPath}`;
const opt = (k, d) => { const i = rest.indexOf(`--${k}`); return i >= 0 ? rest[i + 1] : d; };
const role = opt('role');
const emails = { user: 'user@logipulse.com', rider: 'rider@logipulse.com', admin: 'admin@logipulse.com' };
const browser = await launch();
try {
  const session = role ? await apiLogin(role, emails[role]) : null;
  const page = await openAs(browser, session, path, { width: +opt('w', 1440), height: +opt('h', 900), theme: opt('theme') });
  await sleep(+opt('wait', 900));
  await page.screenshot({ path: out, fullPage: rest.includes('--full') });
  if (page.logs.length) console.log(page.logs.join('\n'));
  console.log('saved', out);
} finally { await browser.close(); }
