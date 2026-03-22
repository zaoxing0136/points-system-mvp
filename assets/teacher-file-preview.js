import {
  CATEGORY_META,
  createAvatarHtml,
  escapeHtml,
  formatDateTime,
  getStudentDisplayName,
  getTierProgress,
  normalizeTierList
} from './shared-ui.js';
import { buildPreviewStudents } from './local-avatar-preview-data.js';

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
    {
      rule_name_snapshot: '专注发言',
      category_snapshot: 'classroom',
      points_delta: 2,
      action_type: 'add',
      created_at: new Date(baseTime + 86400000).toISOString(),
      remark: '回答问题很完整'
    },
    {
      rule_name_snapshot: '作品搭建',
      category_snapshot: 'project',
      points_delta: 4,
      action_type: 'add',
      created_at: new Date(baseTime + 2 * 86400000).toISOString(),
      remark: '完成小车结构搭建'
    },
    {
      rule_name_snapshot: '积分兑换',
      category_snapshot: 'project',
      points_delta: -6,
      action_type: 'deduct',
      created_at: new Date(baseTime + 3 * 86400000).toISOString(),
      remark: '兑换贴纸礼包'
    }
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
    return {
      ...student,
      total_points: 128 + index * 21,
      class_name: '启航探索班',
      campus_name: '星河校区'
    };
  });

  const state = {
    roster,
    selectedStudentId: roster[0]?.student_id || null,
    activeCategory: 'classroom'
  };

  function getSelectedStudent() {
    return state.roster.find(function (student) {
      return student.student_id === state.selectedStudentId;
    }) || null;
  }

  function renderStudents() {
    elements.studentGrid.innerHTML = state.roster.map(function (student) {
      const progress = getTierProgress(Number(student.total_points || 0), LEVEL_TIERS);
      const isActive = student.student_id === state.selectedStudentId;
      const nextTierText = progress.nextTier ? `距 ${progress.nextTier.name} ${progress.distance} 分` : '已到最高段位';

      return `
        <button class="student-card teacher-student-card ${isActive ? 'is-active' : ''}" type="button" data-student-id="${escapeHtml(student.student_id)}">
          <div class="teacher-student-header">
            <div class="teacher-student-main">
              ${createAvatarHtml(student)}
              <div>
                <h3>${escapeHtml(getStudentDisplayName(student))}</h3>
                <p>${escapeHtml(student.grade || student.student_code || '未设置年级')}</p>
              </div>
            </div>
            <div class="teacher-student-badges">
              <span class="tag-pill">${escapeHtml(progress.currentTier.name)}</span>
              <span class="point-pill">${escapeHtml(student.total_points)} 分</span>
            </div>
          </div>
          <p class="teacher-student-meta">${escapeHtml(nextTierText)}</p>
        </button>
      `;
    }).join('');
  }

  function renderSpotlight(student) {
    const progress = getTierProgress(Number(student.total_points || 0), LEVEL_TIERS);
    const nextLabel = progress.nextTier ? `下一段 ${progress.nextTier.name}` : '当前已是最高段位';
    const distanceLabel = progress.nextTier ? `还差 ${progress.distance} 分` : '继续保持';

    elements.studentSpotlight.innerHTML = `
      <div class="student-spotlight__hero">
        <div class="student-spotlight__identity">
          ${createAvatarHtml(student, 'large')}
          <div>
            <p class="eyebrow teacher-spotlight-eyebrow">Local Preview</p>
            <h2>${escapeHtml(getStudentDisplayName(student))}</h2>
            <p>${escapeHtml(student.campus_name)} · ${escapeHtml(student.class_name)}</p>
          </div>
        </div>
        <div class="student-score-card">
          <span class="student-score-card__label">当前总分</span>
          <strong>${escapeHtml(student.total_points)}</strong>
          <span class="student-score-card__delta">预览数据</span>
        </div>
      </div>
      <div class="student-spotlight__chips">
        <span class="tag-pill teacher-contrast-pill">${escapeHtml(progress.currentTier.name)}</span>
        <span class="status-pill teacher-contrast-pill">${escapeHtml(distanceLabel)}</span>
        <span class="status-pill teacher-contrast-pill">${escapeHtml(nextLabel)}</span>
      </div>
      <div class="student-progress">
        <div class="student-progress__row">
          <span>升级进度</span>
          <strong>${Math.round(progress.progress)}%</strong>
        </div>
        <div class="student-progress__track">
          <span class="student-progress__fill" style="width:${progress.progress}%"></span>
        </div>
      </div>
    `;
  }

  function renderTabs() {
    const categoryKeys = Object.keys(PREVIEW_RULES);
    elements.categoryTabs.innerHTML = categoryKeys.map(function (category) {
      const meta = CATEGORY_META[category] || { label: category, shortLabel: category };
      const isActive = category === state.activeCategory;
      return `
        <button class="teacher-tab ${isActive ? 'is-active' : ''}" type="button" data-category="${escapeHtml(category)}">
          <strong>${escapeHtml(meta.shortLabel || meta.label)}</strong>
          <span>${escapeHtml(meta.label)}</span>
        </button>
      `;
    }).join('');

    const activeMeta = CATEGORY_META[state.activeCategory] || { label: state.activeCategory, tip: '' };
    elements.activeCategoryTitle.textContent = activeMeta.label;
    elements.activeCategoryTip.textContent = '本地预览只展示样例操作卡';
  }

  function renderActionCards() {
    const rules = PREVIEW_RULES[state.activeCategory] || [];
    elements.actionCards.innerHTML = rules.map(function (rule, index) {
      const helperText = rule.is_common || index < 2 ? '高频' : '即点即加';
      const actionBadge = rule.is_common || index < 2
        ? '<span class="teacher-action-badge">常用</span>'
        : '';

      return `
        <button class="teacher-action-card ${rule.is_common || index < 2 ? 'is-high-frequency' : ''}" type="button" disabled>
          <div class="teacher-action-card__top">
            <strong>${escapeHtml(rule.rule_name)}</strong>
            ${actionBadge}
          </div>
          <div class="teacher-action-card__points">
            <span>+${escapeHtml(rule.points)}</span>
            <em>分</em>
          </div>
          <p>${escapeHtml(helperText)}</p>
        </button>
      `;
    }).join('');
  }

  function renderRecords(student) {
    const records = buildPreviewRecords(student);
    elements.studentRecordList.innerHTML = records.map(function (record) {
      const categoryLabel = record.action_type === 'deduct'
        ? '积分兑换'
        : (CATEGORY_META[record.category_snapshot]?.label || record.category_snapshot);
      const score = Number(record.points_delta || 0);
      const scoreText = `${score > 0 ? '+' : ''}${score}`;
      const typeLabel = record.action_type === 'deduct' ? '兑换扣分' : '加分';
      const detail = record.remark ? `<p class="teacher-record-detail">${escapeHtml(record.remark)}</p>` : '';

      return `
        <article class="teacher-record-item">
          <div class="teacher-record-text">
            <h4>${escapeHtml(record.rule_name_snapshot)}</h4>
            <p>${escapeHtml(categoryLabel)} · ${escapeHtml(formatDateTime(record.created_at))}</p>
            ${detail}
          </div>
          <div class="teacher-record-score ${score < 0 ? 'is-negative' : ''}">
            <strong>${escapeHtml(scoreText)}</strong>
            <span>${escapeHtml(typeLabel)}</span>
          </div>
        </article>
      `;
    }).join('');
  }

  function renderAll() {
    const selectedStudent = getSelectedStudent() || state.roster[0] || null;
    if (!selectedStudent) {
      return;
    }

    state.selectedStudentId = selectedStudent.student_id;
    elements.studentCount.textContent = String(state.roster.length);
    elements.classPoints.textContent = String(state.roster.reduce(function (total, student) {
      return total + Number(student.total_points || 0);
    }, 0));
    elements.selectedState.textContent = `当前预览：${getStudentDisplayName(selectedStudent)}`;
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

  elements.studentGrid?.addEventListener('click', function (event) {
    const button = event.target.closest('[data-student-id]');
    if (!button) {
      return;
    }
    state.selectedStudentId = button.dataset.studentId;
    renderAll();
  });

  elements.categoryTabs?.addEventListener('click', function (event) {
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
