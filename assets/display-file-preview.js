import {
  createAvatarHtml,
  escapeHtml,
  getCampusShortName,
  getStudentDisplayName,
  normalizeTierList,
  resolveTier
} from './shared-ui.js';
import { buildPreviewStudents } from './local-avatar-preview-data.js';

const ROTATE_INTERVAL_MS = 12000;
const LARGE_PAGE_SIZE = 8;
const COMPACT_PAGE_SIZE = 7;
const UI_TEXT = Object.freeze({
  totalLabel: '\u603b\u79ef\u5206',
  progressLabel: '\u8fd1 7 \u5929',
  badgeLabel: '\u5fbd\u7ae0\u503c',
  tierPrefix: '\u5f53\u524d\u6bb5\u4f4d ',
  previewMode: '\u9884\u89c8\u6a21\u5f0f',
  autoPaging: '\u81ea\u52a8\u7ffb\u9875'
});

const LEVEL_TIERS = normalizeTierList([
  { level_name: '\u65b0\u82bd', threshold: 0 },
  { level_name: '\u542f\u822a', threshold: 80 },
  { level_name: '\u63a2\u7d22\u8005', threshold: 150 },
  { level_name: '\u53d1\u5149\u4f53', threshold: 240 },
  { level_name: '\u9886\u822a\u5458', threshold: 340 }
]);

function computePreviewBadgeCount(totalPoints, progress7d) {
  const total = Number(totalPoints || 0);
  const progress = Number(progress7d || 0);
  return Math.max(1, Math.round(total / 48) + Math.round(progress / 14));
}

function computePageSize() {
  return window.innerHeight >= 900 && window.innerWidth >= 1500 ? LARGE_PAGE_SIZE : COMPACT_PAGE_SIZE;
}

function buildScoreLabel(type, student) {
  if (type === 'total') {
    return `<strong>${escapeHtml(student.total_points)}</strong><span>${UI_TEXT.totalLabel}</span>`;
  }
  if (type === 'progress') {
    return `<strong>+${escapeHtml(student.progress_7d)}</strong><span>${UI_TEXT.progressLabel}</span>`;
  }
  return `<strong>${escapeHtml(student.badge_count)}</strong><span>${UI_TEXT.badgeLabel}</span>`;
}

function buildPreviewDetailLine(tierName) {
  return `<p class="display-rank-subline">${UI_TEXT.tierPrefix}${escapeHtml(tierName)}</p>`;
}

function renderBoardRow(type, student, rankIndex, tiers) {
  const tier = resolveTier(Number(student.total_points || 0), tiers);
  const campusShortName = getCampusShortName(student.campus_name);
  const campusChip = campusShortName
    ? `<span class="display-rank-campuschip">${escapeHtml(campusShortName)}</span>`
    : '';

  return `
    <article class="rank-item display-rank-item display-rank-item--${escapeHtml(type)} ${rankIndex <= 3 ? 'is-top' : ''}">
      <span class="rank-index">${rankIndex}</span>
      <div class="rank-profile display-rank-profile">
        ${createAvatarHtml(student, 'large')}
        <div class="rank-text display-rank-text">
          <div class="display-rank-mainline">
            <h3>${escapeHtml(getStudentDisplayName(student))}</h3>
            ${campusChip}
          </div>
          ${buildPreviewDetailLine(tier.name)}
        </div>
      </div>
      <div class="rank-score display-rank-score">${buildScoreLabel(type, student)}</div>
    </article>
  `;
}

document.addEventListener('DOMContentLoaded', function () {
  const elements = {
    totalBoard: document.getElementById('totalBoard'),
    progressBoard: document.getElementById('progressBoard'),
    badgeBoard: document.getElementById('badgeBoard'),
    totalBoardPage: document.getElementById('totalBoardPage'),
    progressBoardPage: document.getElementById('progressBoardPage'),
    badgeBoardPage: document.getElementById('badgeBoardPage'),
    displayClock: document.getElementById('displayClock'),
    displayStatusText: document.getElementById('displayStatusText')
  };

  const state = {
    tiers: LEVEL_TIERS,
    boards: { total: [], progress: [], badge: [] },
    pages: { total: 0, progress: 0, badge: 0 },
    pageSize: computePageSize()
  };

  const previewRows = buildPreviewStudents(24, 10).map(function (student, index) {
    const totalPoints = 140 + (index * 19) % 260;
    const progress = 8 + (index * 7) % 45;
    return {
      ...student,
      total_points: totalPoints,
      progress_7d: progress,
      badge_count: computePreviewBadgeCount(totalPoints, progress)
    };
  });

  state.boards.total = previewRows.slice().sort(function (left, right) {
    return Number(right.total_points || 0) - Number(left.total_points || 0);
  });
  state.boards.progress = previewRows.slice().sort(function (left, right) {
    return Number(right.progress_7d || 0) - Number(left.progress_7d || 0);
  });
  state.boards.badge = previewRows.slice().sort(function (left, right) {
    if (Number(right.badge_count || 0) !== Number(left.badge_count || 0)) {
      return Number(right.badge_count || 0) - Number(left.badge_count || 0);
    }
    return Number(right.total_points || 0) - Number(left.total_points || 0);
  });

  function syncPageSize() {
    state.pageSize = computePageSize();
    document.documentElement.style.setProperty('--display-page-size', String(state.pageSize));
  }

  function getPageList(type) {
    const list = state.boards[type] || [];
    const pageCount = Math.max(1, Math.ceil(list.length / state.pageSize));
    const pageIndex = Math.min(state.pages[type] || 0, pageCount - 1);
    const start = pageIndex * state.pageSize;
    return {
      list: list.slice(start, start + state.pageSize),
      start,
      pageCount,
      pageIndex
    };
  }

  function renderBoard(container, pageElement, type) {
    const { list, start, pageCount, pageIndex } = getPageList(type);
    pageElement.textContent = pageCount > 1 ? `${pageIndex + 1} / ${pageCount}` : '';
    container.innerHTML = list.map(function (student, index) {
      return renderBoardRow(type, student, start + index + 1, state.tiers);
    }).join('');
  }

  function renderBoards() {
    renderBoard(elements.totalBoard, elements.totalBoardPage, 'total');
    renderBoard(elements.progressBoard, elements.progressBoardPage, 'progress');
    renderBoard(elements.badgeBoard, elements.badgeBoardPage, 'badge');
  }

  function rotateBoards() {
    ['total', 'progress', 'badge'].forEach(function (type) {
      const list = state.boards[type] || [];
      const pageCount = Math.max(1, Math.ceil(list.length / state.pageSize));
      state.pages[type] = (state.pages[type] + 1) % pageCount;
    });
    renderBoards();
  }

  function updateClock() {
    const now = new Date();
    const parts = [
      String(now.getHours()).padStart(2, '0'),
      String(now.getMinutes()).padStart(2, '0'),
      String(now.getSeconds()).padStart(2, '0')
    ];
    elements.displayClock.textContent = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${parts.join(':')}`;
  }

  function updateStatusText() {
    if (elements.displayStatusText) {
      elements.displayStatusText.textContent = `${state.pageSize} \u4eba/\u9875 | ${UI_TEXT.previewMode} | ${UI_TEXT.autoPaging}`;
    }
  }

  function handleViewportResize() {
    syncPageSize();
    renderBoards();
    updateStatusText();
  }

  syncPageSize();
  updateClock();
  updateStatusText();
  renderBoards();
  window.setInterval(updateClock, 1000);
  window.setInterval(rotateBoards, ROTATE_INTERVAL_MS);
  window.addEventListener('resize', handleViewportResize);
  window.addEventListener('orientationchange', handleViewportResize);
});
