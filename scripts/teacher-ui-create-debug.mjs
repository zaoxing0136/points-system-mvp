import { chromium } from 'playwright';
const edgePath = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const browser = await chromium.launch({ headless: true, executablePath: edgePath });
const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
const page = await context.newPage();
const messages = [];
page.on('console', (msg) => messages.push({ type: 'console', text: msg.text() }));
page.on('pageerror', (error) => messages.push({ type: 'pageerror', text: error.message }));
await page.goto('http://127.0.0.1:4175/login.html', { waitUntil: 'networkidle' });
if (!/teacher\.html/.test(page.url())) {
  await page.fill('#loginAccountInput', 'cls');
  await page.fill('#loginPasswordInput', '666666');
  await page.click('#loginSubmitButton');
  await page.waitForFunction(() => /teacher\.html$/.test(window.location.pathname), { timeout: 15000 });
}
await page.waitForFunction(() => document.getElementById('classSelect')?.options.length > 0, { timeout: 20000 });
await page.waitForTimeout(1200);
await page.click('#openCreateClassButton');
await page.waitForFunction(() => document.getElementById('createClassDialog')?.open, { timeout: 5000 });
const className = `调试建班-${Date.now()}`;
await page.fill('#createClassNameInput', className);
await page.selectOption('#createClassCampusSelect', { index: 0 });
await page.selectOption('#createClassSubjectSelect', { index: 0 });
await page.fill('#createClassScheduleInput', '周四 18:00-19:00');
await page.click('#createClassForm button[type="submit"]');
await page.waitForTimeout(3000);
const debug = await page.evaluate(() => ({
  dialogOpen: document.getElementById('createClassDialog')?.open,
  inlineNotice: document.getElementById('teacherInlineNotice')?.textContent?.trim() || '',
  toast: document.getElementById('toast')?.hidden ? '' : document.getElementById('toast')?.textContent?.trim() || '',
  classOptions: Array.from(document.getElementById('classSelect')?.options || []).map((option) => option.textContent?.trim() || ''),
  currentClassValue: document.getElementById('classSelect')?.value || '',
  submitDisabled: document.querySelector('#createClassForm button[type="submit"]')?.disabled || false
}));
console.log(JSON.stringify({ className, debug, messages }, null, 2));
await browser.close();
