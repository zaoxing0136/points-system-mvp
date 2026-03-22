import { fetchLeaderboardSummary, fetchLevelTiers } from './supabase-service.js';
import {
  computeBadgePlaceholder,
  createAvatarHtml,
  escapeHtml,
  getCampusShortName,
  getStudentDisplayName,
  normalizeTierList,
  resolveTier
} from './shared-ui.js';
import { isSupabaseConfigured } from './supabase-client.js';

const ROTATE_INTERVAL_MS = 8000;
const REFRESH_INTERVAL_MS = 10000;
const PAGE_SIZE = 8;

document.addEventListener('DOMContentLoaded', function () {
  const elements = {
    totalBoard: document.getElementById('totalBoard'),
    progressBoard: document.getElementById('progressBoard'),
    badgeBoard: document.getElementById('badgeBoard'),
    totalBoardPage: document.getElementById('totalBoardPage'),
    progressBoardPage: document.getElementById('progressBoardPage'),
    badgeBoardPage: document.getElementById('badgeBoardPage'),
    displayClock: document.getElementById('displayClock')
  };

  const state = {
    tiers: normalizeTierList([]),
    boards: {
      total: [],
      progress: [],
      badge: []
    },
    pages: {
      total: 0,
      progress: 0,
      badge: 0
    }
  };

  function renderEmpty(message) {
    const markup = `<div class="empty-state">${escapeHtml(message)}</div>`;
    elements.totalBoard.innerHTML = markup;
    elements.progressBoard.innerHTML = markup;
    elements.badgeBoard.innerHTML = markup;
    elements.totalBoardPage.textContent = '';
    elements.progressBoardPage.textContent = '';
    elements.badgeBoardPage.textContent = '';
  }

  function getPageList(type) {
    const list = state.boards[type] || [];
    const pageCount = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    const pageIndex = Math.min(state.pages[type] || 0, pageCount - 1);
    const start = pageIndex * PAGE_SIZE;
    return {
      list: list.slice(start, start + PAGE_SIZE),
      start
    };
  }

  function buildScoreLabel(type, student) {
    if (type === 'total') {
      return `<strong>${escapeHtml(student.total_points)}</strong><span>总积分</span>`;
    }
    if (type === 'progress') {
      return `<strong>+${escapeHtml(student.progress_7d)}</strong><span>近 7 天</span>`;
    }
    return `<strong>${escapeHtml(student.badge_count)}</strong><span>占位徽章值</span>`;
  }

  function renderBoard(container, pageElement, type) {
    const { list, start } = getPageList(type);

    if (!list.length) {
      container.innerHTML = '<div class="empty-state">暂无榜单数据</div>';
      pageElement.textContent = '';
      return;
    }

    pageElement.textContent = '';
    container.innerHTML = list.map(function (student, index) {
      const rankIndex = start + index + 1;
      const tier = resolveTier(Number(student.total_points || 0), state.tiers);
      const campusShortName = getCampusShortName(student.campus_name);
      const campusLine = campusShortName
        ? `<p class="display-rank-campus">${escapeHtml(campusShortName)}</p>`
        : '';

      return `
        <article class="rank-item display-rank-item display-rank-item--${escapeHtml(type)} ${rankIndex <= 3 ? 'is-top' : ''}">
          <span class="rank-index">${rankIndex}</span>
          <div class="rank-profile display-rank-profile">
            ${createAvatarHtml(student, 'large')}
            <div class="rank-text display-rank-text">
              <h3>${escapeHtml(getStudentDisplayName(student))}</h3>
              ${campusLine}
            </div>
          </div>
          <div class="rank-score display-rank-score">${buildScoreLabel(type, student)}</div>
        </article>
      `;
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
      const pageCount = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
      state.pages[type] = (state.pages[type] + 1) % pageCount;
    });
    renderBoards();
  }

  async function refreshBoards() {
    if (!isSupabaseConfigured) {
      renderEmpty('缺少 Supabase 配置，请先设置环境变量。');
      return;
    }

    try {
      const [summary, levelTiers] = await Promise.all([
        fetchLeaderboardSummary(),
        fetchLevelTiers().catch(function () { return []; })
      ]);

      state.tiers = normalizeTierList(levelTiers);
      const enriched = summary.map(function (student) {
        return {
          ...student,
          badge_count: computeBadgePlaceholder(Number(student.total_points || 0), Number(student.progress_7d || 0))
        };
      });

      state.boards.total = enriched.slice().sort(function (left, right) {
        return Number(right.total_points || 0) - Number(left.total_points || 0);
      });
      state.boards.progress = enriched.slice().sort(function (left, right) {
        return Number(right.progress_7d || 0) - Number(left.progress_7d || 0);
      });
      state.boards.badge = enriched.slice().sort(function (left, right) {
        if (Number(right.badge_count || 0) !== Number(left.badge_count || 0)) {
          return Number(right.badge_count || 0) - Number(left.badge_count || 0);
        }
        return Number(right.total_points || 0) - Number(left.total_points || 0);
      });

      ['total', 'progress', 'badge'].forEach(function (type) {
        const pageCount = Math.max(1, Math.ceil((state.boards[type] || []).length / PAGE_SIZE));
        state.pages[type] = Math.min(state.pages[type], pageCount - 1);
      });

      renderBoards();
    } catch (error) {
      renderEmpty(`榜单读取失败：${error.message}`);
    }
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

  updateClock();
  refreshBoards();
  window.setInterval(updateClock, 1000);
  window.setInterval(refreshBoards, REFRESH_INTERVAL_MS);
  window.setInterval(rotateBoards, ROTATE_INTERVAL_MS);
});

