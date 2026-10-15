import puppeteer from 'puppeteer-core';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://localhost:3000';

async function checkReal() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  await page.goto(BASE, { waitUntil: 'networkidle2' });

  // Click Sign In
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find((b) => b.textContent && b.textContent.trim() === 'Sign In');
    if (btn) btn.click();
  });
  await new Promise((r) => setTimeout(r, 600));

  // Select Rider role & login
  await page.evaluate(() => {
    const divs = Array.from(document.querySelectorAll('div, button'));
    const riderOption = divs.find((d) => d.textContent && d.textContent.includes('Accept nearby deliveries'));
    if (riderOption) riderOption.click();
  });
  await new Promise((r) => setTimeout(r, 300));

  // Submit login
  await page.evaluate(() => {
    const submitBtn = document.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.click();
  });

  await new Promise((r) => setTimeout(r, 2500));

  // Go to Nearby Pickups
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const nearby = btns.find((b) => b.textContent && b.textContent.includes('Nearby Pickups'));
    if (nearby) nearby.click();
  });

  await new Promise((r) => setTimeout(r, 1500));
  await page.screenshot({ path: 'shots/real-rider-nearby.png' });
  console.log('Saved shots/real-rider-nearby.png');

  await browser.close();
}

checkReal().catch(console.error);
