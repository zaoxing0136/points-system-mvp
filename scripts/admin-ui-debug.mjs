import { chromium } from 'playwright';
import { spawn, spawnSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const edgePath = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const baseUrl = 'http://127.0.0.1:4175';
const cwd = process.cwd();
let devServer = null;

async function waitForServer(url, timeoutMs = 40000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch (_error) {
    }
    await delay(500);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function startDevServer() {
  devServer = spawn('cmd.exe', ['/c', 'npm.cmd run dev -- --host 127.0.0.1 --port 4175'], {
    cwd,
    stdio: 'ignore'
  });
  await waitForServer(`${baseUrl}/login.html`);
}

function stopDevServer() {
  if (!devServer?.pid) {
    return;
  }
  spawnSync('taskkill', ['/pid', String(devServer.pid), '/t', '/f'], { stdio: 'ignore' });
}

const browser = await chromium.launch({ headless: true, executablePath: edgePath });
const context = await browser.newContext({ viewport: { width: 1500, height: 980 } });
const page = await context.newPage();
const network = [];
page.on('request', (request) => {
  if (request.url().includes('/api/admin/teacher-accounts')) {
    network.push({ type: 'request', method: request.method(), url: request.url(), postData: request.postData() });
  }
});
page.on('response', async (response) => {
  if (response.url().includes('/api/admin/teacher-accounts')) {
    network.push({ type: 'response', status: response.status(), url: response.url(), body: await response.text().catch(() => '') });
  }
});

try {
  const suffix = Date.now().toString().slice(-6);
  const loginName = `dbg${suffix}`;
  const displayName = `调试账号${suffix}`;

  await startDevServer();
  await page.goto(`${baseUrl}/login.html`, { waitUntil: 'networkidle' });
  await page.fill('#loginAccountInput', 'admin');
  await page.fill('#loginPasswordInput', 'Admin123456');
  await page.click('#loginSubmitButton');
  await page.waitForFunction(() => /index\.html$|admin\.html$/.test(window.location.pathname), { timeout: 20000 });
  await page.goto(`${baseUrl}/admin.html`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#teacherAccountForm', { timeout: 20000 });

  await page.fill('#accountDisplayNameInput', displayName);
  await page.fill('#accountLoginNameInput', loginName);
  await page.fill('#accountPasswordInput', 'UiQa123456');
  await page.selectOption('#accountMustChangePasswordSelect', 'true');
  await page.selectOption('#accountActiveSelect', 'true');

  const responsePromise = page.waitForResponse((response) => response.url().includes('/api/admin/teacher-accounts'), { timeout: 15000 }).catch(() => null);
  await page.click('#teacherAccountSaveButton');
  const response = await responsePromise;
  await page.waitForTimeout(3000);

  console.log(JSON.stringify({
    responseSeen: Boolean(response),
    responseStatus: response ? response.status() : null,
    notice: await page.locator('#adminNotice').textContent().catch(() => ''),
    network
  }, null, 2));
} finally {
  await browser.close();
  stopDevServer();
}
