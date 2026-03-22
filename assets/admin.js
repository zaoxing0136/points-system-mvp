import { isSupabaseConfigured } from './supabase-client.js';
import {
  fetchAdminPointRules,
  fetchCampuses,
  fetchLevelTiers,
  fetchTeacherAccountDirectory,
  fetchTeachers,
  upsertLevelTiers,
  upsertPointRules,
  resetTeacherAccountPassword,
  saveTeacherAccount
} from './supabase-service.js';
import { CATEGORY_META, escapeHtml } from './shared-ui.js';
import {
  DEFAULT_BADGE_RULES,
  DEFAULT_LEVEL_TIERS,
  DEFAULT_POINT_RULES
} from './default-config.js';

const CATEGORY_ORDER = ['classroom', 'homework', 'project', 'habits'];
const BADGE_RULES_STORAGE_KEY = 'points-mvp.badge-rules';
const DEFAULT_POINT_RULES_BY_ID = new Map(DEFAULT_POINT_RULES.map(function (rule) {
  return [rule.id, rule];
}));

function getCategoryRank(category) {
  const index = CATEGORY_ORDER.indexOf(category);
  return index === -1 ? CATEGORY_ORDER.length : index;
}

function sortPointRules(rules) {
  return rules.slice().sort(function (left, right) {
    if (getCategoryRank(left.category) !== getCategoryRank(right.category)) {
      return getCategoryRank(left.category) - getCategoryRank(right.category);
    }
    if (Boolean(left.is_common) !== Boolean(right.is_common)) {
      return Number(Boolean(right.is_common)) - Number(Boolean(left.is_common));
    }
    if (Number(left.sort_order || 0) !== Number(right.sort_order || 0)) {
      return Number(left.sort_order || 0) - Number(right.sort_order || 0);
    }
    return String(left.rule_name || '').localeCompare(String(right.rule_name || ''), 'zh-CN');
  });
}

function normalizeLevelTiers(rows) {
  return DEFAULT_LEVEL_TIERS.map(function (fallback, index) {
    const existing = (rows || []).find(function (item) {
      return Number(item.level_no) === fallback.level_no;
    }) || {};

    return {
      id: existing.id || null,
      level_no: index + 1,
      level_name: String(existing.level_name || fallback.level_name).trim(),
      threshold: Math.max(0, Number(existing.threshold ?? fallback.threshold ?? 0)),
      is_active: existing.is_active !== false
    };
  });
}

function normalizePointRules(rows) {
  const merged = (rows || []).map(function (rule) {
    return {
      id: rule.id,
      category: rule.category,
      rule_name: String(rule.rule_name || '').trim(),
      points: Number(rule.points || 0),
      sort_order: Number(rule.sort_order || 0),
      is_active: rule.is_active !== false,
      is_common: Boolean(rule.is_common),
      created_at: rule.created_at || null
    };
  });

  return sortPointRules(merged);
}

function normalizeBadgeRules(rows) {
  const source = Array.isArray(rows) && rows.length ? rows : DEFAULT_BADGE_RULES;
  return source.map(function (badge, index) {
    return {
      id: badge.id || `badge-${index + 1}`,
      badge_name: String(badge.badge_name || badge.name || '').trim() || `徽章 ${index + 1}`,
      rule_text: String(badge.rule_text || badge.rule || '').trim() || '待补充规则',
      is_active: badge.is_active !== false,
      sort_order: Number(badge.sort_order || (index + 1) * 10)
    };
  }).sort(function (left, right) {
    return Number(left.sort_order || 0) - Number(right.sort_order || 0);
  });
}

function loadBadgeRulesFromStorage() {
  try {
    const raw = window.localStorage.getItem(BADGE_RULES_STORAGE_KEY);
    if (!raw) {
      return normalizeBadgeRules(DEFAULT_BADGE_RULES);
    }
    return normalizeBadgeRules(JSON.parse(raw));
  } catch (_error) {
    return normalizeBadgeRules(DEFAULT_BADGE_RULES);
  }
}

function saveBadgeRulesToStorage(rows) {
  window.localStorage.setItem(BADGE_RULES_STORAGE_KEY, JSON.stringify(rows));
}

function suggestAccountName(existing, teacher, index) {
  if (existing?.login_name) {
    return existing.login_name;
  }
  const phoneTail = String(teacher?.phone || '').replace(/\D/g, '').slice(-4);
  if (phoneTail) {
    return `t${phoneTail}`;
  }
  return `teacher${index + 1}`;
}

function initAdminPage() {
  const elements = {
    tiersTableBody: document.getElementById('tiersTableBody'),
    buttonsTableBody: document.getElementById('buttonsTableBody'),
    badgesTableBody: document.getElementById('badgesTableBody'),
    saveConfigButton: document.getElementById('saveConfigButton'),
    resetConfigButton: document.getElementById('resetConfigButton'),
    resetAllDataButton: document.getElementById('resetAllDataButton'),
    adminNotice: document.getElementById('adminNotice'),
    teacherAccountCount: document.getElementById('teacherAccountCount'),
    teacherAccountForm: document.getElementById('teacherAccountForm'),
    accountTeacherSelect: document.getElementById('accountTeacherSelect'),
    accountLoginNameInput: document.getElementById('accountLoginNameInput'),
    accountDisplayNameInput: document.getElementById('accountDisplayNameInput'),
    accountPhoneInput: document.getElementById('accountPhoneInput'),
    accountPasswordInput: document.getElementById('accountPasswordInput'),
    accountMustChangePasswordSelect: document.getElementById('accountMustChangePasswordSelect'),
    accountActiveSelect: document.getElementById('accountActiveSelect'),
    teacherAccountSaveButton: document.getElementById('teacherAccountSaveButton'),
    teacherAccountResetButton: document.getElementById('teacherAccountResetButton'),
    teacherAccountsBody: document.getElementById('teacherAccountsBody')
  };

  const state = {
    levelTiers: normalizeLevelTiers([]),
    pointRules: normalizePointRules(DEFAULT_POINT_RULES),
    badges: loadBadgeRulesFromStorage(),
    teachers: [],
    teacherAccounts: [],
    isSaving: false,
    isLoading: false,
    isSavingAccount: false,
    selectedTeacherId: ''
  };

  function showNotice(message, type) {
    elements.adminNotice.textContent = message;
    elements.adminNotice.hidden = false;
    elements.adminNotice.dataset.type = type || 'info';
    window.clearTimeout(showNotice.timer);
    showNotice.timer = window.setTimeout(function () {
      elements.adminNotice.hidden = true;
    }, 2800);
  }

  function setConfigBusy(isBusy, text) {
    state.isSaving = isBusy;
    elements.saveConfigButton.disabled = isBusy;
    elements.resetConfigButton.disabled = isBusy;
    elements.resetAllDataButton.disabled = isBusy;
    elements.saveConfigButton.textContent = text || '保存配置';
  }

  function setAccountBusy(isBusy) {
    state.isSavingAccount = isBusy;
    elements.teacherAccountSaveButton.disabled = isBusy;
    elements.teacherAccountSaveButton.textContent = isBusy ? '保存中...' : '保存老师账号';
  }

  function renderLevelTable() {
    elements.tiersTableBody.innerHTML = state.levelTiers.map(function (tier) {
      return `
        <tr>
          <td>${tier.level_no}</td>
          <td><input type="text" data-tier-name="${escapeHtml(String(tier.level_no))}" value="${escapeHtml(tier.level_name)}" /></td>
          <td><input type="number" min="0" step="1" data-tier-threshold="${escapeHtml(String(tier.level_no))}" value="${escapeHtml(String(tier.threshold))}" /></td>
        </tr>
      `;
    }).join('');
  }

  function renderPointRulesTable() {
    elements.buttonsTableBody.innerHTML = state.pointRules.map(function (rule) {
      const meta = CATEGORY_META[rule.category] || { label: rule.category };
      return `
        <tr>
          <td>
            <div class="admin-category-cell">
              <strong>${escapeHtml(meta.label)}</strong>
              <span>${escapeHtml(rule.category)}</span>
            </div>
          </td>
          <td><input type="text" data-rule-name="${escapeHtml(rule.id)}" value="${escapeHtml(rule.rule_name)}" /></td>
          <td><input type="number" step="1" data-rule-points="${escapeHtml(rule.id)}" value="${escapeHtml(String(rule.points))}" /></td>
          <td><input type="number" step="1" data-rule-sort="${escapeHtml(rule.id)}" value="${escapeHtml(String(rule.sort_order))}" /></td>
          <td>
            <select data-rule-active="${escapeHtml(rule.id)}">
              <option value="true" ${rule.is_active ? 'selected' : ''}>启用</option>
              <option value="false" ${rule.is_active ? '' : 'selected'}>停用</option>
            </select>
          </td>
          <td>
            <select data-rule-common="${escapeHtml(rule.id)}">
              <option value="true" ${rule.is_common ? 'selected' : ''}>常用</option>
              <option value="false" ${rule.is_common ? '' : 'selected'}>普通</option>
            </select>
          </td>
        </tr>
      `;
    }).join('');
  }

  function renderBadgesTable() {
    elements.badgesTableBody.innerHTML = state.badges.map(function (badge, index) {
      return `
        <tr>
          <td>${index + 1}</td>
          <td><input type="text" data-badge-name="${escapeHtml(badge.id)}" value="${escapeHtml(badge.badge_name)}" /></td>
          <td><textarea data-badge-rule="${escapeHtml(badge.id)}">${escapeHtml(badge.rule_text)}</textarea></td>
          <td>
            <select data-badge-active="${escapeHtml(badge.id)}">
              <option value="true" ${badge.is_active ? 'selected' : ''}>启用</option>
              <option value="false" ${badge.is_active ? '' : 'selected'}>停用</option>
            </select>
          </td>
        </tr>
      `;
    }).join('');
  }

  function renderTeacherSelect() {
    if (!state.teachers.length) {
      elements.accountTeacherSelect.innerHTML = '<option value="">暂无老师</option>';
      return;
    }

    elements.accountTeacherSelect.innerHTML = ['<option value="">请选择老师</option>'].concat(
      state.teachers.map(function (teacher) {
        const campusName = teacher.campus_id ? ` · ${teacher.campus_name || '已绑定校区'}` : '';
        return `<option value="${escapeHtml(teacher.id)}">${escapeHtml(teacher.display_name || teacher.name)}${escapeHtml(campusName)}</option>`;
      })
    ).join('');

    if (state.selectedTeacherId) {
      elements.accountTeacherSelect.value = state.selectedTeacherId;
    }
  }

  function renderTeacherAccounts() {
    const accounts = Array.isArray(state.teacherAccounts) ? state.teacherAccounts : [];
    elements.teacherAccountCount.textContent = String(accounts.length);

    if (!accounts.length) {
      elements.teacherAccountsBody.innerHTML = '<tr><td colspan="7"><div class="empty-state">当前还没有开通老师账号。</div></td></tr>';
      return;
    }

    elements.teacherAccountsBody.innerHTML = accounts.map(function (account) {
      const teacherName = account.teacher?.display_name || account.teacher?.name || account.display_name || '未绑定老师';
      const lastLogin = account.last_sign_in_at ? new Date(account.last_sign_in_at).toLocaleString('zh-CN') : '从未登录';
      return `
        <tr>
          <td>
            <div class="admin-category-cell">
              <strong>${escapeHtml(teacherName)}</strong>
              <span>${escapeHtml(account.teacher?.campuses?.name || '未绑定校区')}</span>
            </div>
          </td>
          <td>${escapeHtml(account.login_name || '-')}</td>
          <td>${escapeHtml(account.phone || '-')}</td>
          <td>${account.is_active ? '<span class="student-status-badge is-normal">启用</span>' : '<span class="student-status-badge is-merged">停用</span>'}</td>
          <td>${account.must_change_password ? '<span class="student-risk-badge is-medium">需改密</span>' : '<span class="student-risk-badge is-none">已通过</span>'}</td>
          <td>${escapeHtml(lastLogin)}</td>
          <td>
            <div class="admin-account-actions">
              <button class="ghost-button" type="button" data-account-edit="${escapeHtml(account.id)}">编辑</button>
              <button class="inline-button" type="button" data-account-reset="${escapeHtml(account.id)}">重置为 666666</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function renderAll() {
    renderLevelTable();
    renderPointRulesTable();
    renderBadgesTable();
    renderTeacherSelect();
    renderTeacherAccounts();
  }

  function readLevelTiers() {
    return state.levelTiers.map(function (tier) {
      const levelNo = tier.level_no;
      const nameInput = document.querySelector(`[data-tier-name="${levelNo}"]`);
      const thresholdInput = document.querySelector(`[data-tier-threshold="${levelNo}"]`);
      return {
        id: tier.id || undefined,
        level_no: levelNo,
        level_name: (nameInput?.value || '').trim() || `${levelNo}段`,
        threshold: Math.max(0, Number(thresholdInput?.value || 0)),
        is_active: true
      };
    });
  }

  function readPointRules() {
    return sortPointRules(state.pointRules.map(function (rule) {
      return {
        id: rule.id,
        category: rule.category,
        rule_name: (document.querySelector(`[data-rule-name="${rule.id}"]`)?.value || '').trim() || '未命名规则',
        points: Number(document.querySelector(`[data-rule-points="${rule.id}"]`)?.value || 0),
        sort_order: Number(document.querySelector(`[data-rule-sort="${rule.id}"]`)?.value || 0),
        is_active: document.querySelector(`[data-rule-active="${rule.id}"]`)?.value === 'true',
        is_common: document.querySelector(`[data-rule-common="${rule.id}"]`)?.value === 'true'
      };
    }));
  }

  function readBadges() {
    return state.badges.map(function (badge, index) {
      return {
        id: badge.id,
        badge_name: (document.querySelector(`[data-badge-name="${badge.id}"]`)?.value || '').trim() || `徽章 ${index + 1}`,
        rule_text: (document.querySelector(`[data-badge-rule="${badge.id}"]`)?.value || '').trim() || '待补充规则',
        is_active: document.querySelector(`[data-badge-active="${badge.id}"]`)?.value === 'true',
        sort_order: badge.sort_order || (index + 1) * 10
      };
    });
  }

  function validateLevelTiers(levelTiers) {
    for (let index = 1; index < levelTiers.length; index += 1) {
      if (Number(levelTiers[index].threshold) < Number(levelTiers[index - 1].threshold)) {
        return `第 ${levelTiers[index].level_no} 段最低积分不能小于第 ${levelTiers[index - 1].level_no} 段。`;
      }
    }
    return '';
  }

  function resetTeacherAccountForm() {
    state.selectedTeacherId = '';
    elements.teacherAccountForm.reset();
    elements.accountPasswordInput.value = '666666';
    elements.accountMustChangePasswordSelect.value = 'true';
    elements.accountActiveSelect.value = 'true';
    renderTeacherSelect();
  }

  function prefillTeacherAccountForm(teacherId) {
    state.selectedTeacherId = teacherId;
    renderTeacherSelect();
    const teacher = state.teachers.find(function (item) {
      return item.id === teacherId;
    });
    const account = state.teacherAccounts.find(function (item) {
      return item.teacher_id === teacherId;
    });
    const teacherIndex = state.teachers.findIndex(function (item) {
      return item.id === teacherId;
    });

    if (!teacher) {
      return;
    }

    elements.accountDisplayNameInput.value = account?.display_name || teacher.display_name || teacher.name || '';
    elements.accountPhoneInput.value = account?.phone || teacher.phone || '';
    elements.accountLoginNameInput.value = suggestAccountName(account, teacher, teacherIndex < 0 ? 0 : teacherIndex);
    elements.accountMustChangePasswordSelect.value = String(account?.must_change_password !== false);
    elements.accountActiveSelect.value = String(account?.is_active !== false);
    elements.accountPasswordInput.value = '666666';
  }

  async function seedDefaultsIfNeeded(levelTiers, pointRules) {
    const needsLevelSeed = !levelTiers.length;
    const needsRuleSeed = (pointRules || []).length < DEFAULT_POINT_RULES.length;

    if (!needsLevelSeed && !needsRuleSeed) {
      return { levelTiers, pointRules, seeded: false };
    }

    const nextLevelTiers = needsLevelSeed ? await upsertLevelTiers(DEFAULT_LEVEL_TIERS) : levelTiers;
    const nextPointRules = needsRuleSeed ? await upsertPointRules(DEFAULT_POINT_RULES) : pointRules;
    return { levelTiers: nextLevelTiers, pointRules: nextPointRules, seeded: true };
  }

  async function loadConfig() {
    state.isLoading = true;

    if (!isSupabaseConfigured) {
      renderAll();
      elements.saveConfigButton.disabled = true;
      elements.resetConfigButton.disabled = true;
      showNotice('缺少 Supabase 配置，请先在 .env 中填写 SUPABASE_URL 和 SUPABASE_ANON_KEY。', 'error');
      state.isLoading = false;
      return;
    }

    try {
      const [rawLevelTiers, rawPointRules, rawCampuses, rawTeachers, rawTeacherAccounts] = await Promise.all([
        fetchLevelTiers().catch(function () { return []; }),
        fetchAdminPointRules().catch(function () { return []; }),
        fetchCampuses().catch(function () { return []; }),
        fetchTeachers(),
        fetchTeacherAccountDirectory().catch(function () { return []; })
      ]);
      const campusMap = new Map((rawCampuses || []).map(function (campus) {
        return [campus.id, campus.name];
      }));

      const seeded = await seedDefaultsIfNeeded(rawLevelTiers, rawPointRules);
      state.levelTiers = normalizeLevelTiers(seeded.levelTiers);
      state.pointRules = normalizePointRules(seeded.pointRules);
      state.badges = loadBadgeRulesFromStorage();
      state.teachers = rawTeachers.map(function (teacher) {
        return {
          ...teacher,
          campus_name: teacher.campus_name || campusMap.get(teacher.campus_id) || ''
        };
      });
      state.teacherAccounts = Array.isArray(rawTeacherAccounts) ? rawTeacherAccounts : [];
      renderAll();
      if (seeded.seeded) {
        showNotice('已自动写入试运行默认段位和积分规则。', 'success');
      }
    } catch (error) {
      renderAll();
      showNotice(`配置读取失败：${error.message}`, 'error');
    } finally {
      state.isLoading = false;
    }
  }

  async function reloadTeacherAccounts() {
    state.teacherAccounts = await fetchTeacherAccountDirectory().catch(function () {
      return [];
    });
    renderTeacherAccounts();
  }

  async function handleSave() {
    if (!isSupabaseConfigured || state.isSaving || state.isLoading) {
      return;
    }

    const nextLevelTiers = readLevelTiers();
    const validationError = validateLevelTiers(nextLevelTiers);
    if (validationError) {
      showNotice(validationError, 'error');
      return;
    }

    const nextPointRules = readPointRules();
    const nextBadges = normalizeBadgeRules(readBadges());

    try {
      setConfigBusy(true, '保存中...');
      const [savedLevelTiers, savedPointRules] = await Promise.all([
        upsertLevelTiers(nextLevelTiers),
        upsertPointRules(nextPointRules)
      ]);
      saveBadgeRulesToStorage(nextBadges);
      state.levelTiers = normalizeLevelTiers(savedLevelTiers);
      state.pointRules = normalizePointRules(savedPointRules);
      state.badges = nextBadges;
      renderAll();
      showNotice('段位、积分规则和试运行徽章规则已保存。', 'success');
    } catch (error) {
      showNotice(`保存失败：${error.message}`, 'error');
    } finally {
      setConfigBusy(false, '保存配置');
    }
  }

  async function handleResetDefaults() {
    if (!isSupabaseConfigured || state.isSaving || state.isLoading) {
      return;
    }

    try {
      setConfigBusy(true, '恢复中...');
      const [savedLevelTiers, savedPointRules] = await Promise.all([
        upsertLevelTiers(DEFAULT_LEVEL_TIERS),
        upsertPointRules(DEFAULT_POINT_RULES)
      ]);
      state.levelTiers = normalizeLevelTiers(savedLevelTiers);
      state.pointRules = normalizePointRules(savedPointRules);
      state.badges = normalizeBadgeRules(DEFAULT_BADGE_RULES);
      saveBadgeRulesToStorage(state.badges);
      renderAll();
      showNotice('试运行默认值已恢复。', 'success');
    } catch (error) {
      showNotice(`恢复默认失败：${error.message}`, 'error');
    } finally {
      setConfigBusy(false, '保存配置');
    }
  }

  async function handleTeacherAccountSave(event) {
    event.preventDefault();
    if (state.isSavingAccount) {
      return;
    }

    const teacherId = elements.accountTeacherSelect.value;
    const loginName = elements.accountLoginNameInput.value.trim();
    const displayName = elements.accountDisplayNameInput.value.trim();
    const phone = elements.accountPhoneInput.value.trim();
    const password = elements.accountPasswordInput.value.trim();
    const mustChangePassword = elements.accountMustChangePasswordSelect.value === 'true';
    const isActive = elements.accountActiveSelect.value === 'true';

    if (!teacherId || !loginName || !displayName || !phone || password.length < 6) {
      showNotice('请先完整填写老师账号信息。', 'error');
      return;
    }

    try {
      setAccountBusy(true);
      await saveTeacherAccount({
        teacherId,
        loginName,
        displayName,
        phone,
        password,
        mustChangePassword,
        isActive
      });
      await reloadTeacherAccounts();
      prefillTeacherAccountForm(teacherId);
      showNotice(`老师账号已保存：${loginName}`, 'success');
    } catch (error) {
      showNotice(`老师账号保存失败：${error.message}`, 'error');
    } finally {
      setAccountBusy(false);
    }
  }

  async function handleAccountTableClick(event) {
    const editButton = event.target.closest('[data-account-edit]');
    if (editButton) {
      const account = state.teacherAccounts.find(function (item) {
        return item.id === editButton.dataset.accountEdit;
      });
      if (account?.teacher_id) {
        prefillTeacherAccountForm(account.teacher_id);
      }
      return;
    }

    const resetButton = event.target.closest('[data-account-reset]');
    if (!resetButton) {
      return;
    }

    try {
      await resetTeacherAccountPassword({
        userId: resetButton.dataset.accountReset,
        password: '666666',
        mustChangePassword: true
      });
      await reloadTeacherAccounts();
      showNotice('密码已重置为 666666，并要求首次登录修改密码。', 'success');
    } catch (error) {
      showNotice(`重置密码失败：${error.message}`, 'error');
    }
  }

  elements.saveConfigButton.addEventListener('click', handleSave);
  elements.resetConfigButton.addEventListener('click', handleResetDefaults);
  elements.resetAllDataButton.addEventListener('click', function () {
    state.badges = normalizeBadgeRules(DEFAULT_BADGE_RULES);
    saveBadgeRulesToStorage(state.badges);
    renderBadgesTable();
    showNotice('徽章规则已恢复到试运行默认值。', 'success');
  });
  elements.accountTeacherSelect.addEventListener('change', function (event) {
    const teacherId = event.target.value;
    if (teacherId) {
      prefillTeacherAccountForm(teacherId);
    }
  });
  elements.teacherAccountResetButton.addEventListener('click', resetTeacherAccountForm);
  elements.teacherAccountForm.addEventListener('submit', handleTeacherAccountSave);
  elements.teacherAccountsBody.addEventListener('click', handleAccountTableClick);

  renderAll();
  resetTeacherAccountForm();
  loadConfig();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAdminPage, { once: true });
} else {
  initAdminPage();
}


