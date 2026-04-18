import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawn, spawnSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

const cwd = process.cwd();
const baseUrl = 'http://127.0.0.1:4175';
const edgePath = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const artifactDir = path.join(cwd, 'artifacts', 'rollout-readiness');
const ENV_FILES = ['.env.local', '.env'];
const OFFICIAL_CAMPUSES = ['东新', '城北', '江湾', '三墩', '观成', '文三', '解放路'];
const LEGACY_CAMPUSES = ['光华', '星海', '橙湾', '星河', '海棠'];
const cleanupState = {
  classNames: new Set(),
  classIds: new Set(),
  studentIds: new Set()
};
const results = [];
let devServer = null;

fs.mkdirSync(artifactDir, { recursive: true });

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
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith('\'') && value.endsWith('\''))) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = value;
      }
    });
  });
}

function createServiceClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: retryingFetch }
  });
}

function shouldRetryNetworkError(error) {
  const message = String(error?.message || error || '');
  const causeCode = error?.cause?.code || error?.code || '';
  return /fetch failed/i.test(message) || causeCode === 'UND_ERR_CONNECT_TIMEOUT';
}

async function retryingFetch(resource, options) {
  let lastError = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await fetch(resource, options);
    } catch (error) {
      lastError = error;
      if (!shouldRetryNetworkError(error) || attempt === 2) {
        break;
      }
      await delay(1200 * (attempt + 1));
    }
  }
  throw lastError;
}

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
  const stdoutPath = path.join(artifactDir, 'vite.stdout.log');
  const stderrPath = path.join(artifactDir, 'vite.stderr.log');
  const stdout = fs.createWriteStream(stdoutPath, { flags: 'w' });
  const stderr = fs.createWriteStream(stderrPath, { flags: 'w' });

  devServer = spawn('cmd.exe', ['/c', 'npm.cmd run dev -- --host 127.0.0.1 --port 4175'], {
    cwd,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  devServer.stdout.pipe(stdout);
  devServer.stderr.pipe(stderr);

  await waitForServer(`${baseUrl}/login.html`);
}

function stopDevServer() {
  if (!devServer?.pid) {
    return;
  }
  spawnSync('taskkill', ['/pid', String(devServer.pid), '/t', '/f'], { stdio: 'ignore' });
  devServer = null;
}

function normalizeCampusName(value) {
  return String(value || '').trim().replace(/校区$/u, '');
}

async function ensureAdminAccount(serviceClient) {
  let page = 1;
  const users = [];
  while (true) {
    const { data, error } = await serviceClient.auth.admin.listUsers({ page, perPage: 200 });
    if (error) {
      throw error;
    }

    const batch = data?.users || [];
    users.push(...batch);
    if (batch.length < 200) {
      break;
    }
    page += 1;
  }

  const adminUser = users.find(function (user) {
    return user.email === 'admin@accounts.points-mvp.local' || user.user_metadata?.login_name === 'admin';
  });
  if (!adminUser) {
    throw new Error('Admin auth user not found.');
  }

  const { error: authError } = await serviceClient.auth.admin.updateUserById(adminUser.id, {
    password: 'Admin123456',
    email_confirm: true,
    user_metadata: {
      ...(adminUser.user_metadata || {}),
      login_name: 'admin',
      display_name: '系统管理员',
      role: 'admin'
    }
  });
  if (authError) {
    throw authError;
  }

  const { error: profileError } = await serviceClient
    .from('user_profiles')
    .update({
      display_name: '系统管理员',
      phone: '13900009999',
      is_active: true,
      must_change_password: false
    })
    .eq('id', adminUser.id);
  if (profileError) {
    throw profileError;
  }
}

async function prepareDisposableData(serviceClient) {
  const { data: campuses, error: campusError } = await serviceClient
    .from('campuses')
    .select('id, name, code, status')
    .eq('status', 'active')
    .order('created_at', { ascending: true });
  if (campusError) {
    throw campusError;
  }

  const actualCampus = (campuses || []).find(function (campus) {
    return ['东新', '江湾', '三墩'].includes(normalizeCampusName(campus.name));
  });
  if (!actualCampus) {
    throw new Error('No real official campus available for disposable data.');
  }

  const { data: subjects, error: subjectError } = await serviceClient
    .from('subjects')
    .select('id, name')
    .eq('status', 'active')
    .order('created_at', { ascending: true })
    .limit(1);
  if (subjectError) {
    throw subjectError;
  }
  if (!subjects?.length) {
    throw new Error('No active subject found.');
  }

  const { data: teachers, error: teacherError } = await serviceClient
    .from('teachers')
    .select('id, display_name, campus_id')
    .eq('status', 'active')
    .eq('campus_id', actualCampus.id)
    .limit(1);
  if (teacherError) {
    throw teacherError;
  }

  const timestamp = Date.now();
  const className = `Codex正式回归班${timestamp}`;
  const studentName = `回归学生${String(timestamp).slice(-6)}`;
  const studentCode = `RG${String(timestamp).slice(-10)}`;

  const { data: createdClass, error: classError } = await serviceClient
    .from('classes')
    .insert({
      class_name: className,
      campus_id: actualCampus.id,
      subject_id: subjects[0].id,
      teacher_id: teachers?.[0]?.id || null,
      schedule_text: '周三 19:00-20:00',
      class_type: 'regular',
      status: 'active'
    })
    .select('id, class_name, campus_id, subject_id, teacher_id')
    .single();
  if (classError) {
    throw classError;
  }
  cleanupState.classIds.add(createdClass.id);
  cleanupState.classNames.add(className);

  const { data: createdStudent, error: studentError } = await serviceClient
    .from('students')
    .insert({
      student_code: studentCode,
      legal_name: studentName,
      display_name: studentName,
      grade: '三年级',
      parent_name: '回归家长',
      parent_phone: `139${String(timestamp).slice(-8)}`,
      status: 'normal',
      notes: 'Codex rollout readiness check'
    })
    .select('id, display_name, student_code')
    .single();
  if (studentError) {
    throw studentError;
  }
  cleanupState.studentIds.add(createdStudent.id);

  const { error: classStudentError } = await serviceClient
    .from('class_students')
    .upsert({
      class_id: createdClass.id,
      student_id: createdStudent.id,
      joined_at: new Date().toISOString(),
      member_status: 'active',
      notes: 'Codex rollout readiness check'
    }, { onConflict: 'class_id,student_id' });
  if (classStudentError) {
    throw classStudentError;
  }

  return {
    actualCampus,
    actualCampusName: normalizeCampusName(actualCampus.name),
    actualCampusId: actualCampus.id,
    subjectId: subjects[0].id,
    teacherId: teachers?.[0]?.id || null,
    tempClassId: createdClass.id,
    tempClassName: className,
    tempStudentId: createdStudent.id,
    tempStudentName: studentName
  };
}

async function cleanupArtifacts(serviceClient) {
  const studentIds = Array.from(cleanupState.studentIds);
  const classIds = Array.from(cleanupState.classIds);
  const classNames = Array.from(cleanupState.classNames);

  if (classNames.length) {
    const { data: rows } = await serviceClient
      .from('classes')
      .select('id, class_name')
      .in('class_name', classNames);
    (rows || []).forEach(function (row) {
      classIds.push(row.id);
    });
  }

  const uniqueClassIds = Array.from(new Set(classIds.filter(Boolean)));
  const uniqueStudentIds = Array.from(new Set(studentIds.filter(Boolean)));

  if (uniqueStudentIds.length) {
    await serviceClient.from('student_badge_unlocks').delete().in('student_id', uniqueStudentIds);
    await serviceClient.from('student_badge_events').delete().in('student_id', uniqueStudentIds);
    await serviceClient.from('point_ledger').delete().in('student_id', uniqueStudentIds);
    await serviceClient.from('class_students').delete().in('student_id', uniqueStudentIds);
    await serviceClient.from('students').delete().in('id', uniqueStudentIds);
  }

  if (uniqueClassIds.length) {
    await serviceClient.from('point_ledger').delete().in('class_id', uniqueClassIds);
    await serviceClient.from('class_students').delete().in('class_id', uniqueClassIds);
    await serviceClient.from('classes').delete().in('id', uniqueClassIds);
  }
}

async function loginAsAdmin(page) {
  await page.goto(`${baseUrl}/login.html`, { waitUntil: 'networkidle' });
  if (/login\.html$/.test(page.url())) {
    await page.fill('#loginAccountInput', 'admin');
    await page.fill('#loginPasswordInput', 'Admin123456');
    await page.click('#loginSubmitButton');
    await page.waitForFunction(function () {
      return /index\.html$/.test(window.location.pathname) || /teacher\.html$/.test(window.location.pathname);
    }, { timeout: 20000 });
  }
}

async function waitForTeacherPage(page) {
  await page.goto(`${baseUrl}/teacher.html`, { waitUntil: 'networkidle' });
  await page.waitForFunction(function () {
    const campusSelect = document.getElementById('campusSelect');
    const classSelect = document.getElementById('classSelect');
    return Boolean(campusSelect && classSelect && campusSelect.options.length > 0 && classSelect.options.length > 0);
  }, { timeout: 20000 });
  await page.waitForTimeout(1200);
}

async function getSelectTexts(page, selector) {
  return page.locator(`${selector} option`).allTextContents();
}

async function run() {
  loadEnvFiles();
  const serviceClient = createServiceClient();
  const prepared = await prepareDisposableData(serviceClient);
  let browser;

  try {
    await ensureAdminAccount(serviceClient);
    await startDevServer();

    browser = await chromium.launch({ headless: true, executablePath: edgePath });
    const context = await browser.newContext({ viewport: { width: 1500, height: 980 } });
    const page = await context.newPage();

    page.on('dialog', async function (dialog) {
      await dialog.accept();
    });

    await loginAsAdmin(page);
    push('管理员登录', true, page.url());

    await page.goto(`${baseUrl}/admin.html`, { waitUntil: 'networkidle' });
    await page.waitForFunction(function () {
      const ruleInputs = Array.from(document.querySelectorAll('[data-rule-name]')).map(function (input) {
        return input.value;
      });
      const badgeNameInputs = Array.from(document.querySelectorAll('[data-badge-name]')).map(function (input) {
        return input.value;
      });
      const badgeEventInputs = Array.from(document.querySelectorAll('[data-badge-event]')).map(function (input) {
        return input.value;
      });
      return ruleInputs.includes('准时到课')
        && ruleInputs.includes('课上提醒')
        && ruleInputs.includes('影响秩序')
        && badgeNameInputs.includes('坚持星')
        && badgeEventInputs.includes('准时到课');
    }, { timeout: 20000 });
    const adminRuleNames = await page.locator('[data-rule-name]').evaluateAll(function (nodes) {
      return nodes.map(function (node) { return node.value; });
    });
    const adminBadgeNames = await page.locator('[data-badge-name]').evaluateAll(function (nodes) {
      return nodes.map(function (node) { return node.value; });
    });
    const adminBadgeEvents = await page.locator('[data-badge-event]').evaluateAll(function (nodes) {
      return nodes.map(function (node) { return node.value; });
    });
    push(
      '后台规则口径',
      adminRuleNames.includes('准时到课')
        && adminRuleNames.includes('课上提醒')
        && adminRuleNames.includes('影响秩序')
        && adminBadgeNames.includes('坚持星')
        && adminBadgeEvents.includes('准时到课'),
      `${adminRuleNames.filter(function (name) { return ['准时到课', '课上提醒', '影响秩序'].includes(name); }).join(' / ')} | ${adminBadgeNames.filter(function (name) { return name === '坚持星'; }).join(' / ')}`
    );

    await page.goto(`${baseUrl}/classes.html`, { waitUntil: 'networkidle' });
    await page.waitForFunction(function () {
      return document.querySelectorAll('#classesCampusFilter option').length > 0;
    }, { timeout: 20000 });
    const classCampusOptions = await getSelectTexts(page, '#classesCampusFilter');
    const classCampusOk = OFFICIAL_CAMPUSES.every(function (campusName) {
      return classCampusOptions.some(function (label) {
        return label.includes(campusName);
      });
    }) && LEGACY_CAMPUSES.every(function (legacyName) {
      return classCampusOptions.every(function (label) {
        return !label.includes(legacyName);
      });
    });
    push('班级页校区收口', classCampusOk, classCampusOptions.join(' | '));

    await page.goto(`${baseUrl}/students.html`, { waitUntil: 'networkidle' });
    await page.waitForFunction(function () {
      return Boolean(document.getElementById('studentTotalCount')) && Boolean(document.getElementById('studentsTableBody'));
    }, { timeout: 20000 });
    push('学生页可用', true, await page.locator('h1').textContent());

    await waitForTeacherPage(page);
    const teacherCampusOptions = await getSelectTexts(page, '#campusSelect');
    const teacherCampusOk = OFFICIAL_CAMPUSES.every(function (campusName) {
      return teacherCampusOptions.some(function (label) {
        return label.includes(campusName);
      });
    }) && LEGACY_CAMPUSES.every(function (legacyName) {
      return teacherCampusOptions.every(function (label) {
        return !label.includes(legacyName);
      });
    });
    push('老师页校区收口', teacherCampusOk, teacherCampusOptions.join(' | '));

    if (await page.locator('#teacherFocusToggleButton').isVisible().catch(function () { return false; })) {
      const toggleText = (await page.locator('#teacherFocusToggleButton').textContent()) || '';
      if (toggleText.includes('切换班级/校区')) {
        await page.click('#teacherFocusToggleButton');
        await page.waitForTimeout(500);
      }
    }

    await page.locator('#campusRail [data-campus-id]', { hasText: prepared.actualCampusName }).first().click();
    await page.waitForTimeout(1200);
    await page.locator('#classRail [data-class-id]', { hasText: prepared.tempClassName }).first().click();
    await page.waitForTimeout(1200);
    await page.locator('#studentGrid [data-student-id]').first().click();
    await page.waitForTimeout(1200);
    push('老师页进入回归班', true, prepared.tempClassName);

    const classroomText = await page.locator('#actionCards').textContent();
    push('课堂包含准时到课', Boolean(classroomText?.includes('准时到课')), classroomText?.slice(0, 120) || '');

    await page.locator('#categoryTabs [data-category="habits"]').click();
    await page.waitForTimeout(400);
    const habitText = await page.locator('#actionCards').textContent();
    push('习惯区移除准时到课', !habitText?.includes('准时到课'), habitText?.slice(0, 120) || '');

    await page.locator('#categoryTabs [data-category="classroom"]').click();
    await page.waitForTimeout(400);
    const deductionText = await page.locator('#deductionCards').textContent();
    push(
      '减分规则展示',
      ['课上提醒', '影响秩序', '未按要求完成', '需要再次提醒'].every(function (label) {
        return deductionText?.includes(label);
      }),
      deductionText || ''
    );

    const totalBefore = Number((await page.locator('#studentSpotlight .student-score-card strong').textContent()) || '0');
    await page.locator('#deductionCards [data-rule-id]').first().click();
    await page.waitForFunction(function (expectedTotal) {
      const totalNode = document.querySelector('#studentSpotlight .student-score-card strong');
      return Number(totalNode?.textContent || 0) === expectedTotal;
    }, totalBefore - 1, { timeout: 15000 });
    const ledgerAfterDeduct = await page.locator('#studentRecordList').textContent();
    push('减分写入成功', ledgerAfterDeduct?.includes('课上提醒') && ledgerAfterDeduct?.includes('-1'), ledgerAfterDeduct?.slice(0, 120) || '');

    const punctualBadgeCard = page.locator('#badgeActionCards .teacher-badge-action-card', { hasText: '坚持星' }).first();
    const badgeBefore = await punctualBadgeCard.textContent();
    await page.locator('#actionCards [data-rule-id]', { hasText: '准时到课' }).first().click();
    await page.waitForTimeout(1600);
    const badgeAfter = await punctualBadgeCard.textContent();
    push(
      '坚持星改绑准时到课',
      Boolean(badgeBefore?.includes('坚持星'))
        && Boolean(badgeAfter?.includes('坚持星'))
        && Boolean(badgeAfter?.includes('准时到课'))
        && /累计\s*1\s*\/\s*\d+/u.test(badgeAfter || ''),
      badgeAfter || ''
    );

    const editableClassName = `Codex编辑班${Date.now()}`;
    cleanupState.classNames.add(editableClassName);
    await page.click('#openCreateClassButton');
    await page.waitForFunction(function () {
      return document.getElementById('createClassDialog')?.open === true;
    }, { timeout: 10000 });
    await page.fill('#createClassNameInput', editableClassName);
    await page.selectOption('#createClassCampusSelect', prepared.actualCampusId);
    await page.selectOption('#createClassSubjectSelect', prepared.subjectId);
    await page.fill('#createClassScheduleInput', '周四 18:30-20:00');
    await page.click('#createClassSubmitButton');
    await page.waitForFunction(function () {
      return document.getElementById('createClassDialog')?.open === false;
    }, { timeout: 15000 });
    await page.waitForTimeout(1200);
    const classOptionsAfterCreate = await page.locator('#classSelect').textContent();
    push('新建班级成功', classOptionsAfterCreate?.includes(editableClassName), editableClassName);

    const editedClassName = `${editableClassName}-已编辑`;
    cleanupState.classNames.add(editedClassName);
    await page.click('#editClassButton');
    await page.waitForFunction(function () {
      return document.getElementById('createClassDialog')?.open === true;
    }, { timeout: 10000 });
    await page.fill('#createClassNameInput', editedClassName);
    await page.fill('#createClassScheduleInput', '周五 18:30-20:30');
    await page.click('#createClassSubmitButton');
    await page.waitForFunction(function () {
      return document.getElementById('createClassDialog')?.open === false;
    }, { timeout: 15000 });
    await page.waitForTimeout(1200);
    const classMetaText = await page.locator('#classMeta').textContent();
    push('编辑班级成功', classMetaText?.includes('周五 18:30-20:30') && classMetaText?.includes(editedClassName), classMetaText || '');

    await page.click('#archiveClassButton');
    await page.waitForTimeout(1500);
    const classOptionsAfterArchive = await page.locator('#classSelect').textContent();
    push('归档班级成功', !classOptionsAfterArchive?.includes(editedClassName), classOptionsAfterArchive || '');

    const deletableClassName = `Codex删除班${Date.now()}`;
    cleanupState.classNames.add(deletableClassName);
    await page.click('#openCreateClassButton');
    await page.waitForFunction(function () {
      return document.getElementById('createClassDialog')?.open === true;
    }, { timeout: 10000 });
    await page.fill('#createClassNameInput', deletableClassName);
    await page.selectOption('#createClassCampusSelect', prepared.actualCampusId);
    await page.selectOption('#createClassSubjectSelect', prepared.subjectId);
    await page.fill('#createClassScheduleInput', '周六 09:00-10:30');
    await page.click('#createClassSubmitButton');
    await page.waitForFunction(function () {
      return document.getElementById('createClassDialog')?.open === false;
    }, { timeout: 15000 });
    await page.waitForTimeout(1200);
    await page.click('#deleteClassButton');
    await page.waitForTimeout(1500);
    const classOptionsAfterDelete = await page.locator('#classSelect').textContent();
    push('删除空班成功', !classOptionsAfterDelete?.includes(deletableClassName), classOptionsAfterDelete || '');

    await page.goto(`${baseUrl}/display.html`, { waitUntil: 'networkidle' });
    await page.waitForFunction(function () {
      return document.querySelectorAll('#totalBoard .display-rank-item, #totalBoard .rank-item').length > 0;
    }, { timeout: 20000 });
    const displayCount = await page.locator('#totalBoard .display-rank-item, #totalBoard .rank-item').count();
    push('大屏榜单可见', displayCount > 0, `rows=${displayCount}`);

    await page.screenshot({ path: path.join(artifactDir, 'rollout-readiness.png'), fullPage: true });
  } catch (error) {
    push('fatal', false, error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
    try {
      await cleanupArtifacts(serviceClient);
    } catch (error) {
      push('cleanup', false, error.message);
    }
    stopDevServer();
    fs.writeFileSync(path.join(artifactDir, 'results.json'), JSON.stringify(results, null, 2));
    console.log(JSON.stringify(results, null, 2));
  }
}

await run();
