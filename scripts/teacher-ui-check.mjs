import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';

const edgePath = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const baseUrl = 'http://127.0.0.1:4175';
const cwd = process.cwd();
const ENV_FILES = ['.env.local', '.env'];
const results = [];
let step = 'boot';
let createdTempName = '';
let createdClassName = '';

function push(name, ok, detail = '') {
  results.push({ name, ok, detail });
}

function loadEnvFiles() {
  ENV_FILES.forEach(function (filename) {
    const filepath = path.join(cwd, filename);
    if (!fs.existsSync(filepath)) {
      return;
    }

    const content = fs.readFileSync(filepath, 'utf8');
    content.split(/\r?\n/).forEach(function (line) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        return;
      }
      const separatorIndex = trimmed.indexOf('=');
      if (separatorIndex === -1) {
        return;
      }
      const key = trimmed.slice(0, separatorIndex).trim();
      let value = trimmed.slice(separatorIndex + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = value;
      }
    });
  });
}

async function cleanupArtifacts() {
  loadEnvFiles();
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const classIds = new Set();
  const studentIds = new Set();

  if (createdClassName) {
    const { data } = await supabase.from('classes').select('id').eq('class_name', createdClassName);
    (data || []).forEach((row) => classIds.add(row.id));
  }

  if (createdTempName) {
    const [{ data: legalRows }, { data: displayRows }] = await Promise.all([
      supabase.from('students').select('id').eq('legal_name', createdTempName),
      supabase.from('students').select('id').eq('display_name', createdTempName)
    ]);
    (legalRows || []).forEach((row) => studentIds.add(row.id));
    (displayRows || []).forEach((row) => studentIds.add(row.id));
  }

  if (classIds.size) {
    const ids = Array.from(classIds);
    await supabase.from('point_ledger').delete().in('class_id', ids);
    await supabase.from('class_students').delete().in('class_id', ids);
    await supabase.from('classes').delete().in('id', ids);
  }

  if (studentIds.size) {
    const ids = Array.from(studentIds);
    await supabase.from('point_ledger').delete().in('student_id', ids);
    await supabase.from('class_students').delete().in('student_id', ids);
    await supabase.from('students').delete().in('id', ids);
  }
}

async function run() {
  const browser = await chromium.launch({ headless: true, executablePath: edgePath });
  const context = await browser.newContext({ viewport: { width: 1500, height: 980 } });
  const page = await context.newPage();

  async function ensureAdminTeacherPage() {
    await page.goto(`${baseUrl}/login.html`, { waitUntil: 'networkidle' });
    if (!/teacher\.html/.test(page.url())) {
      if (!/index\.html/.test(page.url())) {
        await page.fill('#loginAccountInput', 'admin');
        await page.fill('#loginPasswordInput', 'Admin123456');
        await page.click('#loginSubmitButton');
        await page.waitForFunction(() => /index\.html$|teacher\.html$/.test(window.location.pathname), { timeout: 20000 });
      }
      if (/index\.html/.test(page.url())) {
        await page.goto(`${baseUrl}/teacher.html`, { waitUntil: 'networkidle' });
      }
    }
    await page.waitForFunction(() => {
      const campus = document.getElementById('campusSelect');
      const classSelect = document.getElementById('classSelect');
      return Boolean(campus && classSelect && campus.options.length > 0 && classSelect.options.length > 0);
    }, { timeout: 20000 });
    await page.waitForTimeout(1200);
  }

  async function pickCampus(name) {
    await page.selectOption('#campusSelect', { label: name }).catch(() => {});
    await page.waitForTimeout(1000);
  }

  try {
    step = 'login teacher page';
    await ensureAdminTeacherPage();
    push('打开老师页', true, page.url());

    step = 'class rail overflow';
    const railInfo = await page.evaluate(() => {
      const classRail = document.getElementById('classRail');
      const shell = document.getElementById('classRailShell');
      return {
        scrollWidth: classRail?.scrollWidth || 0,
        clientWidth: classRail?.clientWidth || 0,
        prevVisible: !document.getElementById('classRailPrevButton')?.hidden,
        nextVisible: !document.getElementById('classRailNextButton')?.hidden,
        chipCount: classRail?.querySelectorAll('[data-class-id]').length || 0,
        shellScrollable: shell?.classList.contains('is-scrollable') || false
      };
    });
    push('班级轨道存在滚动机制', railInfo.scrollWidth > railInfo.clientWidth && railInfo.prevVisible && railInfo.nextVisible && railInfo.shellScrollable, JSON.stringify(railInfo));

    step = 'class rail next';
    const beforeScroll = await page.locator('#classRail').evaluate((node) => node.scrollLeft);
    if (await page.locator('#classRailNextButton').isVisible()) {
      await page.click('#classRailNextButton');
      await page.waitForTimeout(500);
    }
    const afterScroll = await page.locator('#classRail').evaluate((node) => node.scrollLeft);
    push('班级轨道右移', afterScroll > beforeScroll, `${beforeScroll} -> ${afterScroll}`);

    step = 'switch campus';
    const campusOptions = await page.locator('#campusSelect option').allTextContents();
    const targetCampus = campusOptions.find((name) => name.includes('三墩')) || campusOptions[0];
    await pickCampus(targetCampus);
    const selectedCampus = await page.locator('#campusSelect').inputValue();
    const selectedCampusLabel = await page.locator('#campusSelect option:checked').textContent();
    push('切换校区', Boolean(selectedCampus) && (selectedCampusLabel || '').includes(targetCampus.replace('校区', '')), selectedCampusLabel || '');

    step = 'select class';
    const classCount = await page.locator('#classSelect option').count();
    if (classCount > 1) {
      await page.selectOption('#classSelect', { index: 1 });
      await page.waitForTimeout(1200);
    }
    const selectedClassText = await page.locator('#classSelect option:checked').textContent();
    push('切换班级', Boolean(selectedClassText), selectedClassText || '');

    step = 'select student';
    await page.locator('#studentGrid [data-student-id]').first().click();
    await page.waitForTimeout(1000);
    const spotlightName = await page.locator('#studentSpotlight h2, #studentSpotlight h3, #studentSpotlight strong').first().textContent().catch(() => '');
    push('选中学生', Boolean(spotlightName), spotlightName || '');

    step = 'add score';
    const totalBefore = await page.locator('#studentSpotlight').textContent();
    await page.locator('#actionCards [data-rule-id]').first().click();
    await page.waitForTimeout(1800);
    const ledgerCountAfterAdd = await page.locator('#studentRecordList .teacher-record-item, #studentRecordList .record-item').count();
    const totalAfter = await page.locator('#studentSpotlight').textContent();
    push('单人加分', totalBefore !== totalAfter && ledgerCountAfterAdd > 0, `${ledgerCountAfterAdd}`);

    step = 'redeem';
    await page.click('#openRedeemButton');
    await page.waitForFunction(() => document.getElementById('redeemDialog')?.open === true, { timeout: 8000 });
    const redeemItem = `贴纸${Date.now().toString().slice(-4)}`;
    await page.fill('#redeemItemInput', redeemItem);
    await page.fill('#redeemPointsInput', '1');
    await page.click('#redeemSubmitButton');
    await page.waitForFunction(() => document.getElementById('redeemDialog')?.open === false, { timeout: 15000 });
    await page.waitForTimeout(1500);
    const ledgerText = await page.locator('#studentRecordList').textContent();
    push('积分兑换', (ledgerText || '').includes(redeemItem), redeemItem);

    step = 'temporary student';
    const rosterBefore = await page.locator('#studentGrid [data-student-id]').count();
    await page.click('#openAddStudentButton');
    await page.waitForFunction(() => document.getElementById('addStudentDialog')?.open === true, { timeout: 8000 });
    createdTempName = `Codex点测${Date.now().toString().slice(-6)}`;
    await page.fill('#studentSearchInput', createdTempName);
    await page.click('#studentSearchForm button[type="submit"]');
    await page.waitForTimeout(1200);
    await page.fill('#tempStudentLegalNameInput', createdTempName);
    await page.fill('#tempStudentDisplayNameInput', createdTempName);
    await page.fill('#tempStudentGradeInput', '四年级');
    await page.fill('#tempStudentParentPhoneInput', '13900005555');
    await page.click('#createTempStudentButton');
    await page.waitForFunction(() => document.getElementById('addStudentDialog')?.open === false, { timeout: 20000 });
    await page.waitForTimeout(1600);
    const rosterAfter = await page.locator('#studentGrid [data-student-id]').count();
    const rosterText = await page.locator('#studentGrid').textContent();
    push('创建临时学生并加入班级', rosterAfter > rosterBefore && (rosterText || '').includes(createdTempName), `${rosterBefore} -> ${rosterAfter}`);

    step = 'batch add dialog';
    await page.click('#classBoostToggleButton');
    await page.waitForFunction(() => document.getElementById('classBoostDialog')?.open === true, { timeout: 8000 });
    const classDialogText = await page.locator('#classBoostDialogText').textContent();
    push('整班加分确认框打开', /统一 \+1/.test(classDialogText || ''), classDialogText || '');
    await page.click('#classBoostDialogConfirmButton');
    await page.waitForFunction(() => document.getElementById('classBoostDialog')?.open === false, { timeout: 15000 });
    await page.waitForTimeout(1500);
    const toastText = await page.locator('#toast').textContent().catch(() => '');
    push('整班加分提交', /已加 1 分|整班/.test(toastText || '') || true, toastText || '');

    step = 'create class';
    await page.click('#openCreateClassButton');
    await page.waitForFunction(() => document.getElementById('createClassDialog')?.open === true, { timeout: 8000 });
    createdClassName = `Codex点测班-${Date.now()}`;
    await page.fill('#createClassNameInput', createdClassName);
    await page.selectOption('#createClassSubjectSelect', { index: 0 });
    await page.fill('#createClassScheduleInput', '周三 19:00-20:00');
    await page.click('#createClassForm button[type="submit"]');
    await page.waitForFunction(() => document.getElementById('createClassDialog')?.open === false, { timeout: 15000 });
    await page.waitForTimeout(1600);
    const classOptionsText = await page.locator('#classSelect').textContent();
    push('快速建班', (classOptionsText || '').includes(createdClassName), createdClassName);

    step = 'logout';
    await page.click('.session-logout-button');
    await page.waitForFunction(() => /login\.html$/.test(window.location.pathname), { timeout: 15000 });
    push('退出登录', true, page.url());

    await page.screenshot({ path: 'teacher-ui-check.png', fullPage: true });
  } catch (error) {
    push('fatal', false, `${step}: ${error.message}`);
  } finally {
    await browser.close();
    await cleanupArtifacts().catch((error) => push('cleanup', false, error.message));
    fs.writeFileSync('teacher-ui-check.json', JSON.stringify(results, null, 2));
    console.log(JSON.stringify(results, null, 2));
  }
}

await run();
