import { chromium } from 'playwright';
import fs from 'node:fs';

const edgePath = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const baseUrl = 'http://127.0.0.1:4175';
const browser = await chromium.launch({ headless: true, executablePath: edgePath });
const context = await browser.newContext({ viewport: { width: 1600, height: 960 } });
const page = await context.newPage();
const results = [];
let step = 'boot';

function push(name, ok, detail = '') {
  results.push({ name, ok, detail });
}

try {
  step = 'open display';
  await page.goto(`${baseUrl}/display.html`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  const firstState = await page.evaluate(() => ({
    title: document.querySelector('.display-title-wrap h1')?.textContent?.trim() || '',
    totalCount: document.querySelectorAll('#totalBoard .display-rank-item').length,
    firstName: document.querySelector('#totalBoard .display-rank-item h3')?.textContent?.trim() || '',
    firstCampus: document.querySelector('#totalBoard .display-rank-item .display-rank-campus')?.textContent?.trim() || '',
    campusDisplay: document.querySelector('#totalBoard .display-rank-item .display-rank-campus') ? window.getComputedStyle(document.querySelector('#totalBoard .display-rank-item .display-rank-campus')).display : '',
    clock: document.getElementById('displayClock')?.textContent?.trim() || ''
  }));
  push('打开大屏页', firstState.totalCount > 0 && firstState.title === '学生成长荣耀榜', JSON.stringify(firstState));
  push('校区在名字下方显示', Boolean(firstState.firstCampus) && firstState.campusDisplay !== 'none', `${firstState.firstName} / ${firstState.firstCampus}`);

  step = 'auto rotate';
  await page.waitForTimeout(8500);
  const rotatedName = await page.locator('#totalBoard .display-rank-item h3').first().textContent();
  push('大屏自动轮播', (rotatedName || '').trim() !== firstState.firstName, `${firstState.firstName} -> ${(rotatedName || '').trim()}`);

  step = 'return home';
  await page.click('a.inline-link.light-link');
  await page.waitForFunction(() => /index\.html$/.test(window.location.pathname), { timeout: 15000 });
  push('返回首页', true, page.url());

  await page.screenshot({ path: 'display-ui-check.png', fullPage: true });
} catch (error) {
  push('fatal', false, `${step}: ${error.message}`);
}

await browser.close();
fs.writeFileSync('display-ui-check.json', JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
