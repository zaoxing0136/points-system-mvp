import { getAuthDisplayName, mountSessionActions, requirePageAuth } from './auth.js';

function applyHomeState(authContext) {
  const heroActions = document.querySelector('.hero-actions');
  const heroCopy = document.querySelector('.hero-copy');

  mountSessionActions(heroActions, authContext);

  if (heroCopy) {
    heroCopy.textContent = `当前登录：${getAuthDisplayName(authContext)}。管理入口、学生主档、班级管理和规则配置均已接入真实数据。`;
  }
}

const authContext = await requirePageAuth({ allowedRoles: ['admin', 'teacher'] });

if (authContext?.isTeacher) {
  window.location.replace('./teacher.html');
} else if (authContext) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      applyHomeState(authContext);
    }, { once: true });
  } else {
    applyHomeState(authContext);
  }
}
