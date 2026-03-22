import { isSupabaseConfigured } from './supabase-client.js';
import {
  getAuthDisplayName,
  getPostLoginTarget,
  resolveAuthContext,
  signInWithAccountPassword,
  signOutCurrentUser,
  updateCurrentPassword
} from './auth.js';

const PAGE_MESSAGES = {
  profile_missing: '当前账号还没有绑定业务身份，请让管理员在管理台完成绑定。',
  inactive: '当前账号已停用，请联系系统管理员。'
};

function showNotice(element, message, type) {
  element.textContent = message;
  element.hidden = !message;
  element.dataset.type = type || 'info';
}

function setButtonBusy(button, busy, busyText, idleText) {
  button.disabled = busy;
  button.textContent = busy ? busyText : idleText;
}

function redirectByRole(context) {
  window.location.replace(getPostLoginTarget(context));
}

document.addEventListener('DOMContentLoaded', function () {
  const elements = {
    loginNotice: document.getElementById('loginNotice'),
    loginCard: document.getElementById('loginCard'),
    changePasswordCard: document.getElementById('changePasswordCard'),
    loginForm: document.getElementById('loginForm'),
    loginAccountInput: document.getElementById('loginAccountInput'),
    loginPasswordInput: document.getElementById('loginPasswordInput'),
    loginSubmitButton: document.getElementById('loginSubmitButton'),
    changePasswordHint: document.getElementById('changePasswordHint'),
    changePasswordForm: document.getElementById('changePasswordForm'),
    newPasswordInput: document.getElementById('newPasswordInput'),
    confirmPasswordInput: document.getElementById('confirmPasswordInput'),
    changePasswordButton: document.getElementById('changePasswordButton')
  };

  function toggleCard(mode) {
    const showChange = mode === 'change-password';
    elements.loginCard.hidden = showChange;
    elements.changePasswordCard.hidden = !showChange;
  }

  function applyQueryMessage() {
    const params = new URLSearchParams(window.location.search);
    const reason = params.get('reason');
    const forcePassword = params.get('force_password');

    if (forcePassword === '1') {
      showNotice(elements.loginNotice, '当前账号必须先修改密码后才能继续使用系统。', 'info');
      return;
    }

    if (reason && PAGE_MESSAGES[reason]) {
      showNotice(elements.loginNotice, PAGE_MESSAGES[reason], 'error');
    }
  }

  function applyFileModeGuard() {
    if (window.location.protocol !== 'file:') {
      return false;
    }

    toggleCard('login');
    showNotice(elements.loginNotice, '请不要直接双击本地 HTML。请改用 http://127.0.0.1:4175/login.html 打开登录页。', 'error');
    elements.loginSubmitButton.disabled = true;
    elements.changePasswordButton.disabled = true;
    return true;
  }

  async function syncExistingSession() {
    if (applyFileModeGuard()) {
      return;
    }

    if (!isSupabaseConfigured) {
      showNotice(elements.loginNotice, '缺少 Supabase 配置，请先在 .env 中填写 SUPABASE_URL 和 SUPABASE_ANON_KEY。', 'error');
      elements.loginSubmitButton.disabled = true;
      return;
    }

    try {
      const context = await resolveAuthContext();
      if (!context?.user) {
        toggleCard('login');
        applyQueryMessage();
        return;
      }

      if (!context.profile) {
        await signOutCurrentUser();
        toggleCard('login');
        showNotice(elements.loginNotice, PAGE_MESSAGES.profile_missing, 'error');
        return;
      }

      if (!context.profile.is_active) {
        await signOutCurrentUser();
        toggleCard('login');
        showNotice(elements.loginNotice, PAGE_MESSAGES.inactive, 'error');
        return;
      }

      if (context.profile.must_change_password) {
        toggleCard('change-password');
        elements.changePasswordHint.textContent = `${getAuthDisplayName(context)}，首次登录请先修改密码。`;
        showNotice(elements.loginNotice, '请先完成修改密码，再进入系统。', 'info');
        return;
      }

      redirectByRole(context);
    } catch (error) {
      try {
        await signOutCurrentUser();
      } catch (_error) {
      }
      toggleCard('login');
      showNotice(elements.loginNotice, `登录态检查失败：${error.message}`, 'error');
    }
  }

  elements.loginForm.addEventListener('submit', async function (event) {
    event.preventDefault();
    if (!isSupabaseConfigured || window.location.protocol === 'file:') {
      return;
    }

    const account = elements.loginAccountInput.value.trim();
    const password = elements.loginPasswordInput.value;
    if (!account || !password) {
      showNotice(elements.loginNotice, '请先填写账号和密码。', 'error');
      return;
    }

    try {
      setButtonBusy(elements.loginSubmitButton, true, '登录中...', '登录');
      await signInWithAccountPassword(account, password);
      const context = await resolveAuthContext();
      if (!context?.profile) {
        await signOutCurrentUser();
        showNotice(elements.loginNotice, PAGE_MESSAGES.profile_missing, 'error');
        return;
      }
      if (!context.profile.is_active) {
        await signOutCurrentUser();
        showNotice(elements.loginNotice, PAGE_MESSAGES.inactive, 'error');
        return;
      }
      if (context.profile.must_change_password) {
        toggleCard('change-password');
        elements.changePasswordHint.textContent = `${getAuthDisplayName(context)}，请先设置一个新的登录密码。`;
        showNotice(elements.loginNotice, '登录成功，请先修改密码。', 'success');
        return;
      }
      redirectByRole(context);
    } catch (error) {
      showNotice(elements.loginNotice, `登录失败：${error.message}`, 'error');
    } finally {
      setButtonBusy(elements.loginSubmitButton, false, '登录中...', '登录');
    }
  });

  elements.changePasswordForm.addEventListener('submit', async function (event) {
    event.preventDefault();
    if (window.location.protocol === 'file:') {
      return;
    }

    const nextPassword = elements.newPasswordInput.value;
    const confirmPassword = elements.confirmPasswordInput.value;
    if (nextPassword.length < 6) {
      showNotice(elements.loginNotice, '新密码至少 6 位。', 'error');
      return;
    }
    if (nextPassword !== confirmPassword) {
      showNotice(elements.loginNotice, '两次输入的新密码不一致。', 'error');
      return;
    }

    try {
      setButtonBusy(elements.changePasswordButton, true, '保存中...', '保存新密码');
      const context = await updateCurrentPassword(nextPassword);
      showNotice(elements.loginNotice, '密码已更新，正在进入系统。', 'success');
      redirectByRole(context);
    } catch (error) {
      showNotice(elements.loginNotice, `修改密码失败：${error.message}`, 'error');
    } finally {
      setButtonBusy(elements.changePasswordButton, false, '保存中...', '保存新密码');
    }
  });

  toggleCard('login');
  applyQueryMessage();
  syncExistingSession();
});
