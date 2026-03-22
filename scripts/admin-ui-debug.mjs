import { chromium } from 'playwright';
const edgePath = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const browser = await chromium.launch({ headless: true, executablePath: edgePath });
const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
const page = await context.newPage();
await page.addInitScript(() => {
  window.__adminErrors = [];
  window.addEventListener('error', (event) => {
    window.__adminErrors.push({
      type: 'error',
      message: event.message || '',
      stack: event.error?.stack || '',
      errorMessage: event.error?.message || ''
    });
  });
  window.addEventListener('unhandledrejection', (event) => {
    window.__adminErrors.push({
      type: 'unhandledrejection',
      reason: event.reason?.message || String(event.reason),
      stack: event.reason?.stack || ''
    });
  });
});
await page.goto('http://127.0.0.1:4175/login.html', { waitUntil: 'networkidle' });
if (!/admin\.html/.test(page.url())) {
  await page.fill('#loginAccountInput', 'admin');
  await page.fill('#loginPasswordInput', 'Admin123456');
  await page.click('#loginSubmitButton');
  await page.waitForFunction(() => /index\.html$|admin\.html$/.test(window.location.pathname), { timeout: 20000 });
}
if (/index\.html/.test(page.url())) {
  await page.goto('http://127.0.0.1:4175/admin.html', { waitUntil: 'networkidle' });
}
await page.waitForTimeout(3000);
const debug = await page.evaluate(() => ({
  errors: window.__adminErrors,
  readyState: document.readyState,
  hasSaveButton: !!document.getElementById('saveConfigButton'),
  hasTeacherForm: !!document.getElementById('teacherAccountForm')
}));
console.log(JSON.stringify(debug, null, 2));
await browser.close();
