import { chromium } from 'playwright';
import fs from 'node:fs';
const edgePath = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const browser = await chromium.launch({ headless: true, executablePath: edgePath });
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
const result = { before: '', after: '', redirectedToLogin: false };
try {
  await page.goto('http://127.0.0.1:4175/login.html', { waitUntil: 'networkidle' });
  if (!/teacher\.html|index\.html/.test(page.url())) {
    await page.fill('#loginAccountInput', 'admin');
    await page.fill('#loginPasswordInput', 'Admin123456');
    await page.click('#loginSubmitButton');
    await page.waitForFunction(() => /index\.html$|teacher\.html$/.test(window.location.pathname), { timeout: 20000 });
  }
  if (/index\.html/.test(page.url())) {
    await page.goto('http://127.0.0.1:4175/teacher.html', { waitUntil: 'networkidle' });
  }
  await page.waitForSelector('.session-logout-button', { timeout: 20000 });
  result.before = page.url();
  await page.click('.session-logout-button');
  await page.waitForTimeout(2500);
  result.after = page.url();
  result.redirectedToLogin = /login\.html/.test(result.after);
  await page.screenshot({ path: 'logout-check.png', fullPage: true });
} catch (error) {
  result.error = error.message;
}
await browser.close();
fs.writeFileSync('logout-check.json', JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
