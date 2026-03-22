import { chromium } from 'playwright';

const edgePath = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const browser = await chromium.launch({ headless: true, executablePath: edgePath });
const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
const page = await context.newPage();
await page.goto('http://127.0.0.1:4175/login.html', { waitUntil: 'networkidle' });
await page.fill('#loginAccountInput', 'cls');
await page.fill('#loginPasswordInput', '666666');
await page.click('#loginSubmitButton');
await page.waitForURL(/teacher\.html/, { timeout: 15000 });
await page.waitForTimeout(1500);
await page.evaluate(() => {
  window.__teacherDebug = { rawClicks: 0 };
  const btn = document.getElementById('openCreateClassButton');
  btn.addEventListener('click', () => { window.__teacherDebug.rawClicks += 1; });
});
await page.click('#openCreateClassButton');
await page.waitForTimeout(500);
const debug = await page.evaluate(() => ({
  rawClicks: window.__teacherDebug.rawClicks,
  dialogOpen: document.getElementById('createClassDialog').open,
  activeElementId: document.activeElement?.id || document.activeElement?.tagName || ''
}));
console.log(JSON.stringify(debug, null, 2));
await browser.close();
