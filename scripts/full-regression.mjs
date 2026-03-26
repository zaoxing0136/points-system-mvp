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
const artifactDir = path.join(cwd, 'artifacts', 'full-regression');
const results = [];
const cleanupState = {
  studentNames: [],
  classNames: [],
  userIds: [],
  teacherIds: []
};
const diagState = new Map();
let devServer = null;

fs.mkdirSync(artifactDir, { recursive: true });

function push(name, ok, detail = '') {
  results.push({ name, ok, detail });
}

function loadEnvFiles() {
  ['.env.local', '.env'].forEach(function (filename) {
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
      const index = trimmed.indexOf('=');
      if (index === -1) {
        return;
      }
      const key = trimmed.slice(0, index).trim();
      const value = trimmed.slice(index + 1).trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    });
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

async function waitForServer(url, timeoutMs = 30000) {
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
  if (process.env.EXTERNAL_DEV_SERVER === '1') {
    await waitForServer(`${baseUrl}/login.html`, 40000);
    return;
  }

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

  devServer.on('exit', function (code) {
    if (code && code !== 0) {
      push('开发服务器异常退出', false, `exit=${code}`);
    }
  });

  await waitForServer(`${baseUrl}/login.html`, 40000);
}

function stopDevServer() {
  if (!devServer?.pid) {
    return;
  }
  spawnSync('taskkill', ['/pid', String(devServer.pid), '/t', '/f'], { stdio: 'ignore' });
  devServer = null;
}

function buildAuthEmail(loginName) {
  return `${loginName}@accounts.points-mvp.local`;
}

async function listAllAuthUsers(serviceClient) {
  let page = 1;
  const users = [];
  while (true) {
    const { data, error } = await serviceClient.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) {
      throw error;
    }
    const batch = data?.users || [];
    users.push(...batch);
    if (batch.length < 1000) {
      break;
    }
    page += 1;
  }
  return users;
}

async function ensureAdminAccount(serviceClient) {
  const users = await listAllAuthUsers(serviceClient);
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

  return adminUser;
}

function buildStudentCode(seed) {
  return 'RG' + seed.replace(/[^0-9A-Z]/gi, '').toUpperCase().slice(-12).padEnd(12, '0');
}

async function createDisposableTeacherBundle(serviceClient, options) {
  const loginName = options.loginName;
  const email = buildAuthEmail(loginName);
  const { data: campuses, error: campusError } = await serviceClient.from('campuses').select('id, name').eq('status', 'active').order('created_at', { ascending: true }).limit(2);
  if (campusError) {
    throw campusError;
  }
  const { data: subjects, error: subjectError } = await serviceClient.from('subjects').select('id, name').eq('status', 'active').order('created_at', { ascending: true }).limit(1);
  if (subjectError) {
    throw subjectError;
  }
  if ((campuses || []).length < 2 || !(subjects || []).length) {
    throw new Error('Not enough seed campuses / subjects for disposable teacher bundle.');
  }

  const { data: teacherRow, error: teacherError } = await serviceClient.from('teachers').insert({
    name: options.displayName,
    display_name: options.displayName,
    phone: options.phone,
    campus_id: campuses[0].id,
    role: 'teacher',
    status: 'active'
  }).select('id').single();
  if (teacherError) {
    throw teacherError;
  }
  cleanupState.teacherIds.push(teacherRow.id);

  const { data, error } = await serviceClient.auth.admin.createUser({
    email,
    password: options.password,
    email_confirm: true,
    user_metadata: {
      display_name: options.displayName,
      role: 'teacher',
      login_name: loginName
    }
  });
  if (error) {
    throw error;
  }
  const userId = data.user?.id;
  if (!userId) {
    throw new Error('Disposable teacher auth user id is missing.');
  }
  cleanupState.userIds.push(userId);

  const { error: profileError } = await serviceClient.from('user_profiles').insert({
    id: userId,
    role: 'teacher',
    phone: options.phone,
    display_name: options.displayName,
    teacher_id: teacherRow.id,
    is_active: true,
    must_change_password: true
  });
  if (profileError) {
    throw profileError;
  }

  const classNames = [
    `${options.displayName}-??A`,
    `${options.displayName}-??B`
  ];
  cleanupState.classNames.push(...classNames);
  const { data: createdClasses, error: classError } = await serviceClient.from('classes').insert([
    {
      class_name: classNames[0],
      campus_id: campuses[0].id,
      subject_id: subjects[0].id,
      teacher_id: teacherRow.id,
      schedule_text: '?? 18:30-20:00',
      class_type: 'regular',
      status: 'active',
      created_by_id: teacherRow.id
    },
    {
      class_name: classNames[1],
      campus_id: campuses[1].id,
      subject_id: subjects[0].id,
      teacher_id: teacherRow.id,
      schedule_text: '?? 18:30-20:00',
      class_type: 'regular',
      status: 'active',
      created_by_id: teacherRow.id
    }
  ]).select('id, class_name');
  if (classError) {
    throw classError;
  }

  const studentNames = [
    `${options.displayName}???`,
    `${options.displayName}???`
  ];
  cleanupState.studentNames.push(...studentNames);
  const { data: createdStudents, error: studentError } = await serviceClient.from('students').insert([
    {
      student_code: buildStudentCode(`${loginName}A`),
      legal_name: studentNames[0],
      display_name: studentNames[0],
      grade: '???',
      parent_name: '?????',
      parent_phone: `137${options.phone.slice(-8)}` ,
      status: 'normal',
      created_by_role: 'admin',
      created_by_id: teacherRow.id,
      notes: '???????? A'
    },
    {
      student_code: buildStudentCode(`${loginName}B`),
      legal_name: studentNames[1],
      display_name: studentNames[1],
      grade: '???',
      parent_name: '?????',
      parent_phone: `136${options.phone.slice(-8)}` ,
      status: 'normal',
      created_by_role: 'admin',
      created_by_id: teacherRow.id,
      notes: '???????? B'
    }
  ]).select('id');
  if (studentError) {
    throw studentError;
  }

  const { error: relationError } = await serviceClient.from('class_students').insert([
    {
      class_id: createdClasses[0].id,
      student_id: createdStudents[0].id,
      joined_at: new Date().toISOString(),
      member_status: 'active',
      joined_by_id: teacherRow.id,
      notes: '?????? A'
    },
    {
      class_id: createdClasses[1].id,
      student_id: createdStudents[1].id,
      joined_at: new Date().toISOString(),
      member_status: 'active',
      joined_by_id: teacherRow.id,
      notes: '?????? B'
    }
  ]);
  if (relationError) {
    throw relationError;
  }

  return {
    userId,
    email,
    loginName,
    teacherId: teacherRow.id,
    seedClassNames: classNames,
    seedStudentNames: studentNames
  };
}

async function findStudentIds(serviceClient, names) {
  const uniqueNames = Array.from(new Set(names.filter(Boolean)));
  if (!uniqueNames.length) {
    return [];
  }
  const [{ data: legalRows, error: legalError }, { data: displayRows, error: displayError }] = await Promise.all([
    serviceClient.from('students').select('id').in('legal_name', uniqueNames),
    serviceClient.from('students').select('id').in('display_name', uniqueNames)
  ]);
  if (legalError) {
    throw legalError;
  }
  if (displayError) {
    throw displayError;
  }
  return Array.from(new Set([...(legalRows || []), ...(displayRows || [])].map(function (row) {
    return row.id;
  })));
}

async function findClassIds(serviceClient, names) {
  const uniqueNames = Array.from(new Set(names.filter(Boolean)));
  if (!uniqueNames.length) {
    return [];
  }
  const { data, error } = await serviceClient.from('classes').select('id').in('class_name', uniqueNames);
  if (error) {
    throw error;
  }
  return (data || []).map(function (row) { return row.id; });
}

async function trackUiTeacherCleanup(serviceClient, userId) {
  if (!userId) {
    return;
  }
  cleanupState.userIds.push(userId);
  const { data, error } = await serviceClient
    .from('user_profiles')
    .select('teacher_id')
    .eq('id', userId)
    .maybeSingle();
  if (!error && data?.teacher_id) {
    cleanupState.teacherIds.push(data.teacher_id);
  }
}

async function seedTeacherWorkspace(serviceClient, options) {
  if (!options?.userId) {
    throw new Error('teacher workspace seed missing user id');
  }

  const { data: profile, error: profileError } = await serviceClient
    .from('user_profiles')
    .select('teacher_id')
    .eq('id', options.userId)
    .maybeSingle();
  if (profileError) {
    throw profileError;
  }
  if (!profile?.teacher_id) {
    throw new Error('teacher workspace seed missing teacher_id');
  }

  const teacherId = profile.teacher_id;
  cleanupState.teacherIds.push(teacherId);

  const { data: campuses, error: campusError } = await serviceClient
    .from('campuses')
    .select('id')
    .eq('status', 'active')
    .order('created_at', { ascending: true })
    .limit(2);
  if (campusError) {
    throw campusError;
  }

  const { data: subjects, error: subjectError } = await serviceClient
    .from('subjects')
    .select('id')
    .eq('status', 'active')
    .order('created_at', { ascending: true })
    .limit(1);
  if (subjectError) {
    throw subjectError;
  }

  if ((campuses || []).length < 2 || !(subjects || []).length) {
    throw new Error('teacher workspace seed lacks campuses or subjects');
  }

  const classNames = [
    options.displayName + '-A',
    options.displayName + '-B'
  ];
  cleanupState.classNames.push(...classNames);
  const { data: createdClasses, error: classError } = await serviceClient.from('classes').insert([
    {
      class_name: classNames[0],
      campus_id: campuses[0].id,
      subject_id: subjects[0].id,
      teacher_id: teacherId,
      schedule_text: '周日 18:30-20:00',
      class_type: 'regular',
      status: 'active',
      created_by_id: teacherId
    },
    {
      class_name: classNames[1],
      campus_id: campuses[1].id,
      subject_id: subjects[0].id,
      teacher_id: teacherId,
      schedule_text: '周六 18:30-20:00',
      class_type: 'regular',
      status: 'active',
      created_by_id: teacherId
    }
  ]).select('id');
  if (classError) {
    throw classError;
  }

  const studentNames = [
    options.displayName + '学员甲',
    options.displayName + '学员乙'
  ];
  cleanupState.studentNames.push(...studentNames);
  const { data: createdStudents, error: studentError } = await serviceClient.from('students').insert([
    {
      student_code: buildStudentCode(options.loginName + 'A'),
      legal_name: studentNames[0],
      display_name: studentNames[0],
      grade: '四年级',
      parent_name: '回归家长甲',
      parent_phone: '137' + String(options.seed || '').padStart(8, '0').slice(-8),
      status: 'normal',
      created_by_role: 'admin',
      created_by_id: teacherId,
      notes: '老师端回归种子 A'
    },
    {
      student_code: buildStudentCode(options.loginName + 'B'),
      legal_name: studentNames[1],
      display_name: studentNames[1],
      grade: '四年级',
      parent_name: '回归家长乙',
      parent_phone: '136' + String(options.seed || '').padStart(8, '0').slice(-8),
      status: 'normal',
      created_by_role: 'admin',
      created_by_id: teacherId,
      notes: '老师端回归种子 B'
    }
  ]).select('id');
  if (studentError) {
    throw studentError;
  }

  const { error: relationError } = await serviceClient.from('class_students').insert([
    {
      class_id: createdClasses[0].id,
      student_id: createdStudents[0].id,
      joined_at: new Date().toISOString(),
      member_status: 'active',
      joined_by_id: teacherId,
      notes: '老师端回归种子 A'
    },
    {
      class_id: createdClasses[1].id,
      student_id: createdStudents[1].id,
      joined_at: new Date().toISOString(),
      member_status: 'active',
      joined_by_id: teacherId,
      notes: '老师端回归种子 B'
    }
  ]);
  if (relationError) {
    throw relationError;
  }

  return {
    teacherId,
    classNames,
    studentNames
  };
}
async function cleanupRemoteArtifacts(serviceClient) {
  const classIds = await findClassIds(serviceClient, cleanupState.classNames).catch(function () { return []; });
  const studentIds = await findStudentIds(serviceClient, cleanupState.studentNames).catch(function () { return []; });

  if (classIds.length) {
    await serviceClient.from('point_ledger').delete().in('class_id', classIds);
    await serviceClient.from('class_students').delete().in('class_id', classIds);
    await serviceClient.from('classes').delete().in('id', classIds);
  }

  if (studentIds.length) {
    await serviceClient.from('point_ledger').delete().in('student_id', studentIds);
    await serviceClient.from('class_students').delete().in('student_id', studentIds);
    await serviceClient.from('students').delete().in('id', studentIds);
  }

  const uniqueUserIds = Array.from(new Set(cleanupState.userIds.filter(Boolean)));
  for (const userId of uniqueUserIds) {
    await serviceClient.from('user_profiles').delete().eq('id', userId);
    await serviceClient.auth.admin.deleteUser(userId).catch(function () {});
  }

  const uniqueTeacherIds = Array.from(new Set(cleanupState.teacherIds.filter(Boolean)));
  for (const teacherId of uniqueTeacherIds) {
    const { data } = await serviceClient.from('classes').select('id').eq('teacher_id', teacherId).limit(1);
    if (!data?.length) {
      await serviceClient.from('teachers').delete().eq('id', teacherId);
    }
  }
}

function attachDiagnostics(page, label) {
  const bucket = [];
  diagState.set(label, bucket);
  page.on('pageerror', function (error) {
    bucket.push(error.message || String(error));
  });
  return bucket;
}

function assertNoPageErrors(label) {
  const bucket = diagState.get(label) || [];
  if (bucket.length) {
    throw new Error(`${label}: ${bucket.join(' | ')}`);
  }
}

async function waitForNotice(page, selector, pattern, timeout = 20000) {
  await page.waitForFunction(
    ([noticeSelector, source]) => {
      const node = document.querySelector(noticeSelector);
      return Boolean(node && !node.hidden && new RegExp(source).test(node.textContent || ''));
    },
    [selector, pattern.source],
    { timeout }
  );
}

async function waitForTeacherReady(page) {
  await page.waitForFunction(() => {
    const campus = document.getElementById('campusSelect');
    const classSelect = document.getElementById('classSelect');
    return Boolean(campus && classSelect && campus.options.length > 0 && classSelect.options.length > 0);
  }, { timeout: 20000 });
  await page.waitForTimeout(1200);
}

async function loginAs(page, loginName, password) {
  await page.goto(`${baseUrl}/login.html`, { waitUntil: 'networkidle' });
  await page.fill('#loginAccountInput', loginName);
  await page.fill('#loginPasswordInput', password);
  await page.click('#loginSubmitButton');
}

async function screenshot(page, filename) {
  await page.screenshot({ path: path.join(artifactDir, filename), fullPage: true });
}

async function createCsvFile(filename, rows) {
  const filepath = path.join(artifactDir, filename);
  fs.writeFileSync(filepath, rows, 'utf8');
  return filepath;
}

async function step(name, fn) {
  try {
    const detail = await fn();
    push(name, true, detail || '');
    return detail;
  } catch (error) {
    push(name, false, error.message || String(error));
    throw error;
  }
}

loadEnvFiles();
const serviceClient = createServiceClient();
let browser = null;

try {
  const adminUser = await ensureAdminAccount(serviceClient);
  push('管理员账号校准', true, adminUser.id);

  const disposableSuffix = Date.now().toString().slice(-6);
  const disposableTeacherNextPassword = `Reg${disposableSuffix}8`;

  await startDevServer();
  push('开发服务器启动', true, baseUrl);

  browser = await chromium.launch({
    headless: true,
    executablePath: fs.existsSync(edgePath) ? edgePath : undefined
  });

  const adminContext = await browser.newContext({ viewport: { width: 1480, height: 980 }, acceptDownloads: true });
  const adminPage = await adminContext.newPage();
  attachDiagnostics(adminPage, 'admin');

  const manualStudentLegal = `回归学生${disposableSuffix}`;
  const manualStudentDisplay = `小回归${disposableSuffix}`;
  const importStudentLegal = `导入学生${disposableSuffix}`;
  const importStudentDisplay = `导入昵称${disposableSuffix}`;
  const adminCreatedClass = `回归班级${disposableSuffix}`;
  const teacherCreatedClass = `老师快建${disposableSuffix}`;
  const uiTeacherDisplay = `回归账号${disposableSuffix}`;
  const uiTeacherLogin = `uqa${disposableSuffix}`;
  const redeemItem = `贴纸${disposableSuffix}`;
  const seedRemark = `历史补录${disposableSuffix}`;

  cleanupState.studentNames.push(manualStudentLegal, manualStudentDisplay, importStudentLegal, importStudentDisplay);
  cleanupState.classNames.push(adminCreatedClass, teacherCreatedClass);

  await step('login.html 加载', async function () {
    await adminPage.goto(`${baseUrl}/login.html`, { waitUntil: 'networkidle' });
    await adminPage.waitForSelector('#loginForm', { timeout: 20000 });
    await screenshot(adminPage, 'login-page.png');
    assertNoPageErrors('admin');
    return '登录页表单可见';
  });

  await step('管理员登录并跳转首页', async function () {
    await loginAs(adminPage, 'admin', 'Admin123456');
    await adminPage.waitForFunction(() => /index\.html$/.test(window.location.pathname), { timeout: 20000 });
    await adminPage.waitForFunction(() => {
      const heroCopy = document.querySelector('.hero-copy')?.textContent || '';
      const sessionChip = document.querySelector('.session-chip')?.textContent || '';
      return heroCopy.includes('系统管理员') && sessionChip.includes('系统管理员');
    }, { timeout: 20000 });
    await screenshot(adminPage, 'index-page.png');
    const heroCopy = await adminPage.locator('.hero-copy').textContent();
    if (!(heroCopy || '').includes('系统管理员')) {
      throw new Error(heroCopy || '首页未显示管理员名称');
    }
    assertNoPageErrors('admin');
    return adminPage.url();
  });

  await step('管理员可正常访问老师页', async function () {
    await adminPage.goto(`${baseUrl}/teacher.html`, { waitUntil: 'networkidle' });
    await waitForTeacherReady(adminPage);
    await screenshot(adminPage, 'teacher-admin-view.png');
    assertNoPageErrors('admin');
    return await adminPage.locator('#classSelect option').count();
  });

  await step('老师账号管理可创建与编辑入口正常', async function () {
    let adminAccountPhase = '打开管理页';
    try {
      await adminPage.goto(`${baseUrl}/admin.html`, { waitUntil: 'networkidle' });
      await adminPage.waitForSelector('#teacherAccountForm', { timeout: 20000 });
      adminAccountPhase = '填写并保存老师账号';
      await adminPage.fill('#accountDisplayNameInput', uiTeacherDisplay);
      await adminPage.fill('#accountLoginNameInput', uiTeacherLogin);
      await adminPage.fill('#accountPasswordInput', 'UiQa123456');
      await adminPage.selectOption('#accountMustChangePasswordSelect', 'true');
      await adminPage.selectOption('#accountActiveSelect', 'true');
      await adminPage.click('#teacherAccountSaveButton');

      adminAccountPhase = '等待保存成功提示';
      await waitForNotice(adminPage, '#adminNotice', /老师账号已创建|老师账号已更新/);

      adminAccountPhase = '等待账号行出现';
      const row = adminPage.locator(`#teacherAccountsBody tr:has-text("${uiTeacherDisplay}")`).first();
      await row.waitFor({ timeout: 20000 });
      const editButton = row.locator('[data-account-edit]').first();
      const resetButton = row.locator('[data-account-reset]').first();
      const createdUserId = await editButton.getAttribute('data-account-edit');

      adminAccountPhase = '准备老师工作区数据';
      await trackUiTeacherCleanup(serviceClient, createdUserId);
      await seedTeacherWorkspace(serviceClient, {
        userId: createdUserId,
        loginName: uiTeacherLogin,
        displayName: uiTeacherDisplay,
        seed: disposableSuffix
      });
      push('回归老师账号准备', true, uiTeacherLogin);

      adminAccountPhase = '验证编辑回填';
      await editButton.click();
      const prefills = await Promise.all([
        adminPage.locator('#accountDisplayNameInput').inputValue(),
        adminPage.locator('#accountLoginNameInput').inputValue()
      ]);
      if (prefills[0] !== uiTeacherDisplay || prefills[1] !== uiTeacherLogin) {
        throw new Error(`prefill mismatch: ${prefills.join(' / ')}`);
      }

      adminAccountPhase = '验证重置密码提示';
      await resetButton.click();
      await waitForNotice(adminPage, '#adminNotice', /重置为 666666|密码已重置/);
      await screenshot(adminPage, 'admin-page.png');
      assertNoPageErrors('admin');
      return createdUserId || '';
    } catch (error) {
      throw new Error(`${adminAccountPhase}: ${error.message}`);
    }
  });

  await step('学生管理支持搜索新增详情编辑与模板下载', async function () {
    let studentPhase = '打开学生页';
    try {
      await adminPage.goto(`${baseUrl}/students.html`, { waitUntil: 'networkidle' });
      await adminPage.waitForSelector('#studentsTableBody', { timeout: 20000 });

      studentPhase = '空搜索';
      await adminPage.fill('#studentsSearchInput', `不存在${disposableSuffix}`);
      await adminPage.click('#studentsSearchForm button[type="submit"]');
      await adminPage.waitForFunction(() => /没有找到符合条件的学生主档/.test(document.querySelector('#studentsTableBody')?.textContent || ''), { timeout: 20000 });
      await adminPage.click('#clearStudentsSearchButton');
      await adminPage.waitForTimeout(800);

      studentPhase = '打开新增学生弹窗';
      await adminPage.click('#openCreateStudentButton');
      await adminPage.waitForFunction(() => document.getElementById('createStudentDialog')?.open === true, { timeout: 10000 });
      await adminPage.fill('#createLegalNameInput', manualStudentLegal);
      await adminPage.fill('#createDisplayNameInput', manualStudentDisplay);
      await adminPage.fill('#createGradeInput', '四年级');
      await adminPage.fill('#createParentNameInput', '回归家长');
      await adminPage.fill('#createParentPhoneInput', `1380000${disposableSuffix.slice(-4)}`);
      await adminPage.fill('#createNotesInput', '全量回归手工新增');

      studentPhase = '提交新增学生';
      await adminPage.click('#submitCreateStudentButton');
      await adminPage.waitForFunction(() => document.getElementById('createStudentDialog')?.open === false, { timeout: 20000 });
      await waitForNotice(adminPage, '#studentsNotice', /学生主档已创建|学生主档已更新/);

      studentPhase = '搜索手工学生';
      await adminPage.fill('#studentsSearchInput', manualStudentLegal);
      await adminPage.click('#studentsSearchForm button[type="submit"]');
      const studentRow = adminPage.locator(`#studentsTableBody tr:has-text("${manualStudentLegal}")`).first();
      await studentRow.waitFor({ timeout: 20000 });

      studentPhase = '查看学生详情';
      await studentRow.locator('[data-view-student]').click();
      await adminPage.waitForFunction(() => document.getElementById('studentDetailDialog')?.open === true, { timeout: 10000 });
      const detailText = await adminPage.locator('#studentDetailContent').textContent();
      if (!(detailText || '').includes('回归家长')) {
        throw new Error('学生详情未显示家长信息');
      }

      studentPhase = '编辑学生';
      await adminPage.click('#editStudentFromDetailButton');
      await adminPage.waitForFunction(() => document.getElementById('createStudentDialog')?.open === true, { timeout: 10000 });
      await adminPage.fill('#createNotesInput', '已完成回归编辑');
      await adminPage.click('#submitCreateStudentButton');
      await adminPage.waitForFunction(() => document.getElementById('createStudentDialog')?.open === false, { timeout: 20000 });

      studentPhase = '下载模板';
      const downloadPromise = adminPage.waitForEvent('download');
      await adminPage.click('#downloadTemplateButton');
      const download = await downloadPromise;

      studentPhase = '打开导入弹窗';
      await adminPage.click('#openImportDialogButton');
      await adminPage.waitForFunction(() => document.getElementById('importStudentsDialog')?.open === true, { timeout: 10000 });
      const csvPath = await createCsvFile(
        'students-import.csv',
        '\uFEFFlegal_name,display_name,grade,parent_name,parent_phone,avatar_url,notes\r\n'
          + `${importStudentLegal},${importStudentDisplay},五年级,导入家长,1389999${disposableSuffix.slice(-4)},,回归导入\r\n`
      );
      await adminPage.setInputFiles('#importFileInput', csvPath);
      await adminPage.waitForTimeout(1200);
      const previewCellCount = await adminPage.locator('#importPreviewTableBody tr').first().locator('td').count();
      if (previewCellCount !== 8) {
        throw new Error(`CSV 预览列数异常: ${previewCellCount}`);
      }

      studentPhase = '确认导入';
      await adminPage.click('#confirmImportButton');
      await adminPage.waitForFunction(() => document.getElementById('importStudentsDialog')?.open === false, { timeout: 20000 });

      studentPhase = '搜索导入学生';
      await adminPage.fill('#studentsSearchInput', importStudentLegal);
      await adminPage.click('#studentsSearchForm button[type="submit"]');
      await adminPage.locator(`#studentsTableBody tr:has-text("${importStudentLegal}")`).first().waitFor({ timeout: 20000 });
      await screenshot(adminPage, 'students-page.png');
      assertNoPageErrors('admin');
      return download.suggestedFilename();
    } catch (error) {
      throw new Error(`${studentPhase}: ${error.message}`);
    }
  });

  await step('班级管理支持搜索筛选建班查看与加人', async function () {
    await adminPage.goto(`${baseUrl}/classes.html`, { waitUntil: 'networkidle' });
    await adminPage.waitForSelector('#classesTableBody', { timeout: 20000 });

    await adminPage.fill('#classesSearchInput', '海棠');
    await adminPage.click('#classesSearchForm button[type="submit"]');
    await adminPage.waitForTimeout(800);
    const searchedRows = await adminPage.locator('#classesTableBody tr').count();
    if (!searchedRows) {
      throw new Error('班级搜索结果为空');
    }
    await adminPage.click('#clearClassesSearchButton');
    await adminPage.waitForTimeout(800);

    const campusOptions = await adminPage.locator('#classesCampusFilter option').evaluateAll((nodes) => nodes.map((node) => ({ value: node.value, text: node.textContent || '' })));
    const subjectOptions = await adminPage.locator('#classesSubjectFilter option').evaluateAll((nodes) => nodes.map((node) => ({ value: node.value, text: node.textContent || '' })));
    const campusOption = campusOptions.find((option) => option.value && option.value !== 'all');
    const subjectOption = subjectOptions.find((option) => option.value && option.value !== 'all');
    if (campusOption) {
      await adminPage.selectOption('#classesCampusFilter', campusOption.value);
      await adminPage.waitForTimeout(600);
    }
    if (subjectOption) {
      await adminPage.selectOption('#classesSubjectFilter', subjectOption.value);
      await adminPage.waitForTimeout(600);
    }

    await adminPage.click('#openCreateClassButton');
    await adminPage.waitForFunction(() => document.getElementById('createClassDialog')?.open === true, { timeout: 10000 });
    await adminPage.fill('#createClassNameInput', adminCreatedClass);
    if (campusOption) {
      await adminPage.selectOption('#createClassCampusSelect', campusOption.value);
    }
    if (subjectOption) {
      await adminPage.selectOption('#createClassSubjectSelect', subjectOption.value);
    }
    const teacherSelectOptions = await adminPage.locator('#createClassTeacherSelect option').evaluateAll((nodes) => nodes.map((node) => ({ value: node.value, text: node.textContent || '' })));
    const teacherOption = teacherSelectOptions.find((option) => option.value);
    if (teacherOption) {
      await adminPage.selectOption('#createClassTeacherSelect', teacherOption.value);
    }
    await adminPage.fill('#createClassScheduleInput', '周日 15:00-16:30');
    await adminPage.click('#createClassForm button[type="submit"]');
    await adminPage.waitForFunction(() => document.getElementById('createClassDialog')?.open === false, { timeout: 20000 });
    await waitForNotice(adminPage, '#classesNotice', /已创建班级/);
    const classTitle = await adminPage.locator('#classDetailTitle').textContent();
    if ((classTitle || '').trim() !== adminCreatedClass) {
      throw new Error(`班级详情未切到新班级: ${classTitle}`);
    }

    await adminPage.fill('#classStudentSearchInput', manualStudentLegal);
    await adminPage.click('#classStudentSearchForm button[type="submit"]');
    const addButton = adminPage.locator('#classStudentSearchResults [data-add-class-student]').first();
    await addButton.waitFor({ timeout: 20000 });
    await addButton.click();
    await adminPage.waitForFunction((studentName) => (document.querySelector('#classRosterBody')?.textContent || '').includes(studentName), manualStudentLegal, { timeout: 20000 });
    await screenshot(adminPage, 'classes-page.png');
    assertNoPageErrors('admin');
    return adminCreatedClass;
  });

  const teacherContext = await browser.newContext({ viewport: { width: 1500, height: 980 } });
  const teacherPage = await teacherContext.newPage();
  attachDiagnostics(teacherPage, 'teacher');

  await step('老师首次登录强制改密与角色跳转正常', async function () {
    await loginAs(teacherPage, uiTeacherLogin, '666666');
    await teacherPage.waitForFunction(() => document.getElementById('changePasswordCard') && !document.getElementById('changePasswordCard').hidden, { timeout: 20000 });
    await teacherPage.fill('#newPasswordInput', disposableTeacherNextPassword);
    await teacherPage.fill('#confirmPasswordInput', disposableTeacherNextPassword);
    await teacherPage.click('#changePasswordButton');
    await teacherPage.waitForFunction(() => /teacher\.html$/.test(window.location.pathname), { timeout: 20000 });
    await waitForTeacherReady(teacherPage);
    await screenshot(teacherPage, 'teacher-page.png');
    assertNoPageErrors('teacher');
    return teacherPage.url();
  });

  await step('老师访问管理页会被重定向回老师页', async function () {
    for (const pageName of ['index.html', 'admin.html', 'students.html', 'classes.html']) {
      await teacherPage.goto(`${baseUrl}/${pageName}`, { waitUntil: 'networkidle' });
      await teacherPage.waitForFunction(() => /teacher\.html$/.test(window.location.pathname), { timeout: 20000 });
    }
    assertNoPageErrors('teacher');
    return 'role guard ok';
  });

  await step('老师端核心操作链路可用', async function () {
    let teacherPhase = '打开老师页';
    try {
      await teacherPage.goto(`${baseUrl}/teacher.html`, { waitUntil: 'networkidle' });
      await waitForTeacherReady(teacherPage);

      teacherPhase = '切校区切班级';
      const campusCount = await teacherPage.locator('#campusSelect option').count();
      if (campusCount > 1) {
        await teacherPage.selectOption('#campusSelect', { index: 1 });
        await teacherPage.waitForTimeout(1000);
      }
      const classCount = await teacherPage.locator('#classSelect option').count();
      if (classCount > 1) {
        await teacherPage.selectOption('#classSelect', { index: 1 });
        await teacherPage.waitForTimeout(1200);
      }

      teacherPhase = '选择学生并单人加分';
      await teacherPage.locator('#studentGrid [data-student-id]').first().click();
      await teacherPage.waitForTimeout(800);
      const actionBefore = await teacherPage.locator('#studentRecordList').textContent();
      await teacherPage.locator('#actionCards [data-rule-id]').first().click();
      await teacherPage.waitForTimeout(1600);
      const actionAfter = await teacherPage.locator('#studentRecordList').textContent();
      if (actionBefore === actionAfter) {
        throw new Error('单人加分后流水未刷新');
      }

      teacherPhase = '积分兑换';
      await teacherPage.click('#openRedeemButton');
      await teacherPage.waitForFunction(() => document.getElementById('redeemDialog')?.open === true, { timeout: 10000 });
      await teacherPage.fill('#redeemItemInput', redeemItem);
      await teacherPage.fill('#redeemPointsInput', '1');
      await teacherPage.click('#redeemSubmitButton');
      await teacherPage.waitForFunction(() => document.getElementById('redeemDialog')?.open === false, { timeout: 20000 });
      await teacherPage.waitForTimeout(1500);
      if (!((await teacherPage.locator('#studentRecordList').textContent()) || '').includes(redeemItem)) {
        throw new Error('积分兑换后流水未出现兑换记录');
      }

      teacherPhase = '补录积分';
      await teacherPage.click('#openSeedDialogButton');
      await teacherPage.waitForFunction(() => document.getElementById('seedDialog')?.open === true, { timeout: 10000 });
      await teacherPage.fill('#seedPointsInput', '5');
      await teacherPage.fill('#seedRemarkInput', seedRemark);
      await teacherPage.click('#seedSubmitButton');
      await teacherPage.waitForFunction(() => document.getElementById('seedDialog')?.open === false, { timeout: 20000 });
      await teacherPage.waitForTimeout(1500);
      if (!((await teacherPage.locator('#studentRecordList').textContent()) || '').includes(seedRemark)) {
        throw new Error('补录积分后流水未出现补录备注');
      }

      teacherPhase = '快速建班';
      await teacherPage.click('#openCreateClassButton');
      await teacherPage.waitForFunction(() => document.getElementById('createClassDialog')?.open === true, { timeout: 10000 });
      await teacherPage.fill('#createClassNameInput', teacherCreatedClass);
      await teacherPage.fill('#createClassScheduleInput', '周三 19:00-20:00');
      await teacherPage.click('#createClassForm button[type="submit"]');
      await teacherPage.waitForFunction(() => document.getElementById('createClassDialog')?.open === false, { timeout: 20000 });
      await teacherPage.waitForTimeout(1600);
      if (!((await teacherPage.locator('#classSelect').textContent()) || '').includes(teacherCreatedClass)) {
        throw new Error('快速建班后班级列表未刷新');
      }

      teacherPhase = '搜索加人';
      await teacherPage.click('#openAddStudentButton');
      await teacherPage.waitForFunction(() => document.getElementById('addStudentDialog')?.open === true, { timeout: 10000 });
      await teacherPage.fill('#studentSearchInput', manualStudentLegal);
      await teacherPage.click('#studentSearchForm button[type="submit"]');
      const teacherAddButton = teacherPage.locator('#studentSearchResults [data-add-student-id]').first();
      await teacherAddButton.waitFor({ timeout: 20000 });
      await teacherAddButton.click();
      await teacherPage.waitForTimeout(1500);
      await teacherPage.waitForFunction((names) => {
        const text = document.querySelector('#studentGrid')?.textContent || '';
        return names.some(function (name) {
          return text.includes(name);
        });
      }, [manualStudentDisplay, manualStudentLegal], { timeout: 40000 });
      await teacherPage.click('#closeAddStudentButton');

      teacherPhase = '整班加一';
      await teacherPage.locator('#studentGrid [data-student-id]').first().click();
      await teacherPage.waitForTimeout(800);
      await teacherPage.click('#classBoostToggleButton');
      await teacherPage.waitForFunction(() => document.getElementById('classBoostDialog')?.open === true, { timeout: 10000 });
      await teacherPage.click('#classBoostDialogConfirmButton');
      await teacherPage.waitForFunction(() => document.getElementById('classBoostDialog')?.open === false, { timeout: 20000 });
      await teacherPage.waitForTimeout(1500);

      teacherPhase = '移出学生';
      teacherPage.once('dialog', (dialog) => dialog.accept());
      await teacherPage.click('#removeSelectedStudentButton');
      await teacherPage.waitForTimeout(1500);
      const teacherGridText = (await teacherPage.locator('#studentGrid').textContent()) || '';
      if ([manualStudentDisplay, manualStudentLegal].some(function (studentName) { return teacherGridText.includes(studentName); })) {
        throw new Error('移出学生后列表未刷新');
      }

      assertNoPageErrors('teacher');
      return teacherCreatedClass;
    } catch (error) {
      throw new Error(`${teacherPhase}: ${error.message}`);
    }
  });

  const displaySummary = await serviceClient.from('student_points_summary').select('student_id');
  const summaryCount = displaySummary.data?.length || 0;

  const displayContext = await browser.newContext({ viewport: { width: 1600, height: 960 } });
  const displayPage = await displayContext.newPage();
  attachDiagnostics(displayPage, 'display');

  await step('大屏展示页总分榜进步榜徽章榜与时钟正常', async function () {
    await displayPage.goto(`${baseUrl}/display.html`, { waitUntil: 'networkidle' });
    await displayPage.waitForTimeout(2500);
    const state = await displayPage.evaluate(() => ({
      totalCount: document.querySelectorAll('#totalBoard .display-rank-item').length,
      progressCount: document.querySelectorAll('#progressBoard .display-rank-item').length,
      badgeCount: document.querySelectorAll('#badgeBoard .display-rank-item').length,
      clock: document.getElementById('displayClock')?.textContent || ''
    }));
    if (!state.totalCount || !state.progressCount || !state.badgeCount) {
      throw new Error(JSON.stringify(state));
    }
    const firstName = await displayPage.locator('#totalBoard .display-rank-item h3').first().textContent();
    await delay(1200);
    const nextClock = await displayPage.locator('#displayClock').textContent();
    if (state.clock === nextClock) {
      throw new Error('大屏时钟未刷新');
    }
    if (summaryCount > 8) {
      await delay(8500);
      const rotatedName = await displayPage.locator('#totalBoard .display-rank-item h3').first().textContent();
      if ((firstName || '').trim() === (rotatedName || '').trim()) {
        throw new Error('多页榜单未轮播切换');
      }
    }
    await screenshot(displayPage, 'display-page.png');
    assertNoPageErrors('display');
    return JSON.stringify(state);
  });

  const emptyDisplayContext = await browser.newContext({ viewport: { width: 1600, height: 960 } });
  await emptyDisplayContext.route('**/rest/v1/student_points_summary*', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await emptyDisplayContext.route('**/rest/v1/level_tiers*', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  const emptyDisplayPage = await emptyDisplayContext.newPage();

  await step('大屏空数据状态合理', async function () {
    await emptyDisplayPage.goto(`${baseUrl}/display.html`, { waitUntil: 'networkidle' });
    await emptyDisplayPage.waitForFunction(() => /暂无榜单数据/.test(document.body.textContent || ''), { timeout: 20000 });
    await screenshot(emptyDisplayPage, 'display-empty-page.png');
    return 'empty state ok';
  });

  await emptyDisplayContext.close();
  await displayContext.close();
  await teacherContext.close();
  await adminContext.close();
} catch (error) {
  push('fatal', false, error.message || String(error));
} finally {
  if (browser) {
    await browser.close().catch(function () {});
  }
  await cleanupRemoteArtifacts(serviceClient).catch(function (error) {
    push('cleanup', false, error.message || String(error));
  });
  stopDevServer();
  fs.writeFileSync(path.join(artifactDir, 'results.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
}







