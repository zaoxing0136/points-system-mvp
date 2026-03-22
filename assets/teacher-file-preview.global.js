(function () {
  if (window.location.protocol !== 'file:' || !window.FileAvatarPreview) {
    return;
  }

  const helpers = window.FileAvatarPreview;
  const CATEGORY_META = helpers.CATEGORY_META;
  const createAvatarHtml = helpers.createAvatarHtml;
  const escapeHtml = helpers.escapeHtml;
  const formatDateTime = helpers.formatDateTime;
  const getStudentDisplayName = helpers.getStudentDisplayName;
  const getTierProgress = helpers.getTierProgress;
  const normalizeTierList = helpers.normalizeTierList;
  const buildPreviewStudents = helpers.buildPreviewStudents;

  const LEVEL_TIERS = normalizeTierList([
    { level_name: '新芽', threshold: 0 },
    { level_name: '启航', threshold: 80 },
    { level_name: '探索者', threshold: 150 },
    { level_name: '发光体', threshold: 240 },
    { level_name: '领航员', threshold: 340 }
  ]);

  const PREVIEW_RULES = {
    classroom: [
      { id: 'focus', rule_name: '专注发言', points: 2, is_common: true },
      { id: 'teamwork', rule_name: '合作互助', points: 3, is_common: true },
      { id: 'brave', rule_name: '主动尝试', points: 2 },
      { id: 'question', rule_name: '会提问题', points: 1 }
    ],
    homework: [
      { id: 'finish', rule_name: '按时完成', points: 2, is_common: true },
      { id: 'neat', rule_name: '整理清楚', points: 1 },
      { id: 'extra', rule_name: '主动加练', points: 3 }
    ],
    project: [
      { id: 'idea', rule_name: '创意表达', points: 3, is_common: true },
      { id: 'share', rule_name: '完成展示', points: 2 },
      { id: 'build', rule_name: '作品搭建', points: 4 }
    ],
    habits: [
      { id: 'prepare', rule_name: '课前准备', points: 1 },
      { id: 'clean', rule_name: '收纳整理', points: 1 },
      { id: 'persist', rule_name: '持续坚持', points: 2, is_common: true }
    ]
  };

  function buildPreviewRecords(student) {
    const baseTime = new Date(student.created_at || Date.now()).getTime();
    return [
      { rule_name_snapshot: '专注发言', category_snapshot: 'classroom', points_delta: 2, action_type: 'add', created_at: new Date(baseTime + 86400000).toISOString(), remark: '回答问题很完整' },
      { rule_name_snapshot: '作品搭建', category_snapshot: 'project', points_delta: 4, action_type: 'add', created_at: new Date(baseTime + 172800000).toISOString(), remark: '完成小车结构搭建' },
      { rule_name_snapshot: '积分兑换', category_snapshot: 'project', points_delta: -6, action_type: 'deduct', created_at: new Date(baseTime + 259200000).toISOString(), remark: '兑换贴纸礼包' }
    ];
  }

  document.addEventListener('DOMContentLoaded', function () {
    const elements = {
      fileModeNotice: document.getElementById('fileModeNotice'),
      campusSelect: document.getElementById('campusSelect'),
      classSelect: document.getElementById('classSelect'),
      campusRail: document.getElementById('campusRail'),
      classRail: document.getElementById('classRail'),
      classMeta: document.getElementById('classMeta'),
      studentGrid: document.getElementById('studentGrid'),
      studentCount: document.getElementById('studentCount'),
      classPoints: document.getElementById('classPoints'),
      selectedState: document.getElementById('selectedState'),
      selectionHint: document.getElementById('selectionHint'),
      teacherInlineNotice: document.getElementById('teacherInlineNotice'),
      teacherPanel: document.getElementById('teacherPanel'),
      panelEmptyState: document.getElementById('panelEmptyState'),
      panelContent: document.getElementById('panelContent'),
      studentSpotlight: document.getElementById('studentSpotlight'),
      categoryTabs: document.getElementById('categoryTabs'),
      activeCategoryTitle: document.getElementById('activeCategoryTitle'),
      activeCategoryTip: document.getElementById('activeCategoryTip'),
      actionCards: document.getElementById('actionCards'),
      studentRecordList: document.getElementById('studentRecordList')
    };

    const roster = buildPreviewStudents(10, 0).map(function (student, index) {
      student.total_points = 128 + index * 21;
      student.class_name = '启航探索班';
      student.campus_name = '星河校区';
      return student;
    });

    const state = { roster: roster, selectedStudentId: roster[0] ? roster[0].student_id : null, activeCategory: 'classroom' };

    function getSelectedStudent() {
      return state.roster.find(function (student) { return student.student_id === state.selectedStudentId; }) || null;
    }

    function renderStudents() {
      elements.studentGrid.innerHTML = state.roster.map(function (student) {
        const progress = getTierProgress(Number(student.total_points || 0), LEVEL_TIERS);
        const isActive = student.student_id === state.selectedStudentId;
        const nextTierText = progress.nextTier ? '距 ' + progress.nextTier.name + ' ' + progress.distance + ' 分' : '已到最高段位';
        return '\n          <button class="student-card teacher-student-card ' + (isActive ? 'is-active' : '') + '" type="button" data-student-id="' + escapeHtml(student.student_id) + '">\n            <div class="teacher-student-header">\n              <div class="teacher-student-main">\n                ' + createAvatarHtml(student) + '\n                <div>\n                  <h3>' + escapeHtml(getStudentDisplayName(student)) + '</h3>\n                  <p>' + escapeHtml(student.grade || student.student_code || '未设置年级') + '</p>\n                </div>\n              </div>\n              <div class="teacher-student-badges">\n                <span class="tag-pill">' + escapeHtml(progress.currentTier.name) + '</span>\n                <span class="point-pill">' + escapeHtml(student.total_points) + ' 分</span>\n              </div>\n            </div>\n            <p class="teacher-student-meta">' + escapeHtml(nextTierText) + '</p>\n          </button>\n        ';
      }).join('');
    }

    function renderSpotlight(student) {
      const progress = getTierProgress(Number(student.total_points || 0), LEVEL_TIERS);
      const nextLabel = progress.nextTier ? '下一段 ' + progress.nextTier.name : '当前已是最高段位';
      const distanceLabel = progress.nextTier ? '还差 ' + progress.distance + ' 分' : '继续保持';
      elements.studentSpotlight.innerHTML = '\n        <div class="student-spotlight__hero">\n          <div class="student-spotlight__identity">\n            ' + createAvatarHtml(student, 'large') + '\n            <div>\n              <p class="eyebrow teacher-spotlight-eyebrow">Local Preview</p>\n              <h2>' + escapeHtml(getStudentDisplayName(student)) + '</h2>\n              <p>' + escapeHtml(student.campus_name) + ' · ' + escapeHtml(student.class_name) + '</p>\n            </div>\n          </div>\n          <div class="student-score-card">\n            <span class="student-score-card__label">当前总分</span>\n            <strong>' + escapeHtml(student.total_points) + '</strong>\n            <span class="student-score-card__delta">预览数据</span>\n          </div>\n        </div>\n        <div class="student-spotlight__chips">\n          <span class="tag-pill teacher-contrast-pill">' + escapeHtml(progress.currentTier.name) + '</span>\n          <span class="status-pill teacher-contrast-pill">' + escapeHtml(distanceLabel) + '</span>\n          <span class="status-pill teacher-contrast-pill">' + escapeHtml(nextLabel) + '</span>\n        </div>\n        <div class="student-progress">\n          <div class="student-progress__row">\n            <span>升级进度</span>\n            <strong>' + Math.round(progress.progress) + '%</strong>\n          </div>\n          <div class="student-progress__track">\n            <span class="student-progress__fill" style="width:' + progress.progress + '%"></span>\n          </div>\n        </div>\n      ';
    }

    function renderTabs() {
      const categoryKeys = Object.keys(PREVIEW_RULES);
      elements.categoryTabs.innerHTML = categoryKeys.map(function (category) {
        const meta = CATEGORY_META[category] || { label: category, shortLabel: category };
        const isActive = category === state.activeCategory;
        return '\n          <button class="teacher-tab ' + (isActive ? 'is-active' : '') + '" type="button" data-category="' + escapeHtml(category) + '">\n            <strong>' + escapeHtml(meta.shortLabel || meta.label) + '</strong>\n            <span>' + escapeHtml(meta.label) + '</span>\n          </button>\n        ';
      }).join('');
      const activeMeta = CATEGORY_META[state.activeCategory] || { label: state.activeCategory };
      elements.activeCategoryTitle.textContent = activeMeta.label;
      elements.activeCategoryTip.textContent = '本地预览只展示样例操作卡';
    }

    function renderActionCards() {
      const rules = PREVIEW_RULES[state.activeCategory] || [];
      elements.actionCards.innerHTML = rules.map(function (rule, index) {
        const helperText = rule.is_common || index < 2 ? '高频' : '即点即加';
        const actionBadge = rule.is_common || index < 2 ? '<span class="teacher-action-badge">常用</span>' : '';
        return '\n          <button class="teacher-action-card ' + ((rule.is_common || index < 2) ? 'is-high-frequency' : '') + '" type="button" disabled>\n            <div class="teacher-action-card__top">\n              <strong>' + escapeHtml(rule.rule_name) + '</strong>\n              ' + actionBadge + '\n            </div>\n            <div class="teacher-action-card__points">\n              <span>+' + escapeHtml(rule.points) + '</span>\n              <em>分</em>\n            </div>\n            <p>' + escapeHtml(helperText) + '</p>\n          </button>\n        ';
      }).join('');
    }

    function renderRecords(student) {
      elements.studentRecordList.innerHTML = buildPreviewRecords(student).map(function (record) {
        const categoryLabel = record.action_type === 'deduct' ? '积分兑换' : ((CATEGORY_META[record.category_snapshot] || {}).label || record.category_snapshot);
        const score = Number(record.points_delta || 0);
        const scoreText = (score > 0 ? '+' : '') + score;
        const typeLabel = record.action_type === 'deduct' ? '兑换扣分' : '加分';
        const detail = record.remark ? '<p class="teacher-record-detail">' + escapeHtml(record.remark) + '</p>' : '';
        return '\n          <article class="teacher-record-item">\n            <div class="teacher-record-text">\n              <h4>' + escapeHtml(record.rule_name_snapshot) + '</h4>\n              <p>' + escapeHtml(categoryLabel) + ' · ' + escapeHtml(formatDateTime(record.created_at)) + '</p>\n              ' + detail + '\n            </div>\n            <div class="teacher-record-score ' + (score < 0 ? 'is-negative' : '') + '">\n              <strong>' + escapeHtml(scoreText) + '</strong>\n              <span>' + escapeHtml(typeLabel) + '</span>\n            </div>\n          </article>\n        ';
      }).join('');
    }

    function renderAll() {
      const selectedStudent = getSelectedStudent() || state.roster[0] || null;
      if (!selectedStudent) {
        return;
      }
      state.selectedStudentId = selectedStudent.student_id;
      elements.studentCount.textContent = String(state.roster.length);
      elements.classPoints.textContent = String(state.roster.reduce(function (total, student) { return total + Number(student.total_points || 0); }, 0));
      elements.selectedState.textContent = '当前预览：' + getStudentDisplayName(selectedStudent);
      elements.selectionHint.hidden = false;
      elements.selectionHint.textContent = '本地预览可切换学生，直接检查新头像在老师页的小尺寸表现。';
      renderStudents();
      renderSpotlight(selectedStudent);
      renderTabs();
      renderActionCards();
      renderRecords(selectedStudent);
    }

    if (elements.fileModeNotice) {
      elements.fileModeNotice.hidden = false;
      elements.fileModeNotice.textContent = '当前是本地预览模式，页面已使用静态示例数据展示新头像系统。';
    }
    if (elements.teacherInlineNotice) {
      elements.teacherInlineNotice.hidden = false;
      elements.teacherInlineNotice.dataset.type = 'info';
      elements.teacherInlineNotice.textContent = '真实加分、建班、搜索加人仍需本地服务；此处主要用于验证头像审美与小尺寸清晰度。';
    }
    if (elements.campusSelect) {
      elements.campusSelect.innerHTML = '<option value="preview-campus">星河校区（本地预览）</option>';
      elements.campusSelect.disabled = true;
    }
    if (elements.classSelect) {
      elements.classSelect.innerHTML = '<option value="preview-class">启航探索班（本地预览）</option>';
      elements.classSelect.disabled = true;
    }
    if (elements.campusRail) {
      elements.campusRail.innerHTML = '<button class="teacher-filter-chip is-active" type="button">星河校区</button>';
    }
    if (elements.classRail) {
      elements.classRail.innerHTML = '<button class="teacher-filter-chip teacher-filter-chip--class is-active" type="button"><strong>启航探索班</strong><span>静态预览</span></button>';
    }
    if (elements.classMeta) {
      elements.classMeta.innerHTML = '<span class="teacher-class-chip">启航探索班</span><span class="teacher-class-chip">创意编程</span><span class="teacher-class-chip">周三 19:00</span>';
    }
    if (elements.teacherPanel) {
      elements.teacherPanel.setAttribute('aria-hidden', 'false');
    }
    if (elements.panelEmptyState) {
      elements.panelEmptyState.hidden = true;
    }
    if (elements.panelContent) {
      elements.panelContent.hidden = false;
    }

    ['openCreateClassButton', 'openAddStudentButton', 'classBoostToggleButton', 'removeSelectedStudentButton', 'openRedeemButton'].forEach(function (id) {
      const button = document.getElementById(id);
      if (button) {
        button.disabled = true;
      }
    });

    elements.studentGrid.addEventListener('click', function (event) {
      const button = event.target.closest('[data-student-id]');
      if (!button) {
        return;
      }
      state.selectedStudentId = button.dataset.studentId;
      renderAll();
    });

    elements.categoryTabs.addEventListener('click', function (event) {
      const button = event.target.closest('[data-category]');
      if (!button) {
        return;
      }
      state.activeCategory = button.dataset.category;
      renderTabs();
      renderActionCards();
    });

    renderAll();
  });
})();
