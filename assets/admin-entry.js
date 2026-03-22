import { mountSessionActions, requirePageAuth } from './auth.js';

const authContext = await requirePageAuth({ allowedRoles: ['admin'] });

if (authContext) {
  document.addEventListener('DOMContentLoaded', function () {
    mountSessionActions(document.querySelector('.header-actions'), authContext);
  });
  await import('./admin.js');
}