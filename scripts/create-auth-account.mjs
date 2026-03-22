import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';

const cwd = process.cwd();
const ENV_FILES = ['.env.local', '.env'];
const ACCOUNT_EMAIL_DOMAIN = 'accounts.points-mvp.local';
const HELP_TEXT = `
用法：
  npm run account:create -- --role admin --login-name admin --password Admin123456 --display-name 系统管理员 --phone 13900009999
  npm run account:create -- --role teacher --login-name cls --phone 13880010001 --display-name 陈老师 --teacher-id <teachers.id>

参数：
  --role                 admin | teacher
  --login-name           登录账号，例如 admin / cls / xls / sls
  --phone                联系手机号，仅用于 user_profiles 和业务资料，不参与登录
  --display-name         页面展示名称
  --password             登录密码；teacher 默认 666666，admin 建议显式传入
  --teacher-id           role=teacher 时必填，对应 public.teachers.id
  --must-change-password true | false，默认 teacher=true，admin=false
  --inactive             可选，创建后将 user_profiles.is_active 设为 false
  --help                 查看帮助
`;

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

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const part = argv[index];
    if (!part.startsWith('--')) {
      continue;
    }
    const key = part.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
      continue;
    }
    args[key] = next;
    index += 1;
  }
  return args;
}

function normalizePhone(value) {
  const raw = String(value || '').trim().replace(/[\s()-]/g, '');
  if (!raw) {
    return '';
  }
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) {
    return digits;
  }
  if (digits.length === 13 && digits.startsWith('86')) {
    return digits.slice(2);
  }
  return digits;
}

function normalizeStoredPhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 13 && digits.startsWith('86')) {
    return digits.slice(2);
  }
  return digits;
}

function normalizeLoginName(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
}

function buildAuthEmailFromLoginName(loginName) {
  return `${normalizeLoginName(loginName)}@${ACCOUNT_EMAIL_DOMAIN}`;
}

function parseBoolean(value, fallback) {
  if (value === undefined) {
    return fallback;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'y'].includes(normalized)) {
    return true;
  }
  if (['false', '0', 'no', 'n'].includes(normalized)) {
    return false;
  }
  return fallback;
}

function buildDefaultPassword(role, providedPassword) {
  if (providedPassword) {
    return providedPassword;
  }
  return role === 'teacher' ? '666666' : '';
}

function maskPhone(phone) {
  const value = String(phone || '');
  if (value.length < 7) {
    return value;
  }
  return `${value.slice(0, 3)}****${value.slice(-4)}`;
}

async function listAllAuthUsers(supabase) {
  let page = 1;
  const perPage = 1000;
  const users = [];

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw error;
    }
    const batch = data?.users || [];
    users.push(...batch);
    if (batch.length < perPage) {
      break;
    }
    page += 1;
  }

  return users;
}

async function findExistingProfile(supabase, options) {
  if (options.role === 'teacher' && options.teacherId) {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, role, phone, display_name, teacher_id, is_active, must_change_password')
      .eq('teacher_id', options.teacherId)
      .maybeSingle();
    if (error) {
      throw error;
    }
    if (data) {
      return data;
    }
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, role, phone, display_name, teacher_id, is_active, must_change_password')
    .eq('phone', options.phone)
    .maybeSingle();
  if (error) {
    throw error;
  }
  return data || null;
}

function findAuthUser(users, options) {
  return users.find(function (user) {
    const loginName = normalizeLoginName(user.user_metadata?.login_name);
    const storedPhone = normalizeStoredPhone(user.phone);
    return user.id === options.userId
      || user.email === options.authEmail
      || loginName === options.loginName
      || storedPhone === options.phone;
  }) || null;
}

async function ensureTeacherExists(supabase, teacherId) {
  const { data, error } = await supabase
    .from('teachers')
    .select('id, name, display_name, phone, campus_id, status')
    .eq('id', teacherId)
    .maybeSingle();

  if (error) {
    throw error;
  }
  if (!data) {
    throw new Error(`未找到 teachers.id = ${teacherId} 的老师记录。`);
  }
  return data;
}

async function createOrUpdateAuthUser(supabase, options) {
  const users = await listAllAuthUsers(supabase);
  const existingUser = findAuthUser(users, options);
  const payload = {
    email: options.authEmail,
    email_confirm: true,
    password: options.password,
    user_metadata: {
      display_name: options.displayName,
      role: options.role,
      login_name: options.loginName
    }
  };

  if (existingUser) {
    const { data, error } = await supabase.auth.admin.updateUserById(existingUser.id, payload);
    if (error) {
      throw error;
    }
    return { user: data.user, mode: 'updated' };
  }

  const { data, error } = await supabase.auth.admin.createUser(payload);
  if (error) {
    throw error;
  }
  return { user: data.user, mode: 'created' };
}

async function migrateUserProfileId(supabase, existingProfileId, newUserId) {
  if (!existingProfileId || existingProfileId === newUserId) {
    return newUserId;
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .update({ id: newUserId })
    .eq('id', existingProfileId)
    .select('id')
    .single();

  if (error) {
    throw error;
  }

  return data.id;
}

async function upsertUserProfile(supabase, options) {
  const { data, error } = await supabase
    .from('user_profiles')
    .upsert({
      id: options.userId,
      role: options.role,
      phone: options.phone,
      display_name: options.displayName,
      teacher_id: options.teacherId || null,
      is_active: options.isActive,
      must_change_password: options.mustChangePassword
    }, { onConflict: 'id' })
    .select('id, role, phone, display_name, teacher_id, is_active, must_change_password, created_at')
    .single();

  if (error) {
    throw error;
  }
  return data;
}

async function main() {
  loadEnvFiles();
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    console.log(HELP_TEXT.trim());
    return;
  }

  const role = String(args.role || '').trim();
  const loginName = normalizeLoginName(args['login-name']);
  const phone = normalizePhone(args.phone);
  const displayName = String(args['display-name'] || '').trim();
  const teacherId = String(args['teacher-id'] || '').trim();
  const password = buildDefaultPassword(role, args.password);
  const mustChangePassword = parseBoolean(args['must-change-password'], role === 'teacher');
  const isActive = !parseBoolean(args.inactive, false);
  const authEmail = buildAuthEmailFromLoginName(loginName);

  if (!['admin', 'teacher'].includes(role)) {
    throw new Error('参数 --role 只支持 admin 或 teacher。');
  }
  if (!loginName) {
    throw new Error('参数 --login-name 必填，且只能包含字母、数字、点、下划线或中划线。');
  }
  if (!phone) {
    throw new Error('参数 --phone 必填，用于 user_profiles 联系方式。');
  }
  if (!displayName) {
    throw new Error('参数 --display-name 必填。');
  }
  if (!password) {
    throw new Error('当前缺少密码。admin 请显式传入 --password。');
  }
  if (role === 'teacher' && !teacherId) {
    throw new Error('role=teacher 时，参数 --teacher-id 必填。');
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('缺少 SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY。请先写入 .env。');
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  let teacher = null;
  if (role === 'teacher') {
    teacher = await ensureTeacherExists(supabase, teacherId);
  }

  const existingProfile = await findExistingProfile(supabase, {
    role,
    teacherId: role === 'teacher' ? teacherId : '',
    phone
  });

  const { user, mode } = await createOrUpdateAuthUser(supabase, {
    userId: existingProfile?.id || '',
    role,
    loginName,
    authEmail,
    phone,
    password,
    displayName
  });

  if (!user?.id) {
    throw new Error('Auth 用户创建成功，但没有拿到 user id。');
  }

  const profileUserId = await migrateUserProfileId(supabase, existingProfile?.id || '', user.id);
  const profile = await upsertUserProfile(supabase, {
    userId: profileUserId,
    role,
    phone,
    displayName,
    teacherId: role === 'teacher' ? teacherId : null,
    isActive,
    mustChangePassword
  });

  console.log('账号写入完成：');
  console.log(`- auth user: ${mode}`);
  console.log(`- user id: ${user.id}`);
  console.log(`- profile id: ${profile.id}`);
  console.log(`- role: ${profile.role}`);
  console.log(`- login name: ${loginName}`);
  console.log(`- auth email: ${authEmail}`);
  console.log(`- phone: ${maskPhone(profile.phone)}`);
  console.log(`- display name: ${profile.display_name}`);
  console.log(`- must change password: ${profile.must_change_password}`);
  console.log(`- is active: ${profile.is_active}`);
  if (teacher) {
    console.log(`- teacher: ${teacher.display_name || teacher.name} (${teacher.id})`);
  }
}

main().catch(function (error) {
  console.error(`创建账号失败：${error.message}`);
  process.exitCode = 1;
});
