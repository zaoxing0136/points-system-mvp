import { fetchBadgeLeaderboard, fetchLeaderboardSummary } from './supabase-service.js';
import {
  createAvatarHtml,
  escapeHtml,
  formatDateTime,
  getCampusShortName,
  getStudentDisplayName
} from './shared-ui.js';
import { isSupabaseConfigured } from './supabase-client.js';

const ROTATE_INTERVAL_MS = 8000;
const REFRESH_INTERVAL_MS = 10000;
const PAGE_SIZE = 8;

function initDisplayPage() {
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
    return `
      <strong>${escapeHtml(student.unlocked_count || 0)}</strong>
      <span>已解锁徽章</span>
      <small>${escapeHtml(student.event_count || 0)} 次行为记录</small>
    `;
  }

  function buildDetailLine(type, student) {
    if (type !== 'badge') {
      return '';
    }

    if (student.unlocked_badge_names) {
      return `<p class="display-rank-line">${escapeHtml(student.unlocked_badge_names)}</p>`;
    }

    if (student.latest_unlocked_at) {
      return `<p class="display-rank-line">最近解锁 ${escapeHtml(formatDateTime(student.latest_unlocked_at))}</p>`;
    }

    return `<p class="display-rank-line">${escapeHtml(student.event_count || 0)} 次行为记录</p>`;
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
      const campusShortName = getCampusShortName(student.campus_name);
      const campusLine = campusShortName
        ? `<p class="display-rank-campus">${escapeHtml(campusShortName)}</p>`
        : '';
      const detailLine = buildDetailLine(type, student);

      return `
        <article class="rank-item display-rank-item display-rank-item--${escapeHtml(type)} ${rankIndex <= 3 ? 'is-top' : ''}">
          <span class="rank-index">${rankIndex}</span>
          <div class="rank-profile display-rank-profile">
            ${createAvatarHtml(student, 'large')}
            <div class="rank-text display-rank-text">
              <h3>${escapeHtml(getStudentDisplayName(student))}</h3>
              ${campusLine}
              ${detailLine}
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
      const [summary, badgeLeaderboard] = await Promise.all([
        fetchLeaderboardSummary(),
        fetchBadgeLeaderboard().catch(function () { return []; })
      ]);

      state.boards.total = summary.slice().sort(function (left, right) {
        return Number(right.total_points || 0) - Number(left.total_points || 0);
      });
      state.boards.progress = summary.slice().sort(function (left, right) {
        return Number(right.progress_7d || 0) - Number(left.progress_7d || 0);
      });
      state.boards.badge = badgeLeaderboard.slice().sort(function (left, right) {
        if (Number(right.unlocked_count || 0) !== Number(left.unlocked_count || 0)) {
          return Number(right.unlocked_count || 0) - Number(left.unlocked_count || 0);
        }
        if (Number(right.event_count || 0) !== Number(left.event_count || 0)) {
          return Number(right.event_count || 0) - Number(left.event_count || 0);
        }
        return String(right.latest_unlocked_at || '').localeCompare(String(left.latest_unlocked_at || ''));
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
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDisplayPage, { once: true });
} else {
  initDisplayPage();
}
