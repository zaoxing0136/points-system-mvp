import { ensureSupabase } from './supabase-client.js';

const PROFILE_FIELDS = `
  id,
  role,
  phone,
  display_name,
  teacher_id,
  is_active,
  must_change_password,
  created_at,
  teacher:teacher_id ( id, name, display_name, phone, campus_id, status )
`;

const ACCOUNT_EMAIL_DOMAIN = 'accounts.points-mvp.local';

let currentAuthContext = null;

function decodeJwtPayload(token) {
  try {
    const base64 = String(token || '').split('.')[1];
    if (!base64) {
      return null;
    }
    const normalized = base64.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(atob(normalized).split('').map(function (char) {
      return `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`;
    }).join(''));
    return JSON.parse(json);
  } catch (_error) {
    return null;
  }
}

function buildAppPath(pathname) {
  const url = new URL(pathname, window.location.origin);
  return `${url.pathname.split('/').pop() || 'index.html'}${url.search}${url.hash}`;
}

function buildLoginUrl(nextPath, extras = {}) {
  const url = new URL('./login.html', window.location.href);
  if (nextPath) {
    url.searchParams.set('next', nextPath);
  }
  Object.entries(extras).forEach(function ([key, value]) {
    if (value) {
      url.searchParams.set(key, value);
    }
  });
  return url.toString();
}

export function normalizeLoginName(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, '');
}

export function buildAuthEmailFromLoginName(loginName) {
  const normalized = normalizeLoginName(loginName);
  if (!normalized) {
    return '';
  }
  if (normalized.includes('@')) {
    return normalized;
  }
  return `${normalized}@${ACCOUNT_EMAIL_DOMAIN}`;
}

export function getRoleHome(role) {
  return role === 'teacher' ? './teacher.html' : './index.html';
}

function isQuestionOnlyText(value) {
  return /^[?？]+$/.test(String(value || '').trim());
}

function normalizeAuthLabel(value) {
  const text = String(value || '').trim();
  if (!text) {
    return '';
  }
  if (isQuestionOnlyText(text) || /^(null|undefined|unknown)$/i.test(text)) {
    return '';
  }
  return text;
}

export function getAuthDisplayName(context) {
  const candidates = [
    context?.profile?.display_name,
    context?.profile?.teacher?.display_name,
    context?.profile?.teacher?.name,
    context?.user?.user_metadata?.display_name,
    context?.user?.user_metadata?.login_name,
    context?.profile?.phone,
    context?.user?.email ? String(context.user.email).split('@')[0] : ''
  ];

  const resolved = candidates.map(normalizeAuthLabel).find(Boolean);
  if (resolved) {
    return resolved;
  }

  if (context?.isAdmin) {
    return '管理员';
  }
  if (context?.isTeacher) {
    return '老师账号';
  }
  return '未命名账号';
}

export function setCurrentAuthContext(context) {
  currentAuthContext = context || null;
}

export function getCurrentAuthContext() {
  return currentAuthContext;
}

async function fetchSessionUser() {
  const supabase = ensureSupabase();
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) {
    throw sessionError;
  }

  const session = sessionData.session;
  if (!session) {
    return null;
  }

  if (session.user?.id) {
    return session.user;
  }

  const tokenPayload = decodeJwtPayload(session.access_token);
  if (tokenPayload?.sub) {
    return {
      id: tokenPayload.sub,
      email: tokenPayload.email || '',
      phone: tokenPayload.phone || '',
      user_metadata: tokenPayload.user_metadata || {}
    };
  }

  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) {
      throw userError;
    }
    return userData.user || null;
  } catch (_error) {
    return null;
  }
}

export async function fetchUserProfile(userId) {
  const supabase = ensureSupabase();
  const { data, error } = await supabase
    .from('user_profiles')
    .select(PROFILE_FIELDS)
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data || null;
}

export async function resolveAuthContext() {
  const user = await fetchSessionUser();
  if (!user) {
    currentAuthContext = null;
    return null;
  }

  const profile = await fetchUserProfile(user.id);
  const role = profile?.role || null;
  const context = {
    user,
    profile,
    role,
    isAdmin: role === 'admin',
    isTeacher: role === 'teacher',
    teacherId: profile?.teacher_id || profile?.teacher?.id || null
  };

  currentAuthContext = context;
  return context;
}

export async function signInWithAccountPassword(account, password) {
  const supabase = ensureSupabase();
  const email = buildAuthEmailFromLoginName(account);
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    throw error;
  }

  return data;
}

function clearStoredAuthArtifacts() {
  [window.localStorage, window.sessionStorage].forEach(function (storage) {
    if (!storage) {
      return;
    }
    const keys = [];
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key && key.startsWith('sb-')) {
        keys.push(key);
      }
    }
    keys.forEach(function (key) {
      storage.removeItem(key);
    });
  });
}

export async function signOutCurrentUser() {
  const supabase = ensureSupabase();
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.warn('signOut warning', error);
    }
  } finally {
    clearStoredAuthArtifacts();
    currentAuthContext = null;
  }
}

export async function updateCurrentPassword(password) {
  const supabase = ensureSupabase();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    throw error;
  }

  const context = currentAuthContext || await resolveAuthContext();
  if (!context?.user?.id) {
    throw new Error('当前登录态已失效，请重新登录。');
  }

  const { error: profileError } = await supabase
    .from('user_profiles')
    .update({ must_change_password: false })
    .eq('id', context.user.id);

  if (profileError) {
    throw profileError;
  }

  return resolveAuthContext();
}

export async function requirePageAuth(options = {}) {
  const allowedRoles = Array.isArray(options.allowedRoles) ? options.allowedRoles : [];
  const bypassMustChangePassword = Boolean(options.bypassMustChangePassword);
  const nextPath = buildAppPath(window.location.pathname + window.location.search + window.location.hash);

  const context = await resolveAuthContext();
  if (!context?.user) {
    window.location.replace(buildLoginUrl(nextPath));
    return null;
  }

  if (!context.profile) {
    await signOutCurrentUser();
    window.location.replace(buildLoginUrl(nextPath, { reason: 'profile_missing' }));
    return null;
  }

  if (!context.profile.is_active) {
    await signOutCurrentUser();
    window.location.replace(buildLoginUrl(nextPath, { reason: 'inactive' }));
    return null;
  }

  if (context.profile.must_change_password && !bypassMustChangePassword) {
    window.location.replace(buildLoginUrl(nextPath, { force_password: '1' }));
    return null;
  }

  if (allowedRoles.length && !allowedRoles.includes(context.role)) {
    window.location.replace(getRoleHome(context.role));
    return null;
  }

  currentAuthContext = context;
  return context;
}

export function getPostLoginTarget(context) {
  const params = new URLSearchParams(window.location.search);
  const nextPath = params.get('next');

  if (nextPath && nextPath !== 'login.html') {
    const normalizedNextPath = `./${nextPath.replace(/^\.\//, '')}`;
    if (context?.isTeacher && !nextPath.startsWith('teacher.html')) {
      return getRoleHome(context.role);
    }
    return normalizedNextPath;
  }

  return getRoleHome(context?.role);
}

export function mountSessionActions(container, context) {
  if (!container || !context?.profile) {
    return;
  }

  const existing = container.querySelector('[data-session-actions]');
  if (existing) {
    existing.remove();
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'session-actions';
  wrapper.dataset.sessionActions = 'true';

  const chip = document.createElement('span');
  chip.className = 'session-chip';
  chip.textContent = getAuthDisplayName(context);

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'ghost-button session-logout-button';
  button.textContent = '退出登录';
  button.addEventListener('click', async function (event) {
    event.preventDefault();
    if (button.disabled) {
      return;
    }
    button.disabled = true;
    button.textContent = '退出中';
    try {
      await signOutCurrentUser();
    } catch (error) {
      console.warn('sign out fallback', error);
    }
    window.location.replace(buildLoginUrl());
  });

  wrapper.append(chip, button);
  container.append(wrapper);
}





