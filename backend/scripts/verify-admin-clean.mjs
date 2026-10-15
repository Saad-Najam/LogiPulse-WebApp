import puppeteer from 'puppeteer-core';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://localhost:3000';

async function checkAdmin() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  await page.goto(BASE, { waitUntil: 'networkidle2' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle2' });

  // Click Sign In
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find((b) => b.textContent && b.textContent.trim() === 'Sign In');
    if (btn) btn.click();
  });
  await new Promise((r) => setTimeout(r, 600));

  // Select Admin role
  await page.evaluate(() => {
    const roleCards = Array.from(document.querySelectorAll('div'));
    const adminCard = roleCards.find((d) => d.textContent && d.textContent.startsWith('Admin') && d.textContent.includes('Operations monitoring'));
    if (adminCard) adminCard.click();
  });
  await new Promise((r) => setTimeout(r, 600));

  // Submit login
  await page.evaluate(() => {
    const submitBtn = document.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.click();
  });

  await new Promise((r) => setTimeout(r, 3000));
  await page.screenshot({ path: 'shots/real-admin-clean.png' });
  console.log('Saved shots/real-admin-clean.png');

  await browser.close();
}

checkAdmin().catch(console.error);
