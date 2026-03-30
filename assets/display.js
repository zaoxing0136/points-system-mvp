import { fetchBadgeLeaderboard, fetchLeaderboardSummary } from './supabase-service.js';
import {
  createAvatarHtml,
  escapeHtml,
  formatDateTime,
  getCampusShortName,
  getStudentDisplayName
} from './shared-ui.js';
import { isSupabaseConfigured, supabase } from './supabase-client.js';

const ROTATE_INTERVAL_MS = 12000;
const LOW_TRAFFIC_REFRESH_INTERVAL_MS = 30 * 60 * 1000;
const HIGH_TRAFFIC_REFRESH_INTERVAL_MS = 10 * 60 * 1000;
const OFF_HOURS_REFRESH_INTERVAL_MS = 60 * 60 * 1000;
const REALTIME_DEBOUNCE_MS = 6000;
const LARGE_PAGE_SIZE = 8;
const COMPACT_PAGE_SIZE = 7;
const WATCHED_TABLES = ['point_ledger', 'student_badge_events', 'student_badge_unlocks', 'students'];
const UI_TEXT = Object.freeze({
  totalLabel: '\u603b\u79ef\u5206',
  progressLabel: '\u8fd1 7 \u5929',
  unlockedLabel: '\u5df2\u89e3\u9501\u5fbd\u7ae0',
  eventCountSuffix: ' \u6b21\u884c\u4e3a\u8bb0\u5f55',
  tierPrefix: '\u5f53\u524d\u6bb5\u4f4d ',
  recentUnlockPrefix: '\u6700\u8fd1\u89e3\u9501 ',
  emptyBoard: '\u6682\u65e0\u699c\u5355\u6570\u636e',
  hiddenMode: '\u9875\u9762\u540e\u53f0 60 \u5206\u949f\u515c\u5e95',
  weekendMode: '\u5468\u672b 10 \u5206\u949f\u5237\u65b0',
  weeknightMode: '\u665a\u95f4\u4e0a\u8bfe 10 \u5206\u949f\u5237\u65b0',
  weekdayMode: '\u5468\u4e2d\u767d\u5929 30 \u5206\u949f\u5237\u65b0',
  offHoursMode: '\u975e\u4e0a\u8bfe\u65f6\u6bb5 60 \u5206\u949f\u515c\u5e95',
  waiting: '\u7b49\u5f85\u9996\u6b21\u52a0\u8f7d',
  lastRefreshPrefix: '\u6700\u540e\u66f4\u65b0 ',
  refreshing: '\u5237\u65b0\u4e2d',
  queuedRefresh: '\u68c0\u6d4b\u5230\u53d8\u5316\uff0c\u6b63\u5728\u51c6\u5907\u5237\u65b0',
  instantRefresh: '\u53d8\u5316\u5373\u65f6\u5237\u65b0',
  pageSuffix: ' \u4eba/\u9875',
  missingSupabase: '\u7f3a\u5c11 Supabase \u914d\u7f6e\uff0c\u8bf7\u5148\u8bbe\u7f6e\u73af\u5883\u53d8\u91cf\u3002',
  loadFailedPrefix: '\u699c\u5355\u8bfb\u53d6\u5931\u8d25\uff1a'
});

function initDisplayPage() {
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
    boards: {
      total: [],
      progress: [],
      badge: []
    },
    pages: {
      total: 0,
      progress: 0,
      badge: 0
    },
    pageSize: LARGE_PAGE_SIZE,
    refreshing: false,
    pendingRefresh: false,
    lastRefreshAt: null,
    refreshTimer: 0,
    realtimeTimer: 0,
    realtimeChannel: null
  };

  function computePageSize() {
    return window.innerHeight >= 900 && window.innerWidth >= 1500 ? LARGE_PAGE_SIZE : COMPACT_PAGE_SIZE;
  }

  function syncPageSize() {
    const nextPageSize = computePageSize();
    if (state.pageSize === nextPageSize) {
      return false;
    }

    state.pageSize = nextPageSize;
    document.documentElement.style.setProperty('--display-page-size', String(state.pageSize));
    ['total', 'progress', 'badge'].forEach(function (type) {
      const pageCount = Math.max(1, Math.ceil((state.boards[type] || []).length / state.pageSize));
      state.pages[type] = Math.min(state.pages[type] || 0, pageCount - 1);
    });
    return true;
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

  function buildScoreLabel(type, student) {
    if (type === 'total') {
      return `<strong>${escapeHtml(student.total_points)}</strong><span>${UI_TEXT.totalLabel}</span>`;
    }
    if (type === 'progress') {
      return `<strong>+${escapeHtml(student.progress_7d)}</strong><span>${UI_TEXT.progressLabel}</span>`;
    }
    return `
      <strong>${escapeHtml(student.unlocked_count || 0)}</strong>
      <span>${UI_TEXT.unlockedLabel}</span>
      <small>${escapeHtml(student.event_count || 0)}${UI_TEXT.eventCountSuffix}</small>
    `;
  }

  function buildDetailLine(type, student) {
    if (type === 'total' || type === 'progress') {
      if (!student.current_level_name) {
        return '';
      }
      return `<p class="display-rank-subline">${UI_TEXT.tierPrefix}${escapeHtml(student.current_level_name)}</p>`;
    }

    if (type !== 'badge') {
      return '';
    }

    if (student.unlocked_badge_names) {
      return `<p class="display-rank-subline">${escapeHtml(student.unlocked_badge_names)}</p>`;
    }

    if (student.latest_unlocked_at) {
      return `<p class="display-rank-subline">${UI_TEXT.recentUnlockPrefix}${escapeHtml(formatDateTime(student.latest_unlocked_at))}</p>`;
    }

    return `<p class="display-rank-subline">${escapeHtml(student.event_count || 0)}${UI_TEXT.eventCountSuffix}</p>`;
  }

  function renderBoard(container, pageElement, type) {
    const { list, start, pageCount, pageIndex } = getPageList(type);

    if (!list.length) {
      container.innerHTML = `<div class="empty-state">${UI_TEXT.emptyBoard}</div>`;
      pageElement.textContent = '';
      return;
    }

    pageElement.textContent = pageCount > 1 ? `${pageIndex + 1} / ${pageCount}` : '';
    container.innerHTML = list.map(function (student, index) {
      const rankIndex = start + index + 1;
      const campusShortName = getCampusShortName(student.campus_name);
      const campusChip = campusShortName
        ? `<span class="display-rank-campuschip">${escapeHtml(campusShortName)}</span>`
        : '';
      const detailLine = buildDetailLine(type, student);

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
      const pageCount = Math.max(1, Math.ceil(list.length / state.pageSize));
      state.pages[type] = (state.pages[type] + 1) % pageCount;
    });
    renderBoards();
  }

  function formatClock(now) {
    const parts = [
      String(now.getHours()).padStart(2, '0'),
      String(now.getMinutes()).padStart(2, '0'),
      String(now.getSeconds()).padStart(2, '0')
    ];

    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${parts.join(':')}`;
  }

  function getRefreshWindow(now = new Date()) {
    const day = now.getDay();
    const minutes = now.getHours() * 60 + now.getMinutes();
    const isWeekend = day === 0 || day === 6;
    const isWeeknightClassHours = !isWeekend && minutes >= 17 * 60 && minutes < 21 * 60;

    if (document.hidden) {
      return {
        delay: OFF_HOURS_REFRESH_INTERVAL_MS,
        label: UI_TEXT.hiddenMode
      };
    }

    if (isWeekend) {
      return {
        delay: HIGH_TRAFFIC_REFRESH_INTERVAL_MS,
        label: UI_TEXT.weekendMode
      };
    }

    if (isWeeknightClassHours) {
      return {
        delay: HIGH_TRAFFIC_REFRESH_INTERVAL_MS,
        label: UI_TEXT.weeknightMode
      };
    }

    if (minutes >= 9 * 60 && minutes < 17 * 60) {
      return {
        delay: LOW_TRAFFIC_REFRESH_INTERVAL_MS,
        label: UI_TEXT.weekdayMode
      };
    }

    return {
      delay: OFF_HOURS_REFRESH_INTERVAL_MS,
      label: UI_TEXT.offHoursMode
    };
  }

  function formatLastRefresh() {
    if (!(state.lastRefreshAt instanceof Date)) {
      return UI_TEXT.waiting;
    }

    return `${UI_TEXT.lastRefreshPrefix}${String(state.lastRefreshAt.getHours()).padStart(2, '0')}:${String(state.lastRefreshAt.getMinutes()).padStart(2, '0')}`;
  }

  function updateStatusText() {
    if (!elements.displayStatusText) {
      return;
    }

    const refreshWindow = getRefreshWindow();
    const lastRefreshText = formatLastRefresh();

    if (state.refreshing) {
      elements.displayStatusText.textContent = `${state.pageSize}${UI_TEXT.pageSuffix} | ${UI_TEXT.refreshing}`;
      return;
    }

    if (state.realtimeTimer) {
      elements.displayStatusText.textContent = `${state.pageSize}${UI_TEXT.pageSuffix} | ${UI_TEXT.queuedRefresh}`;
      return;
    }

    elements.displayStatusText.textContent = `${state.pageSize}${UI_TEXT.pageSuffix} | ${refreshWindow.label} | ${UI_TEXT.instantRefresh} | ${lastRefreshText}`;
  }

  function updateClock() {
    elements.displayClock.textContent = formatClock(new Date());
    updateStatusText();
  }

  function scheduleNextRefresh() {
    window.clearTimeout(state.refreshTimer);
    const refreshWindow = getRefreshWindow();
    state.refreshTimer = window.setTimeout(function () {
      refreshBoards();
    }, refreshWindow.delay);
    updateStatusText();
  }

  function queueRealtimeRefresh() {
    if (!isSupabaseConfigured) {
      return;
    }

    if (document.hidden || state.refreshing) {
      state.pendingRefresh = true;
      updateStatusText();
      return;
    }

    if (state.realtimeTimer) {
      return;
    }

    state.realtimeTimer = window.setTimeout(function () {
      state.realtimeTimer = 0;
      refreshBoards();
    }, REALTIME_DEBOUNCE_MS);
    updateStatusText();
  }

  async function refreshBoards() {
    if (!isSupabaseConfigured) {
      const markup = `<div class="empty-state">${UI_TEXT.missingSupabase}</div>`;
      elements.totalBoard.innerHTML = markup;
      elements.progressBoard.innerHTML = markup;
      elements.badgeBoard.innerHTML = markup;
      elements.totalBoardPage.textContent = '';
      elements.progressBoardPage.textContent = '';
      elements.badgeBoardPage.textContent = '';
      updateStatusText();
      return;
    }

    if (state.refreshing) {
      state.pendingRefresh = true;
      return;
    }

    state.refreshing = true;
    updateStatusText();

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
        const pageCount = Math.max(1, Math.ceil((state.boards[type] || []).length / state.pageSize));
        state.pages[type] = Math.min(state.pages[type] || 0, pageCount - 1);
      });

      state.lastRefreshAt = new Date();
      renderBoards();
    } catch (error) {
      const markup = `<div class="empty-state">${UI_TEXT.loadFailedPrefix}${escapeHtml(error.message)}</div>`;
      elements.totalBoard.innerHTML = markup;
      elements.progressBoard.innerHTML = markup;
      elements.badgeBoard.innerHTML = markup;
      elements.totalBoardPage.textContent = '';
      elements.progressBoardPage.textContent = '';
      elements.badgeBoardPage.textContent = '';
    } finally {
      state.refreshing = false;
      scheduleNextRefresh();

      if (state.pendingRefresh && !document.hidden) {
        state.pendingRefresh = false;
        queueRealtimeRefresh();
      }

      updateStatusText();
    }
  }

  function handleViewportResize() {
    if (syncPageSize()) {
      renderBoards();
    }
    updateStatusText();
  }

  function handleVisibilityChange() {
    updateStatusText();
    if (document.hidden) {
      scheduleNextRefresh();
      return;
    }

    window.clearTimeout(state.realtimeTimer);
    state.realtimeTimer = 0;

    if (state.pendingRefresh) {
      state.pendingRefresh = false;
      refreshBoards();
      return;
    }

    const refreshWindow = getRefreshWindow();
    const shouldRefresh = !state.lastRefreshAt || (Date.now() - state.lastRefreshAt.getTime()) >= refreshWindow.delay;
    if (shouldRefresh) {
      refreshBoards();
      return;
    }

    scheduleNextRefresh();
  }

  function subscribeRealtime() {
    if (!supabase) {
      return;
    }

    const channel = supabase.channel('display-leaderboard-live');
    WATCHED_TABLES.forEach(function (tableName) {
      channel.on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: tableName
      }, function () {
        queueRealtimeRefresh();
      });
    });

    state.realtimeChannel = channel.subscribe();
  }

  syncPageSize();
  updateClock();
  updateStatusText();
  refreshBoards();
  subscribeRealtime();

  window.setInterval(updateClock, 1000);
  window.setInterval(rotateBoards, ROTATE_INTERVAL_MS);
  window.addEventListener('resize', handleViewportResize);
  window.addEventListener('orientationchange', handleViewportResize);
  document.addEventListener('visibilitychange', handleVisibilityChange);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDisplayPage, { once: true });
} else {
  initDisplayPage();
}
