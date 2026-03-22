import { createClient } from '@supabase/supabase-js';

const ACCOUNT_EMAIL_DOMAIN = 'accounts.points-mvp.local';

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function normalizeLoginName(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
}

function normalizePhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 13 && digits.startsWith('86')) {
    return digits.slice(2);
  }
  return digits;
}

function buildAuthEmailFromLoginName(loginName) {
  return `${normalizeLoginName(loginName)}@${ACCOUNT_EMAIL_DOMAIN}`;
}

function createClients(env) {
  const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const supabaseAnonKey = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw createHttpError(500, '缺少服务端 Supabase 环境变量。');
  }

  const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const serviceClient = createClient(supabaseUrl, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  return { anonClient, serviceClient };
}

function getBearerToken(headers = {}) {
  const headerValue = headers.authorization || headers.Authorization || '';
  const matched = /^Bearer\s+(.+)$/i.exec(headerValue);
  return matched ? matched[1] : '';
}

async function verifyAdminAccess(env, headers) {
  const token = getBearerToken(headers);
  if (!token) {
    throw createHttpError(401, '缺少管理员登录态。');
  }

  const { anonClient } = createClients(env);
  const { data: userData, error: userError } = await anonClient.auth.getUser(token);
  if (userError || !userData?.user) {
    throw createHttpError(401, '管理员登录态已失效，请重新登录。');
  }

  const { data: profile, error: profileError } = await anonClient
    .from('user_profiles')
    .select('id, role, is_active')
    .eq('id', userData.user.id)
    .maybeSingle();

  if (profileError) {
    throw createHttpError(500, profileError.message);
  }
  if (!profile || profile.role !== 'admin' || !profile.is_active) {
    throw createHttpError(403, '当前账号没有管理员权限。');
  }

  return userData.user;
}

async function listAllAuthUsers(serviceClient) {
  let page = 1;
  const perPage = 1000;
  const users = [];

  while (true) {
    const { data, error } = await serviceClient.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw createHttpError(500, error.message);
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

async function ensureTeacherExists(serviceClient, teacherId) {
  const { data, error } = await serviceClient
    .from('teachers')
    .select('id, name, display_name, phone, campus_id, status')
    .eq('id', teacherId)
    .maybeSingle();

  if (error) {
    throw createHttpError(500, error.message);
  }
  if (!data) {
    throw createHttpError(400, '未找到对应老师记录。');
  }
  return data;
}

async function findExistingProfile(serviceClient, teacherId, phone) {
  if (teacherId) {
    const { data, error } = await serviceClient
      .from('user_profiles')
      .select('id, role, phone, display_name, teacher_id, is_active, must_change_password')
      .eq('teacher_id', teacherId)
      .maybeSingle();
    if (error) {
      throw createHttpError(500, error.message);
    }
    if (data) {
      return data;
    }
  }

  if (!phone) {
    return null;
  }

  const { data, error } = await serviceClient
    .from('user_profiles')
    .select('id, role, phone, display_name, teacher_id, is_active, must_change_password')
    .eq('phone', phone)
    .maybeSingle();

  if (error) {
    throw createHttpError(500, error.message);
  }
  return data || null;
}

function findAuthUser(users, options) {
  return users.find(function (user) {
    const loginName = normalizeLoginName(user.user_metadata?.login_name || user.email?.split('@')[0]);
    const storedPhone = normalizePhone(user.phone || user.user_metadata?.phone || '');
    return user.id === options.userId
      || user.email === options.authEmail
      || loginName === options.loginName
      || (options.phone && storedPhone === options.phone);
  }) || null;
}

async function createOrUpdateAuthUser(serviceClient, options) {
  const users = await listAllAuthUsers(serviceClient);
  const existingUser = findAuthUser(users, options);
  const payload = {
    email: options.authEmail,
    email_confirm: true,
    password: options.password,
    user_metadata: {
      display_name: options.displayName,
      role: 'teacher',
      login_name: options.loginName,
      phone: options.phone
    }
  };

  if (existingUser) {
    const { data, error } = await serviceClient.auth.admin.updateUserById(existingUser.id, payload);
    if (error) {
      throw createHttpError(500, error.message);
    }
    return { user: data.user, mode: 'updated' };
  }

  const { data, error } = await serviceClient.auth.admin.createUser(payload);
  if (error) {
    throw createHttpError(500, error.message);
  }
  return { user: data.user, mode: 'created' };
}

async function migrateUserProfileId(serviceClient, existingProfileId, newUserId) {
  if (!existingProfileId || existingProfileId === newUserId) {
    return newUserId;
  }

  const { data, error } = await serviceClient
    .from('user_profiles')
    .update({ id: newUserId })
    .eq('id', existingProfileId)
    .select('id')
    .single();

  if (error) {
    throw createHttpError(500, error.message);
  }

  return data.id;
}

async function upsertTeacherProfile(serviceClient, payload) {
  const { data, error } = await serviceClient
    .from('user_profiles')
    .upsert(payload, { onConflict: 'id' })
    .select('id, role, phone, display_name, teacher_id, is_active, must_change_password, created_at')
    .single();

  if (error) {
    throw createHttpError(500, error.message);
  }
  return data;
}

async function listTeacherAccounts(env, headers) {
  await verifyAdminAccess(env, headers);
  const { serviceClient } = createClients(env);
  const [profiles, users] = await Promise.all([
    serviceClient
      .from('user_profiles')
      .select('id, role, phone, display_name, teacher_id, is_active, must_change_password, created_at, teacher:teacher_id ( id, name, display_name, phone, campus_id, campuses:campus_id ( id, name ) )')
      .eq('role', 'teacher')
      .order('created_at', { ascending: false }),
    listAllAuthUsers(serviceClient)
  ]);

  if (profiles.error) {
    throw createHttpError(500, profiles.error.message);
  }

  const userMap = new Map(users.map(function (user) {
    return [user.id, user];
  }));

  return (profiles.data || []).map(function (profile) {
    const authUser = userMap.get(profile.id);
    const loginName = normalizeLoginName(authUser?.user_metadata?.login_name || authUser?.email?.split('@')[0]);
    return {
      ...profile,
      login_name: loginName,
      auth_email: authUser?.email || '',
      last_sign_in_at: authUser?.last_sign_in_at || null
    };
  });
}

async function createOrUpdateTeacherAccount(env, headers, body) {
  await verifyAdminAccess(env, headers);
  const { serviceClient } = createClients(env);

  const teacherId = String(body.teacherId || '').trim();
  const loginName = normalizeLoginName(body.loginName);
  const phone = normalizePhone(body.phone);
  const displayName = String(body.displayName || '').trim();
  const password = String(body.password || '666666').trim();
  const mustChangePassword = body.mustChangePassword !== false;
  const isActive = body.isActive !== false;

  if (!teacherId || !loginName || !phone || !displayName || password.length < 6) {
    throw createHttpError(400, '请完整填写老师、账号、手机号、显示名称和密码。');
  }

  const teacher = await ensureTeacherExists(serviceClient, teacherId);
  const existingProfile = await findExistingProfile(serviceClient, teacherId, phone);
  const { user, mode } = await createOrUpdateAuthUser(serviceClient, {
    userId: existingProfile?.id || '',
    authEmail: buildAuthEmailFromLoginName(loginName),
    loginName,
    phone,
    displayName,
    password
  });

  const profileId = await migrateUserProfileId(serviceClient, existingProfile?.id || '', user.id);
  const profile = await upsertTeacherProfile(serviceClient, {
    id: profileId,
    role: 'teacher',
    phone,
    display_name: displayName,
    teacher_id: teacherId,
    is_active: isActive,
    must_change_password: mustChangePassword
  });

  return {
    mode,
    profile,
    login_name: loginName,
    auth_email: buildAuthEmailFromLoginName(loginName),
    teacher
  };
}

async function resetTeacherPassword(env, headers, body) {
  await verifyAdminAccess(env, headers);
  const { serviceClient } = createClients(env);
  const userId = String(body.userId || '').trim();
  const password = String(body.password || '666666').trim();
  const mustChangePassword = body.mustChangePassword !== false;

  if (!userId || password.length < 6) {
    throw createHttpError(400, '重置密码缺少必要参数。');
  }

  const { data, error } = await serviceClient.auth.admin.updateUserById(userId, {
    password,
    email_confirm: true
  });
  if (error) {
    throw createHttpError(500, error.message);
  }

  const { error: profileError } = await serviceClient
    .from('user_profiles')
    .update({ must_change_password: mustChangePassword })
    .eq('id', userId);

  if (profileError) {
    throw createHttpError(500, profileError.message);
  }

  return {
    user_id: data.user?.id || userId,
    must_change_password: mustChangePassword
  };
}

export async function handleTeacherAccountsRequest({ method = 'GET', headers = {}, body = null, env = process.env }) {
  try {
    if (method === 'GET') {
      const accounts = await listTeacherAccounts(env, headers);
      return { status: 200, body: { accounts } };
    }

    if (method === 'POST') {
      const action = String(body?.action || 'createOrUpdate').trim();
      if (action === 'resetPassword') {
        const result = await resetTeacherPassword(env, headers, body || {});
        return { status: 200, body: { result } };
      }
      const result = await createOrUpdateTeacherAccount(env, headers, body || {});
      return { status: 200, body: { result } };
    }

    return { status: 405, body: { error: 'Method Not Allowed' } };
  } catch (error) {
    return {
      status: error.status || 500,
      body: { error: error.message || 'Teacher account request failed.' }
    };
  }
}

