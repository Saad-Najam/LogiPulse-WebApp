import puppeteer from 'puppeteer-core';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://localhost:3000';

async function testRegister() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  page.on('console', (msg) => console.log('BROWSER CONSOLE:', msg.text()));

  await page.goto(BASE, { waitUntil: 'networkidle2' });

  console.log('1. Clicking "Create Account" button on landing page...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find((b) => b.textContent && b.textContent.trim() === 'Create Account');
    if (btn) btn.click();
  });
  await new Promise((r) => setTimeout(r, 800));

  await page.screenshot({ path: 'shots/acc-create-page.png' });
  console.log('2. Saved shots/acc-create-page.png');

  // Fill in name, email, password
  const testEmail = `danial_${Date.now()}@example.com`;
  console.log(`3. Filling in registration form for: Danial Ahmed (${testEmail})...`);
  
  await page.click('#register-name', { clickCount: 3 });
  await page.type('#register-name', 'Danial Ahmed');

  await page.click('#login-email', { clickCount: 3 });
  await page.keyboard.press('Backspace');
  await page.type('#login-email', testEmail);

  await page.click('#login-password', { clickCount: 3 });
  await page.keyboard.press('Backspace');
  await page.type('#login-password', 'securepass123');

  // Submit registration
  await page.evaluate(() => {
    const submitBtn = document.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.click();
  });

  await new Promise((r) => setTimeout(r, 3500));
  await page.screenshot({ path: 'shots/account-created-dashboard.png' });
  console.log('4. Saved shots/account-created-dashboard.png');

  const dashboardText = await page.evaluate(() => document.body.innerText);
  const success = dashboardText.includes('CUSTOMER') || dashboardText.includes('Overview');
  console.log('5. Registration result - Landed on authenticated dashboard:', success);

  await browser.close();
}

testRegister().catch((err) => {
  console.error('Error during test:', err);
  process.exit(1);
});
