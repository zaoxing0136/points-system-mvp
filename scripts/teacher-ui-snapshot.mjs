import { chromium } from 'playwright';

const edgePath = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const baseUrl = 'http://127.0.0.1:4175';
const localTeacherUrl = 'file:///E:/2026%E4%BB%B7%E5%80%BC%E5%88%9B%E9%80%A0%E8%80%85/03%E6%9C%88%E7%A7%AF%E5%88%86%E7%B3%BB%E7%BB%9FMVP/teacher.html';
const browser = await chromium.launch({ headless: true, executablePath: edgePath });
const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
const page = await context.newPage();

async function ensureAdminSession() {
  await page.goto(`${baseUrl}/login.html`, { waitUntil: 'networkidle' });
  if (/index\.html|teacher\.html|admin\.html/.test(page.url())) {
    return;
  }
  await page.fill('#loginAccountInput', 'admin');
  await page.fill('#loginPasswordInput', 'Admin123456');
  await page.click('#loginSubmitButton');
  await page.waitForFunction(() => /index\.html$|teacher\.html$|admin\.html$/.test(window.location.pathname), { timeout: 20000 });
}

await ensureAdminSession();
await page.goto(`${baseUrl}/teacher.html`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
const teacherSnapshot = await page.evaluate(() => ({
  headerTitle: document.querySelector('.teacher-header-title h1')?.textContent?.trim() || '',
  campusOptions: Array.from(document.querySelectorAll('#campusSelect option')).map((node) => ({ value: node.value, text: node.textContent })),
  classOptions: Array.from(document.querySelectorAll('#classSelect option')).map((node) => ({ value: node.value, text: node.textContent })),
  studentCount: document.querySelectorAll('#studentGrid [data-student-id]').length,
  selectedStateVisible: document.getElementById('selectedState') ? window.getComputedStyle(document.getElementById('selectedState')).display : '',
  notice: document.getElementById('teacherInlineNotice')?.textContent?.trim() || '',
  hasPanelContent: !document.getElementById('panelContent')?.hidden,
  panelEmptyHidden: document.getElementById('panelEmptyState')?.hidden,
  hasInlineBoostBar: Boolean(document.getElementById('classBoostConfirmBar')),
  classRail: {
    chipCount: document.querySelectorAll('#classRail [data-class-id]').length,
    scrollWidth: document.getElementById('classRail')?.scrollWidth || 0,
    clientWidth: document.getElementById('classRail')?.clientWidth || 0,
    prevVisible: !document.getElementById('classRailPrevButton')?.hidden,
    nextVisible: !document.getElementById('classRailNextButton')?.hidden
  },
  logoutLabel: document.querySelector('.session-logout-button')?.textContent?.trim() || ''
}));

await page.screenshot({ path: 'teacher-ui-rail-snapshot.png', fullPage: true });

await page.click('#openAddStudentButton');
await page.waitForFunction(() => document.getElementById('addStudentDialog')?.open === true, { timeout: 8000 });
const addStudentSnapshot = await page.evaluate(() => ({
  dialogTitle: document.querySelector('#addStudentDialog h2')?.textContent?.trim() || '',
  badge: document.querySelector('.teacher-temp-student-badge')?.textContent?.trim() || '',
  introTitle: document.querySelector('.teacher-temp-student-intro h3')?.textContent?.trim() || '',
  introCopy: document.querySelector('.teacher-temp-student-intro p')?.textContent?.trim() || '',
  pills: Array.from(document.querySelectorAll('.teacher-temp-student-pill')).map((node) => node.textContent?.trim() || ''),
  actionText: document.getElementById('createTempStudentButton')?.textContent?.trim() || '',
  dialogWidth: window.getComputedStyle(document.getElementById('addStudentDialog')).width,
  tempColumns: window.getComputedStyle(document.querySelector('.teacher-temp-student-box')).gridTemplateColumns,
  formColumns: window.getComputedStyle(document.querySelector('.teacher-temp-student-form-card .teacher-dialog-grid')).gridTemplateColumns
}));
await page.screenshot({ path: 'teacher-add-student-snapshot.png', fullPage: true });
await page.click('#closeAddStudentButton');
await page.waitForFunction(() => document.getElementById('addStudentDialog')?.open === false, { timeout: 8000 });

await page.click('#classBoostToggleButton');
await page.waitForTimeout(600);
const batchCheck = await page.evaluate(() => ({
  hasInlineBoostBar: Boolean(document.getElementById('classBoostConfirmBar')),
  dialogOpen: document.getElementById('classBoostDialog')?.hasAttribute('open') || false,
  dialogText: document.getElementById('classBoostDialogText')?.textContent?.trim() || ''
}));
await page.screenshot({ path: 'teacher-ui-snapshot.png', fullPage: true });

await page.goto(`${baseUrl}/display.html`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2200);
const displayBefore = await page.evaluate(() => ({
  totalItems: document.querySelectorAll('#totalBoard .display-rank-item').length,
  progressItems: document.querySelectorAll('#progressBoard .display-rank-item').length,
  badgeItems: document.querySelectorAll('#badgeBoard .display-rank-item').length,
  firstThreeNames: Array.from(document.querySelectorAll('#totalBoard .display-rank-item h3')).slice(0, 3).map((node) => node.textContent?.trim() || ''),
  firstThreeCampuses: Array.from(document.querySelectorAll('#totalBoard .display-rank-campus')).slice(0, 3).map((node) => ({
    text: node.textContent?.trim() || '',
    display: window.getComputedStyle(node).display
  })),
  avatarBox: document.querySelector('.display-rank-profile .avatar-badge.large') ? window.getComputedStyle(document.querySelector('.display-rank-profile .avatar-badge.large')).width : '',
  avatarIconSize: document.querySelector('.display-rank-profile .avatar-badge.large .avatar-badge__icon') ? window.getComputedStyle(document.querySelector('.display-rank-profile .avatar-badge.large .avatar-badge__icon')).fontSize : '',
  title: document.querySelector('.display-title-wrap h1')?.textContent?.trim() || '',
  homeLabel: document.querySelector('.inline-link.light-link')?.textContent?.trim() || ''
}));
await page.waitForTimeout(9000);
const displayAfter = await page.evaluate(() => ({
  firstName: document.querySelector('#totalBoard .display-rank-item h3')?.textContent?.trim() || '',
  clock: document.getElementById('displayClock')?.textContent?.trim() || ''
}));
await page.screenshot({ path: 'display-ui-snapshot.png', fullPage: true });
await page.click('a.inline-link.light-link');
await page.waitForFunction(() => /index\.html$/.test(window.location.pathname), { timeout: 15000 });
const displayReturnCheck = {
  url: page.url(),
  indexVisible: await page.locator('a[href="./teacher.html"]').isVisible().catch(() => false)
};

await ensureAdminSession();
await page.goto(localTeacherUrl, { waitUntil: 'load' });
await page.waitForTimeout(1200);
const fileModeSnapshot = await page.evaluate(() => ({
  noticeVisible: !document.getElementById('fileModeNotice')?.hidden,
  noticeText: document.getElementById('fileModeNotice')?.textContent || '',
  campusDisabled: document.getElementById('campusSelect')?.disabled,
  classDisabled: document.getElementById('classSelect')?.disabled,
  selectionHint: document.getElementById('selectionHint')?.textContent || ''
}));
await page.screenshot({ path: 'teacher-file-mode-snapshot.png', fullPage: true });

await ensureAdminSession();
await page.goto(`${baseUrl}/teacher.html`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);
await page.click('.session-logout-button');
await page.waitForFunction(() => /login\.html$/.test(window.location.pathname), { timeout: 15000 });
const logoutCheck = {
  url: page.url(),
  loginVisible: await page.locator('#loginSubmitButton').isVisible()
};

console.log(JSON.stringify({ teacherSnapshot, addStudentSnapshot, batchCheck, displayBefore, displayAfter, displayReturnCheck, fileModeSnapshot, logoutCheck }, null, 2));
await browser.close();


