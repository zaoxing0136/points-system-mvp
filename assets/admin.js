import { isSupabaseConfigured } from './supabase-client.js';
import {
  fetchAdminPointRules,
  fetchBadgeDefinitions,
  fetchBadgeLeaderboard,
  fetchLevelTiers,
  fetchTeacherAccountDirectory,
  upsertBadgeDefinitions,
  upsertLevelTiers,
  upsertPointRules,
  resetTeacherAccountPassword,
  saveTeacherAccount
} from './supabase-service.js';
import { CATEGORY_META, escapeHtml, formatDateTime } from './shared-ui.js';
import {
  DEFAULT_BADGE_DEFINITIONS,
  DEFAULT_LEVEL_TIERS,
  DEFAULT_POINT_RULES
} from './default-config.js';

const CATEGORY_ORDER = ['classroom', 'homework', 'project', 'habits'];

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

function sortBadgeDefinitions(rows) {
  return rows.slice().sort(function (left, right) {
    if (Number(left.sort_order || 0) !== Number(right.sort_order || 0)) {
      return Number(left.sort_order || 0) - Number(right.sort_order || 0);
    }
    return String(left.name || '').localeCompare(String(right.name || ''), 'zh-CN');
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

function normalizeBadgeDefinitions(rows) {
  const source = Array.isArray(rows) && rows.length ? rows : DEFAULT_BADGE_DEFINITIONS;
  return sortBadgeDefinitions(source.map(function (badge, index) {
    return {
      id: badge.id || null,
      code: String(badge.code || `badge_${index + 1}`).trim() || `badge_${index + 1}`,
      name: String(badge.name || badge.badge_name || `徽章 ${index + 1}`).trim() || `徽章 ${index + 1}`,
      description: String(badge.description || badge.rule_text || '').trim(),
      event_label: String(badge.event_label || badge.behavior_label || badge.rule || badge.name || '').trim() || `行为 ${index + 1}`,
      icon_token: String(badge.icon_token || badge.icon || '').trim(),
      threshold: Math.max(1, Number(badge.threshold || 1)),
      is_active: badge.is_active !== false,
      sort_order: Number(badge.sort_order || (index + 1) * 10),
      created_at: badge.created_at || null,
      updated_at: badge.updated_at || null
    };
  }));
}

function initAdminPage() {
  const elements = {
    tiersTableBody: document.getElementById('tiersTableBody'),
    buttonsTableBody: document.getElementById('buttonsTableBody'),
    badgesTableBody: document.getElementById('badgesTableBody'),
    badgeResultsBody: document.getElementById('badgeResultsBody'),
    saveConfigButton: document.getElementById('saveConfigButton'),
    resetConfigButton: document.getElementById('resetConfigButton'),
    resetAllDataButton: document.getElementById('resetAllDataButton'),
    adminNotice: document.getElementById('adminNotice'),
    teacherAccountCount: document.getElementById('teacherAccountCount'),
    badgeDefinitionCount: document.getElementById('badgeDefinitionCount'),
    teacherAccountForm: document.getElementById('teacherAccountForm'),
    accountUserIdInput: document.getElementById('accountUserIdInput'),
    teacherAccountFormTitle: document.getElementById('teacherAccountFormTitle'),
    teacherAccountFormHint: document.getElementById('teacherAccountFormHint'),
    teacherAccountPreviewLogin: document.getElementById('teacherAccountPreviewLogin'),
    teacherAccountPreviewEmail: document.getElementById('teacherAccountPreviewEmail'),
    teacherAccountPreviewPassword: document.getElementById('teacherAccountPreviewPassword'),
    accountLoginNameInput: document.getElementById('accountLoginNameInput'),
    accountDisplayNameInput: document.getElementById('accountDisplayNameInput'),
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
    badges: normalizeBadgeDefinitions([]),
    badgeResults: [],
    teacherAccounts: [],
    isSaving: false,
    isLoading: false,
    isSavingAccount: false,
    selectedAccountId: ''
  };

  function getTeacherAccountButtonLabel() {
    return state.selectedAccountId ? '保存账号修改' : '创建老师账号';
  }

  function normalizeLoginName(value) {
    return String(value || '').trim().toLowerCase();
  }

  function buildTeacherAccountEmail(loginName) {
    const normalized = normalizeLoginName(loginName);
    return normalized ? normalized + '@accounts.points-mvp.local' : '保存后自动生成';
  }

  function syncTeacherAccountPreview() {
    const isEditing = Boolean(state.selectedAccountId);
    const loginName = normalizeLoginName(elements.accountLoginNameInput.value);
    const password = (elements.accountPasswordInput.value || '').trim() || '666666';
    elements.teacherAccountFormTitle.textContent = isEditing ? '编辑老师账号' : '创建老师账号';
    elements.teacherAccountFormHint.textContent = isEditing
      ? '修改账号名、密码或启停状态。老师仍然不绑定固定校区。'
      : '只填老师名称、账号名和初始密码。保存后系统自动生成登录邮箱映射。';
    elements.teacherAccountPreviewLogin.textContent = loginName || '待输入';
    elements.teacherAccountPreviewEmail.textContent = buildTeacherAccountEmail(loginName);
    elements.teacherAccountPreviewPassword.textContent = password;
    elements.teacherAccountSaveButton.textContent = getTeacherAccountButtonLabel();
  }

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
    elements.teacherAccountResetButton.disabled = isBusy;
    elements.teacherAccountSaveButton.textContent = isBusy ? '保存中...' : getTeacherAccountButtonLabel();
  }

  function renderOverview() {
    if (elements.teacherAccountCount) {
      elements.teacherAccountCount.textContent = String(state.teacherAccounts.length);
    }
    if (elements.badgeDefinitionCount) {
      elements.badgeDefinitionCount.textContent = String(state.badges.length);
    }
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
      const key = escapeHtml(badge.code);
      return `
        <tr>
          <td><input type="number" min="1" step="1" data-badge-sort="${key}" value="${escapeHtml(String(badge.sort_order))}" /></td>
          <td><input type="text" data-badge-name="${key}" value="${escapeHtml(badge.name)}" /></td>
          <td><input type="text" data-badge-event="${key}" value="${escapeHtml(badge.event_label)}" /></td>
          <td><input type="number" min="1" step="1" data-badge-threshold="${key}" value="${escapeHtml(String(badge.threshold))}" /></td>
          <td><textarea data-badge-description="${key}" rows="2">${escapeHtml(badge.description)}</textarea></td>
          <td>
            <select data-badge-active="${key}">
              <option value="true" ${badge.is_active ? 'selected' : ''}>启用</option>
              <option value="false" ${badge.is_active ? '' : 'selected'}>停用</option>
            </select>
          </td>
        </tr>
      `;
    }).join('');
  }

  function renderBadgeResults() {
    if (!elements.badgeResultsBody) {
      return;
    }

    if (!state.badgeResults.length) {
      elements.badgeResultsBody.innerHTML = '<tr><td colspan="5"><div class="empty-state">当前还没有真实徽章结果。老师记录行为后，这里会实时显示。</div></td></tr>';
      return;
    }

    elements.badgeResultsBody.innerHTML = state.badgeResults.map(function (row) {
      const studentName = row.display_name || row.legal_name || '未命名学生';
      const badgeNames = row.unlocked_badge_names || '尚未解锁';
      const latestUnlock = row.latest_unlocked_at ? formatDateTime(row.latest_unlocked_at) : '尚未解锁';
      return `
        <tr>
          <td>
            <div class="admin-account-name">
              <strong>${escapeHtml(studentName)}</strong>
              <span>${escapeHtml(row.grade || row.student_code || '')}</span>
            </div>
          </td>
          <td>${escapeHtml(badgeNames)}</td>
          <td>${escapeHtml(String(row.unlocked_count || 0))}</td>
          <td>${escapeHtml(String(row.event_count || 0))}</td>
          <td>${escapeHtml(latestUnlock)}</td>
        </tr>
      `;
    }).join('');
  }

  function renderTeacherAccounts() {
    const accounts = Array.isArray(state.teacherAccounts) ? state.teacherAccounts : [];

    if (!accounts.length) {
      elements.teacherAccountsBody.innerHTML = '<tr><td colspan="6"><div class="empty-state">当前还没有开通老师账号，先用左侧表单创建第一位老师。</div></td></tr>';
      return;
    }

    elements.teacherAccountsBody.innerHTML = accounts.map(function (account) {
      const teacherName = account.display_name || account.teacher?.display_name || account.teacher?.name || '未命名老师';
      const lastLogin = account.last_sign_in_at ? new Date(account.last_sign_in_at).toLocaleString('zh-CN') : '尚未登录';
      return `
        <tr>
          <td>
            <div class="admin-account-name">
              <strong>${escapeHtml(teacherName)}</strong>
              <span>${escapeHtml(buildTeacherAccountEmail(account.login_name || ''))}</span>
            </div>
          </td>
          <td>${escapeHtml(account.login_name || '-')}</td>
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

  function upsertTeacherAccountState(result) {
    const profile = result?.profile;
    if (!profile?.id) {
      return;
    }

    const existing = state.teacherAccounts.find(function (account) {
      return account.id === profile.id;
    }) || {};

    const nextAccount = {
      ...existing,
      ...profile,
      login_name: result.login_name || existing.login_name || '',
      auth_email: result.auth_email || existing.auth_email || '',
      teacher: result.teacher || existing.teacher || null,
      last_sign_in_at: existing.last_sign_in_at || null
    };

    state.teacherAccounts = [nextAccount].concat(state.teacherAccounts.filter(function (account) {
      return account.id !== nextAccount.id;
    }));
    renderOverview();
    renderTeacherAccounts();
  }

  function markTeacherAccountPasswordReset(userId) {
    state.teacherAccounts = state.teacherAccounts.map(function (account) {
      if (account.id !== userId) {
        return account;
      }
      return {
        ...account,
        must_change_password: true
      };
    });
    renderTeacherAccounts();
  }

  function refreshTeacherAccountsInBackground(delayMs = 0) {
    window.clearTimeout(refreshTeacherAccountsInBackground.timer);
    refreshTeacherAccountsInBackground.timer = window.setTimeout(function () {
      reloadTeacherAccounts().catch(function () {});
    }, Math.max(0, Number(delayMs || 0)));
  }

  function refreshBadgeResultsInBackground(delayMs = 0) {
    window.clearTimeout(refreshBadgeResultsInBackground.timer);
    refreshBadgeResultsInBackground.timer = window.setTimeout(function () {
      reloadBadgeResults().catch(function () {});
    }, Math.max(0, Number(delayMs || 0)));
  }

  function renderAll() {
    renderOverview();
    renderLevelTable();
    renderPointRulesTable();
    renderBadgesTable();
    renderBadgeResults();
    renderTeacherAccounts();
    syncTeacherAccountPreview();
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
    return sortBadgeDefinitions(state.badges.map(function (badge, index) {
      const key = badge.code;
      return {
        id: badge.id || undefined,
        code: key,
        name: (document.querySelector(`[data-badge-name="${key}"]`)?.value || '').trim() || `徽章 ${index + 1}`,
        description: (document.querySelector(`[data-badge-description="${key}"]`)?.value || '').trim(),
        event_label: (document.querySelector(`[data-badge-event="${key}"]`)?.value || '').trim() || `行为 ${index + 1}`,
        icon_token: badge.icon_token || '',
        threshold: Math.max(1, Number(document.querySelector(`[data-badge-threshold="${key}"]`)?.value || 1)),
        is_active: document.querySelector(`[data-badge-active="${key}"]`)?.value === 'true',
        sort_order: Number(document.querySelector(`[data-badge-sort="${key}"]`)?.value || ((index + 1) * 10))
      };
    }));
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
    state.selectedAccountId = '';
    elements.accountUserIdInput.value = '';
    elements.teacherAccountForm.reset();
    elements.accountPasswordInput.value = '666666';
    elements.accountMustChangePasswordSelect.value = 'true';
    elements.accountActiveSelect.value = 'true';
    syncTeacherAccountPreview();
  }

  function prefillTeacherAccountForm(accountId) {
    const account = state.teacherAccounts.find(function (item) {
      return item.id === accountId;
    });

    if (!account) {
      resetTeacherAccountForm();
      return;
    }

    state.selectedAccountId = account.id;
    elements.accountUserIdInput.value = account.id;
    elements.accountDisplayNameInput.value = account.display_name || account.teacher?.display_name || account.teacher?.name || '';
    elements.accountLoginNameInput.value = account.login_name || '';
    elements.accountMustChangePasswordSelect.value = String(account.must_change_password !== false);
    elements.accountActiveSelect.value = String(account.is_active !== false);
    elements.accountPasswordInput.value = '666666';
    syncTeacherAccountPreview();
  }

  async function seedDefaultsIfNeeded(levelTiers, pointRules, badgeDefinitions) {
    const needsLevelSeed = !levelTiers.length;
    const needsRuleSeed = (pointRules || []).length < DEFAULT_POINT_RULES.length;
    const needsBadgeSeed = (badgeDefinitions || []).length < DEFAULT_BADGE_DEFINITIONS.length;

    const nextLevelTiers = needsLevelSeed ? await upsertLevelTiers(DEFAULT_LEVEL_TIERS) : levelTiers;
    const nextPointRules = needsRuleSeed ? await upsertPointRules(DEFAULT_POINT_RULES) : pointRules;
    const nextBadgeDefinitions = needsBadgeSeed ? await upsertBadgeDefinitions(DEFAULT_BADGE_DEFINITIONS) : badgeDefinitions;

    return {
      levelTiers: nextLevelTiers,
      pointRules: nextPointRules,
      badgeDefinitions: nextBadgeDefinitions,
      seeded: needsLevelSeed || needsRuleSeed || needsBadgeSeed
    };
  }

  function shouldRetryTeacherAccountFetch(error) {
    const message = String(error?.message || error || '');
    return /401|登录态已失效|session/i.test(message);
  }

  async function fetchTeacherAccountsWithRetry() {
    let lastError = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await fetchTeacherAccountDirectory();
      } catch (error) {
        lastError = error;
        if (!shouldRetryTeacherAccountFetch(error) || attempt === 2) {
          break;
        }
        await new Promise(function (resolve) {
          window.setTimeout(resolve, 600 * (attempt + 1));
        });
      }
    }
    throw lastError || new Error('老师账号列表读取失败');
  }

  async function reloadTeacherAccounts() {
    const nextAccounts = await fetchTeacherAccountsWithRetry().catch(function () {
      return null;
    });
    if (!Array.isArray(nextAccounts)) {
      return;
    }
    state.teacherAccounts = nextAccounts;
    renderOverview();
    renderTeacherAccounts();
  }

  async function reloadBadgeResults() {
    const nextResults = await fetchBadgeLeaderboard().catch(function () {
      return null;
    });
    if (!Array.isArray(nextResults)) {
      return;
    }
    state.badgeResults = nextResults;
    renderBadgeResults();
  }

  async function loadConfig() {
    state.isLoading = true;

    if (!isSupabaseConfigured) {
      renderAll();
      elements.saveConfigButton.disabled = true;
      elements.resetConfigButton.disabled = true;
      showNotice('缺少 Supabase 配置，请先在 .env 中填写 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY。', 'error');
      state.isLoading = false;
      return;
    }

    try {
      const [
        rawLevelTiers,
        rawPointRules,
        rawBadgeDefinitions,
        rawTeacherAccounts,
        rawBadgeResults
      ] = await Promise.all([
        fetchLevelTiers().catch(function () { return []; }),
        fetchAdminPointRules().catch(function () { return []; }),
        fetchBadgeDefinitions({ activeOnly: false }).catch(function () { return []; }),
        fetchTeacherAccountsWithRetry().catch(function () { return []; }),
        fetchBadgeLeaderboard().catch(function () { return []; })
      ]);

      const seeded = await seedDefaultsIfNeeded(rawLevelTiers, rawPointRules, rawBadgeDefinitions);
      state.levelTiers = normalizeLevelTiers(seeded.levelTiers);
      state.pointRules = normalizePointRules(seeded.pointRules);
      state.badges = normalizeBadgeDefinitions(seeded.badgeDefinitions);
      state.teacherAccounts = Array.isArray(rawTeacherAccounts) ? rawTeacherAccounts : [];
      state.badgeResults = Array.isArray(rawBadgeResults) ? rawBadgeResults : [];
      renderAll();
      if (seeded.seeded) {
        refreshBadgeResultsInBackground(1000);
        showNotice('已自动写入试运营默认段位、积分规则和真实徽章规则。', 'success');
      }
    } catch (error) {
      renderAll();
      showNotice(`配置读取失败：${error.message}`, 'error');
    } finally {
      state.isLoading = false;
    }
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
    const nextBadges = readBadges();

    try {
      setConfigBusy(true, '保存中...');
      const [savedLevelTiers, savedPointRules, savedBadgeDefinitions] = await Promise.all([
        upsertLevelTiers(nextLevelTiers),
        upsertPointRules(nextPointRules),
        upsertBadgeDefinitions(nextBadges)
      ]);

      state.levelTiers = normalizeLevelTiers(savedLevelTiers);
      state.pointRules = normalizePointRules(savedPointRules);
      state.badges = normalizeBadgeDefinitions(savedBadgeDefinitions);
      renderAll();
      refreshBadgeResultsInBackground(800);
      showNotice('段位、积分规则和真实徽章规则已保存。', 'success');
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
      const [savedLevelTiers, savedPointRules, savedBadgeDefinitions] = await Promise.all([
        upsertLevelTiers(DEFAULT_LEVEL_TIERS),
        upsertPointRules(DEFAULT_POINT_RULES),
        upsertBadgeDefinitions(DEFAULT_BADGE_DEFINITIONS)
      ]);
      state.levelTiers = normalizeLevelTiers(savedLevelTiers);
      state.pointRules = normalizePointRules(savedPointRules);
      state.badges = normalizeBadgeDefinitions(savedBadgeDefinitions);
      renderAll();
      refreshBadgeResultsInBackground(800);
      showNotice('试运营默认值已恢复。', 'success');
    } catch (error) {
      showNotice(`恢复默认失败：${error.message}`, 'error');
    } finally {
      setConfigBusy(false, '保存配置');
    }
  }

  async function handleResetBadgeDefaults() {
    if (!isSupabaseConfigured || state.isSaving || state.isLoading) {
      return;
    }

    try {
      setConfigBusy(true, '恢复中...');
      const savedBadgeDefinitions = await upsertBadgeDefinitions(DEFAULT_BADGE_DEFINITIONS);
      state.badges = normalizeBadgeDefinitions(savedBadgeDefinitions);
      renderAll();
      refreshBadgeResultsInBackground(800);
      showNotice('真实徽章规则已恢复到试运营默认值。', 'success');
    } catch (error) {
      showNotice(`恢复徽章默认失败：${error.message}`, 'error');
    } finally {
      setConfigBusy(false, '保存配置');
    }
  }

  async function handleTeacherAccountSave(event) {
    event.preventDefault();
    if (state.isSavingAccount) {
      return;
    }

    const userId = elements.accountUserIdInput.value.trim();
    const loginName = normalizeLoginName(elements.accountLoginNameInput.value);
    const displayName = elements.accountDisplayNameInput.value.trim();
    const password = elements.accountPasswordInput.value.trim();
    const mustChangePassword = elements.accountMustChangePasswordSelect.value === 'true';
    const isActive = elements.accountActiveSelect.value === 'true';
    const wasEditing = Boolean(userId || state.selectedAccountId);

    elements.accountLoginNameInput.value = loginName;

    if (!loginName || !displayName || password.length < 6) {
      showNotice('请先完整填写老师名称、账号名和初始密码。', 'error');
      return;
    }

    try {
      setAccountBusy(true);
      const result = await saveTeacherAccount({
        userId,
        loginName,
        displayName,
        password,
        mustChangePassword,
        isActive
      });
      upsertTeacherAccountState(result);
      prefillTeacherAccountForm(result?.profile?.id || userId);
      showNotice(`${wasEditing ? '老师账号已更新' : '老师账号已创建'}：${loginName}`, 'success');
      refreshTeacherAccountsInBackground(1200);
    } catch (error) {
      showNotice(`老师账号保存失败：${error.message}`, 'error');
    } finally {
      setAccountBusy(false);
      syncTeacherAccountPreview();
    }
  }

  async function handleAccountTableClick(event) {
    const editButton = event.target.closest('[data-account-edit]');
    if (editButton) {
      prefillTeacherAccountForm(editButton.dataset.accountEdit);
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
      markTeacherAccountPasswordReset(resetButton.dataset.accountReset);
      if (state.selectedAccountId === resetButton.dataset.accountReset) {
        prefillTeacherAccountForm(state.selectedAccountId);
      }
      showNotice('密码已重置为 666666，并要求首次登录修改密码。', 'success');
      refreshTeacherAccountsInBackground(1200);
    } catch (error) {
      showNotice(`重置密码失败：${error.message}`, 'error');
    }
  }

  elements.saveConfigButton.addEventListener('click', handleSave);
  elements.resetConfigButton.addEventListener('click', handleResetDefaults);
  elements.resetAllDataButton.addEventListener('click', handleResetBadgeDefaults);
  elements.teacherAccountResetButton.addEventListener('click', resetTeacherAccountForm);
  elements.teacherAccountForm.addEventListener('submit', handleTeacherAccountSave);
  [
    elements.accountDisplayNameInput,
    elements.accountLoginNameInput,
    elements.accountPasswordInput,
    elements.accountMustChangePasswordSelect,
    elements.accountActiveSelect
  ].forEach(function (field) {
    field.addEventListener('input', syncTeacherAccountPreview);
    field.addEventListener('change', syncTeacherAccountPreview);
  });
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
