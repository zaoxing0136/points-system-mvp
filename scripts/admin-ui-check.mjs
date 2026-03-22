import { chromium } from 'playwright';
import fs from 'node:fs';

const edgePath = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const baseUrl = 'http://127.0.0.1:4175';
const browser = await chromium.launch({ headless: true, executablePath: edgePath });
const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
const page = await context.newPage();
const results = [];

function push(name, ok, detail = '') {
  results.push({ name, ok, detail });
}

try {
  await page.goto(`${baseUrl}/login.html`, { waitUntil: 'networkidle' });
  if (!/admin\.html/.test(page.url())) {
    await page.fill('#loginAccountInput', 'admin');
    await page.fill('#loginPasswordInput', 'Admin123456');
    await page.click('#loginSubmitButton');
    await page.waitForFunction(() => /index\.html$|admin\.html$/.test(window.location.pathname), { timeout: 20000 });
  }

  if (/index\.html/.test(page.url())) {
    await page.goto(`${baseUrl}/admin.html`, { waitUntil: 'networkidle' });
  }

  await page.waitForSelector('#teacherAccountForm', { timeout: 20000 });
  push('admin login', true, page.url());

  await page.click('#resetConfigButton');
  await page.waitForFunction(() => {
    const notice = document.getElementById('adminNotice');
    return Boolean(notice && !notice.hidden && /默认值|恢复|试运行/.test(notice.textContent || ''));
  }, { timeout: 20000 });
  const restoreNotice = await page.locator('#adminNotice').textContent().catch(() => '');
  push('restore trial defaults', /默认值|恢复|试运行/.test(restoreNotice || ''), restoreNotice || '');

  const firstTier = await page.locator('[data-tier-threshold="1"]').inputValue();
  const lastTier = await page.locator('[data-tier-threshold="9"]').inputValue();
  const pointRuleCount = await page.locator('#buttonsTableBody tr').count();
  const badgeCount = await page.locator('#badgesTableBody tr').count();
  push('default tiers loaded', firstTier === '50' && lastTier === '10000', `${firstTier} -> ${lastTier}`);
  push('default point rules loaded', pointRuleCount >= 20, String(pointRuleCount));
  push('default badge rules loaded', badgeCount === 8, String(badgeCount));

  await page.waitForSelector('#teacherAccountsBody tr', { timeout: 20000 });
  const teacherOptions = await page.locator('#accountTeacherSelect option').evaluateAll((nodes) => nodes.map((node) => ({ value: node.value, text: node.textContent?.trim() || '' })));
  const selectable = teacherOptions.find((item) => item.value);
  if (!selectable) {
    throw new Error('没有可选老师');
  }

  await page.selectOption('#accountTeacherSelect', selectable.value);
  await page.waitForTimeout(800);
  const loginName = await page.locator('#accountLoginNameInput').inputValue();
  const phone = await page.locator('#accountPhoneInput').inputValue();
  const displayName = await page.locator('#accountDisplayNameInput').inputValue();
  push('teacher account prefill', Boolean(loginName && phone && displayName), `${loginName} / ${phone} / ${displayName}`);

  await page.click('#teacherAccountSaveButton');
  await page.waitForFunction(() => {
    const notice = document.getElementById('adminNotice');
    return Boolean(notice && !notice.hidden && /老师账号已保存|保存失败/.test(notice.textContent || ''));
  }, { timeout: 20000 });
  const noticeText = await page.locator('#adminNotice').textContent().catch(() => '');
  push('teacher account save', /老师账号已保存/.test(noticeText || ''), noticeText || '');

  const resetButton = page.locator('[data-account-reset]').first();
  if (await resetButton.count()) {
    await resetButton.click();
    await page.waitForFunction(() => {
      const notice = document.getElementById('adminNotice');
      return Boolean(notice && !notice.hidden && /重置/.test(notice.textContent || ''));
    }, { timeout: 20000 });
    const resetNotice = await page.locator('#adminNotice').textContent().catch(() => '');
    push('teacher password reset', /重置/.test(resetNotice || ''), resetNotice || '');
  } else {
    push('teacher password reset', false, '未找到重置按钮');
  }

  await page.screenshot({ path: 'admin-ui-check.png', fullPage: true });
} catch (error) {
  push('fatal', false, error.message);
}

await browser.close();
fs.writeFileSync('admin-ui-check.json', JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
