import { mountSessionActions, requirePageAuth } from './auth.js';

const authContext = await requirePageAuth({ allowedRoles: ['admin'] });

if (authContext) {
  const applyAdminEntryState = function () {
    mountSessionActions(document.querySelector('.header-actions'), authContext);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyAdminEntryState, { once: true });
  } else {
    applyAdminEntryState();
  }

  await import('./admin.js');
}
