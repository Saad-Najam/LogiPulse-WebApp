// Tiny puppeteer helpers shared by screenshot + end-to-end scripts (system Chrome, no download).
import puppeteer from 'puppeteer-core';

export const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
export const BASE = process.env.BASE || 'http://localhost:3200';

export async function launch() {
  return puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
}

export async function apiLogin(role, email, password = 'password123') {
  const r = await fetch(`${BASE}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ role, email, password }) });
  if (!r.ok) throw new Error(`login failed ${r.status}`);
  return r.json();
}

// New page that is already signed in (session injected before any script runs) with the chosen theme.
export async function openAs(browser, session, path, { width = 1440, height = 900, theme, geo } = {}) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  const logs = [];
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) logs.push(`${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => logs.push(`pageerror: ${e.message}`));
  page.on('requestfailed', (r) => { if (!/cartocdn/.test(r.url())) logs.push(`requestfailed: ${r.url()}`); });
  await page.evaluateOnNewDocument((s, t) => {
    if (s) sessionStorage.setItem('logipulse.session', JSON.stringify(s));
    if (t && s) localStorage.setItem(`lp-theme-${s.user.role}`, t);
    if (t && !s) localStorage.setItem('lp-theme-user', t);
  }, session, theme);
  if (geo) { const ctx = browser.defaultBrowserContext(); await ctx.overridePermissions(BASE, ['geolocation']); await page.setGeolocation(geo); }
  await page.goto(BASE + path, { waitUntil: 'load', timeout: 30000 });
  page.logs = logs;
  return page;
}
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
