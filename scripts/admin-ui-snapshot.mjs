import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.argv[2] || 'http://127.0.0.1:4173';
const outputPath = process.argv[3] || 'artifacts/admin-account-ui.png';
const adminPassword = process.env.ADMIN_UI_PASSWORD || 'Admin123456';

async function ensureDir(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1500, height: 1200 } });

try {
  await ensureDir(outputPath);
  await page.goto(`${baseUrl}/login.html`, { waitUntil: 'networkidle' });

  if (/login\.html/.test(page.url())) {
    await page.fill('#loginAccountInput', 'admin');
    await page.fill('#loginPasswordInput', adminPassword);
    await page.click('#loginSubmitButton');
    await page.waitForLoadState('networkidle');
  }

  const changePasswordVisible = await page.locator('#changePasswordCard').evaluate((node) => !node.hidden).catch(() => false);
  if (changePasswordVisible) {
    await page.fill('#newPasswordInput', adminPassword);
    await page.fill('#confirmPasswordInput', adminPassword);
    await page.click('#changePasswordButton');
    await page.waitForLoadState('networkidle');
  }

  if (/index\.html/.test(page.url())) {
    await page.goto(`${baseUrl}/admin.html`, { waitUntil: 'networkidle' });
  }

  await page.waitForSelector('#teacherAccountForm', { timeout: 20000 });
  await page.fill('#accountDisplayNameInput', '陈老师');
  await page.fill('#accountLoginNameInput', 'chenls');
  await page.fill('#accountPasswordInput', '666666');
  await page.selectOption('#accountMustChangePasswordSelect', 'true');
  await page.selectOption('#accountActiveSelect', 'true');

  const panel = page.locator('.admin-account-layout--stacked');
  await panel.screenshot({ path: outputPath });
  console.log(path.resolve(outputPath));
} finally {
  await browser.close();
}
