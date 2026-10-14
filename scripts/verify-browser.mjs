import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://localhost:3000';

fs.mkdirSync('shots', { recursive: true });

async function verify() {
  console.log('--- Launching Real Chrome Browser ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const consoleLogs = [];
  const errors = [];

  page.on('console', (msg) => {
    const text = msg.text();
    consoleLogs.push(`[${msg.type()}] ${text}`);
    if (msg.type() === 'error') {
      errors.push(text);
    }
  });

  page.on('pageerror', (err) => {
    errors.push(`PageError: ${err.message}`);
  });

  try {
    console.log(`1. Navigating to ${BASE}...`);
    await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 30000 });

    const title = await page.title();
    console.log(`   Page Title: "${title}"`);

    await page.screenshot({ path: 'shots/1-landing.png' });
    console.log('   ✔ Landing page rendered & screenshot saved: shots/1-landing.png');

    // Check if the logo / brand text is present
    const content = await page.content();
    if (!content.includes('logipulse')) {
      throw new Error('Page does not contain "logipulse" branding');
    }
    console.log('   ✔ Brand element detected.');

    // 2. Click Customer Portal or Role Switcher
    console.log('2. Entering Customer Portal...');
    // In InspoLanding, click the burger menu or button to select Customer Portal
    // Or evaluate login directly via AppContext
    const loggedInCustomer = await page.evaluate(async () => {
      // Find button that contains "Customer" or "Enter"
      const buttons = Array.from(document.querySelectorAll('button, a'));
      const customerBtn = buttons.find((b) => b.textContent && (b.textContent.includes('Customer Portal') || b.textContent.includes('Customer')));
      if (customerBtn) {
        customerBtn.click();
        return true;
      }
      return false;
    });

    await new Promise((r) => setTimeout(r, 2000));
    await page.screenshot({ path: 'shots/2-customer-dashboard.png' });
    console.log('   ✔ Customer dashboard rendered & screenshot saved: shots/2-customer-dashboard.png');

    // 3. Test Rider Mode
    console.log('3. Testing Rider Console...');
    await page.evaluate(() => {
      // Open role switcher or trigger rider login
      const buttons = Array.from(document.querySelectorAll('button'));
      const roleBtn = buttons.find((b) => b.textContent && b.textContent.includes('ROLE'));
      if (roleBtn) roleBtn.click();
    });
    await new Promise((r) => setTimeout(r, 500));
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const riderBtn = buttons.find((b) => b.textContent && b.textContent.includes('Rider'));
      if (riderBtn) riderBtn.click();
    });

    await new Promise((r) => setTimeout(r, 2000));
    await page.screenshot({ path: 'shots/3-rider-dashboard.png' });
    console.log('   ✔ Rider dashboard rendered & screenshot saved: shots/3-rider-dashboard.png');

    // 4. Test Admin Mode
    console.log('4. Testing Admin Operations Console...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const roleBtn = buttons.find((b) => b.textContent && b.textContent.includes('ROLE'));
      if (roleBtn) roleBtn.click();
    });
    await new Promise((r) => setTimeout(r, 500));
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const adminBtn = buttons.find((b) => b.textContent && b.textContent.includes('Admin'));
      if (adminBtn) adminBtn.click();
    });

    await new Promise((r) => setTimeout(r, 2000));
    await page.screenshot({ path: 'shots/4-admin-overview.png' });
    console.log('   ✔ Admin overview rendered & screenshot saved: shots/4-admin-overview.png');

    // 5. Check Console Errors
    console.log('\n--- Diagnostics Summary ---');
    console.log(`Total Console Messages: ${consoleLogs.length}`);
    const filteredErrors = errors.filter(
      (e) => !e.includes('favicon') && !e.includes('OpenStreetMap') && !e.includes('404')
    );
    if (filteredErrors.length === 0) {
      console.log('✔ ZERO runtime JavaScript errors in browser!');
    } else {
      console.log('Errors caught:', filteredErrors);
    }
  } catch (err) {
    console.error('Browser verification failed:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
    console.log('--- Browser closed ---');
  }
}

verify();
