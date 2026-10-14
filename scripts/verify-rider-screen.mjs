import puppeteer from 'puppeteer-core';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://localhost:3000';

async function checkRider() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  await page.goto(BASE, { waitUntil: 'networkidle2' });

  // Clear localStorage to start fresh
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle2' });

  // Click Sign In
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find((b) => b.textContent && b.textContent.trim() === 'Sign In');
    if (btn) btn.click();
  });
  await new Promise((r) => setTimeout(r, 600));

  // Select Rider role (auto-populates rider@logipulse.com and password123)
  await page.evaluate(() => {
    const roleCards = Array.from(document.querySelectorAll('div'));
    const riderCard = roleCards.find((d) => d.textContent && d.textContent.startsWith('Rider') && d.textContent.includes('Accept nearby'));
    if (riderCard) riderCard.click();
  });
  await new Promise((r) => setTimeout(r, 600));

  // Submit login directly
  await page.evaluate(() => {
    const submitBtn = document.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.click();
  });

  await new Promise((r) => setTimeout(r, 3000));

  // Click Nearby Pickups tab
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const nearby = btns.find((b) => b.textContent && b.textContent.includes('Nearby Pickups'));
    if (nearby) nearby.click();
  });

  await new Promise((r) => setTimeout(r, 1500));
  await page.screenshot({ path: 'shots/real-rider-nearby-fresh.png' });
  console.log('Saved shots/real-rider-nearby-fresh.png');

  await browser.close();
}

checkRider().catch(console.error);
