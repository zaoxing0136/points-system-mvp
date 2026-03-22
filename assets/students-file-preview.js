import {
  createAvatarHtml,
  escapeHtml,
  formatDateTime,
  getStudentDisplayName
} from './shared-ui.js';
import { buildPreviewStudents } from './local-avatar-preview-data.js';

const STATUS_META = {
  all: '全部状态',
  normal: '正常',
  temporary: '临时',
  pending_merge: '待合并',
  merged: '已合并'
};

document.addEventListener('DOMContentLoaded', function () {
  const elements = {
    studentsSearchForm: document.getElementById('studentsSearchForm'),
    studentsSearchInput: document.getElementById('studentsSearchInput'),
    clearStudentsSearchButton: document.getElementById('clearStudentsSearchButton'),
    studentsStatusFilter: document.getElementById('studentsStatusFilter'),
    studentsCampusFilter: document.getElementById('studentsCampusFilter'),
    studentTotalCount: document.getElementById('studentTotalCount'),
    studentStatusSummary: document.getElementById('studentStatusSummary'),
    studentSearchSummary: document.getElementById('studentSearchSummary'),
    studentsInlineNotice: document.getElementById('studentsInlineNotice'),
    studentsTableBody: document.getElementById('studentsTableBody'),
    studentDetailDialog: document.getElementById('studentDetailDialog'),
    closeStudentDetailButton: document.getElementById('closeStudentDetailButton'),
    studentDetailContent: document.getElementById('studentDetailContent')
  };

  const state = {
    students: buildPreviewStudents(18, 20),
    search: '',
    status: 'all'
  };

  function buildStatusLabel(status) {
    return STATUS_META[status] || status || '未设置';
  }

  function getFilteredStudents() {
    const keyword = state.search.trim().toLowerCase();
    return state.students.filter(function (student) {
      const matchesStatus = state.status === 'all' || student.status === state.status;
      if (!matchesStatus) {
        return false;
      }
      if (!keyword) {
        return true;
      }
      return [
        student.legal_name,
        student.display_name,
        student.parent_phone,
        student.student_code,
        student.avatar_name
      ].some(function (value) {
        return String(value || '').toLowerCase().includes(keyword);
      });
    });
  }

  function renderSummary(filteredStudents) {
    elements.studentTotalCount.textContent = String(filteredStudents.length);
    elements.studentStatusSummary.textContent = buildStatusLabel(state.status);
    elements.studentSearchSummary.textContent = state.search ? `搜索：${state.search}` : '未搜索';
  }

  function renderStudentsTable() {
    const filteredStudents = getFilteredStudents();
    renderSummary(filteredStudents);

    if (!filteredStudents.length) {
      elements.studentsTableBody.innerHTML = '<tr><td colspan="8"><div class="empty-state">当前没有符合条件的预览学生。</div></td></tr>';
      return;
    }

    elements.studentsTableBody.innerHTML = filteredStudents.map(function (student) {
      return `
        <tr>
          <td>
            <div class="students-name-cell">
              ${createAvatarHtml(student)}
              <div>
                <strong>${escapeHtml(getStudentDisplayName(student))}</strong>
                <span>${escapeHtml(student.student_code || '未生成学号')}</span>
              </div>
            </div>
          </td>
          <td>${escapeHtml(student.legal_name || '-')}</td>
          <td>${escapeHtml(student.grade || '-')}</td>
          <td>${escapeHtml(student.parent_name || '-')}</td>
          <td>${escapeHtml(student.parent_phone || '-')}</td>
          <td><span class="student-status-badge is-${escapeHtml(student.status || 'normal')}">${escapeHtml(buildStatusLabel(student.status))}</span></td>
          <td>${escapeHtml(formatDateTime(student.created_at))}</td>
          <td><button class="inline-button" type="button" data-view-student="${escapeHtml(student.id)}">查看</button></td>
        </tr>
      `;
    }).join('');
  }

  function renderDetail(student) {
    if (!student) {
      elements.studentDetailContent.innerHTML = '<div class="empty-state">未找到学生详情。</div>';
      return;
    }

    elements.studentDetailContent.innerHTML = `
      <div class="students-detail-hero">
        ${createAvatarHtml(student, 'large')}
        <div>
          <h3>${escapeHtml(getStudentDisplayName(student))}</h3>
          <p>${escapeHtml(student.student_code || '未生成学号')} · ${escapeHtml(buildStatusLabel(student.status))}</p>
        </div>
      </div>
      <div class="students-detail-grid">
        <div><span>正式姓名</span><strong>${escapeHtml(student.legal_name || '-')}</strong></div>
        <div><span>展示昵称</span><strong>${escapeHtml(student.display_name || '-')}</strong></div>
        <div><span>年级</span><strong>${escapeHtml(student.grade || '-')}</strong></div>
        <div><span>家长姓名</span><strong>${escapeHtml(student.parent_name || '-')}</strong></div>
        <div><span>家长手机号</span><strong>${escapeHtml(student.parent_phone || '-')}</strong></div>
        <div><span>创建时间</span><strong>${escapeHtml(formatDateTime(student.created_at))}</strong></div>
        <div><span>创建来源</span><strong>${escapeHtml(student.created_by_role || '-')}</strong></div>
        <div><span>头像资源</span><strong class="students-detail-text">${escapeHtml(student.avatar_name || student.avatar_code || '-')}</strong></div>
        <div class="students-detail-full"><span>备注</span><strong class="students-detail-text">${escapeHtml(student.notes || '-')}</strong></div>
      </div>
    `;
  }

  function openDialog(dialog) {
    if (!dialog) {
      return;
    }
    if (typeof dialog.showModal === 'function') {
      dialog.showModal();
      return;
    }
    dialog.setAttribute('open', 'open');
  }

  function closeDialog(dialog) {
    if (!dialog) {
      return;
    }
    if (typeof dialog.close === 'function') {
      dialog.close();
      return;
    }
    dialog.removeAttribute('open');
  }

  if (elements.studentsInlineNotice) {
    elements.studentsInlineNotice.hidden = false;
    elements.studentsInlineNotice.dataset.type = 'info';
    elements.studentsInlineNotice.textContent = '当前是本地预览模式，学生列表使用静态样例数据，重点用于检查新头像在列表和详情中的效果。';
  }
  if (elements.studentsCampusFilter) {
    elements.studentsCampusFilter.innerHTML = '<option value="preview">本地预览不分校区</option>';
    elements.studentsCampusFilter.disabled = true;
  }
  ['openCreateStudentButton', 'openImportDialogButton', 'downloadTemplateButton'].forEach(function (id) {
    const button = document.getElementById(id);
    if (button) {
      button.disabled = true;
    }
  });

  elements.studentsSearchForm?.addEventListener('submit', function (event) {
    event.preventDefault();
    state.search = String(elements.studentsSearchInput?.value || '').trim();
    renderStudentsTable();
  });

  elements.clearStudentsSearchButton?.addEventListener('click', function () {
    state.search = '';
    if (elements.studentsSearchInput) {
      elements.studentsSearchInput.value = '';
    }
    renderStudentsTable();
  });

  elements.studentsStatusFilter?.addEventListener('change', function () {
    state.status = elements.studentsStatusFilter.value || 'all';
    renderStudentsTable();
  });

  elements.studentsTableBody?.addEventListener('click', function (event) {
    const button = event.target.closest('[data-view-student]');
    if (!button) {
      return;
    }
    const student = state.students.find(function (item) {
      return item.id === button.dataset.viewStudent;
    }) || null;
    renderDetail(student);
    openDialog(elements.studentDetailDialog);
  });

  elements.closeStudentDetailButton?.addEventListener('click', function () {
    closeDialog(elements.studentDetailDialog);
  });

  renderStudentsTable();
});
