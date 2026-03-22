(function () {
  if (window.location.protocol !== 'file:' || !window.FileAvatarPreview) {
    return;
  }

  const helpers = window.FileAvatarPreview;
  const computeBadgePlaceholder = helpers.computeBadgePlaceholder;
  const createAvatarHtml = helpers.createAvatarHtml;
  const escapeHtml = helpers.escapeHtml;
  const getCampusShortName = helpers.getCampusShortName;
  const getStudentDisplayName = helpers.getStudentDisplayName;
  const normalizeTierList = helpers.normalizeTierList;
  const resolveTier = helpers.resolveTier;
  const buildPreviewStudents = helpers.buildPreviewStudents;

  const ROTATE_INTERVAL_MS = 8000;
  const PAGE_SIZE = 8;
  const LEVEL_TIERS = normalizeTierList([
    { level_name: '新芽', threshold: 0 },
    { level_name: '启航', threshold: 80 },
    { level_name: '探索者', threshold: 150 },
    { level_name: '发光体', threshold: 240 },
    { level_name: '领航员', threshold: 340 }
  ]);

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
      tiers: LEVEL_TIERS,
      boards: { total: [], progress: [], badge: [] },
      pages: { total: 0, progress: 0, badge: 0 }
    };

    const previewRows = buildPreviewStudents(24, 10).map(function (student, index) {
      const totalPoints = 140 + (index * 19) % 260;
      const progress = 8 + (index * 7) % 45;
      return {
        legal_name: student.legal_name,
        display_name: student.display_name,
        avatar_url: student.avatar_url,
        avatar_name: student.avatar_name,
        campus_name: student.campus_name,
        total_points: totalPoints,
        progress_7d: progress,
        badge_count: computeBadgePlaceholder(totalPoints, progress)
      };
    });

    state.boards.total = previewRows.slice().sort(function (left, right) { return Number(right.total_points || 0) - Number(left.total_points || 0); });
    state.boards.progress = previewRows.slice().sort(function (left, right) { return Number(right.progress_7d || 0) - Number(left.progress_7d || 0); });
    state.boards.badge = previewRows.slice().sort(function (left, right) {
      if (Number(right.badge_count || 0) !== Number(left.badge_count || 0)) {
        return Number(right.badge_count || 0) - Number(left.badge_count || 0);
      }
      return Number(right.total_points || 0) - Number(left.total_points || 0);
    });

    function getPageList(type) {
      const list = state.boards[type] || [];
      const pageCount = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
      const pageIndex = Math.min(state.pages[type] || 0, pageCount - 1);
      const start = pageIndex * PAGE_SIZE;
      return { list: list.slice(start, start + PAGE_SIZE), start: start, pageCount: pageCount, pageIndex: pageIndex };
    }

    function buildScoreLabel(type, student) {
      if (type === 'total') {
        return '<strong>' + escapeHtml(student.total_points) + '</strong><span>总积分</span>';
      }
      if (type === 'progress') {
        return '<strong>+' + escapeHtml(student.progress_7d) + '</strong><span>近 7 天</span>';
      }
      return '<strong>' + escapeHtml(student.badge_count) + '</strong><span>徽章值</span>';
    }

    function renderBoard(container, pageElement, type) {
      const page = getPageList(type);
      pageElement.textContent = page.pageCount > 1 ? (page.pageIndex + 1) + ' / ' + page.pageCount : '';
      container.innerHTML = page.list.map(function (student, index) {
        const rankIndex = page.start + index + 1;
        const tier = resolveTier(Number(student.total_points || 0), state.tiers);
        const campusShortName = getCampusShortName(student.campus_name);
        const campusLine = campusShortName ? '<p class="display-rank-campus">' + escapeHtml(campusShortName) + '</p>' : '';
        return '\n          <article class="rank-item display-rank-item display-rank-item--' + escapeHtml(type) + ' ' + (rankIndex <= 3 ? 'is-top' : '') + '">\n            <span class="rank-index">' + rankIndex + '</span>\n            <div class="rank-profile display-rank-profile">\n              ' + createAvatarHtml(student, 'large') + '\n              <div class="rank-text display-rank-text">\n                <h3>' + escapeHtml(getStudentDisplayName(student)) + '</h3>\n                ' + campusLine + '\n                <p class="display-rank-line">' + escapeHtml(tier.name) + ' · ' + escapeHtml(student.avatar_name || '新头像库') + '</p>\n              </div>\n            </div>\n            <div class="rank-score display-rank-score">' + buildScoreLabel(type, student) + '</div>\n          </article>\n        ';
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

    function updateClock() {
      const now = new Date();
      const parts = [String(now.getHours()).padStart(2, '0'), String(now.getMinutes()).padStart(2, '0'), String(now.getSeconds()).padStart(2, '0')];
      elements.displayClock.textContent = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0') + ' ' + parts.join(':');
    }

    const statusText = document.querySelector('.display-status span:last-child');
    if (statusText) {
      statusText.textContent = '本地预览 · 静态样例 · 8 秒轮播';
    }

    updateClock();
    renderBoards();
    window.setInterval(updateClock, 1000);
    window.setInterval(rotateBoards, ROTATE_INTERVAL_MS);
  });
})();
