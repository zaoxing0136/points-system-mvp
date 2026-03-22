import { isSupabaseConfigured } from './supabase-client.js';
import { mountSessionActions, requirePageAuth } from './auth.js';
import {
  createStudents,
  fetchCampuses,
  fetchStudentDuplicateCandidates,
  fetchStudentsList
} from './supabase-service.js';
import {
  createAvatarHtml,
  escapeHtml,
  formatDateTime,
  getStudentDisplayName
} from './shared-ui.js';

const CSV_FIELDS = ['legal_name', 'display_name', 'grade', 'parent_name', 'parent_phone', 'avatar_url', 'notes'];
const STATUS_META = {
  normal: '正常',
  temporary: '临时',
  pending_merge: '待合并',
  merged: '已合并'
};

function normalizeText(value) {
  return String(value || '').trim();
}

function normalizePhone(value) {
  return normalizeText(value).replace(/[\s-]/g, '');
}

function buildStudentCode(index = 0) {
  const now = new Date();
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0'),
    String(now.getMilliseconds()).padStart(3, '0')
  ].join('');
  const randomToken = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `STU${stamp}${String(index).padStart(3, '0')}${randomToken}`;
}

function parseCsv(text) {
  const rows = [];
  let current = '';
  let row = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(current);
      current = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') {
        index += 1;
      }
      row.push(current);
      rows.push(row);
      row = [];
      current = '';
      continue;
    }

    current += char;
  }

  if (current.length || row.length) {
    row.push(current);
    rows.push(row);
  }

  return rows;
}

function createCsvTemplate() {
  const sampleRow = ['张明', '小明', '三年级', '张女士', '13800001234', '', '春季新班预备生'];
  return '\uFEFF' + [CSV_FIELDS.join(','), sampleRow.join(',')].join('\r\n');
}

function buildStatusLabel(status) {
  return STATUS_META[status] || status || '未设置';
}

function buildStudentInsertRow(draft, index) {
  const legalName = normalizeText(draft.legal_name);
  const displayName = normalizeText(draft.display_name) || legalName;
  return {
    student_code: buildStudentCode(index),
    legal_name: legalName,
    display_name: displayName,
    grade: normalizeText(draft.grade),
    parent_name: normalizeText(draft.parent_name),
    parent_phone: normalizeText(draft.parent_phone),
    avatar_url: normalizeText(draft.avatar_url),
    notes: normalizeText(draft.notes),
    status: 'normal',
    created_by_role: 'admin',
    created_by_id: null
  };
}

function buildDuplicateAssessment(draft, candidates, batchRows, currentRowNumber) {
  const legalName = normalizeText(draft.legal_name);
  const grade = normalizeText(draft.grade);
  const phone = normalizePhone(draft.parent_phone);
  const highMessages = new Set();
  const mediumMessages = new Set();

  function collectMessage(message, level) {
    if (level === 'high') {
      highMessages.add(message);
      return;
    }
    mediumMessages.add(message);
  }

  (candidates || []).forEach(function (student) {
    const sameLegalName = normalizeText(student.legal_name) === legalName;
    if (!sameLegalName) {
      return;
    }

    const samePhone = phone && normalizePhone(student.parent_phone) === phone;
    const sameGrade = grade && normalizeText(student.grade) === grade;

    if (samePhone) {
      collectMessage(`系统已有：${student.legal_name} / ${student.parent_phone || '未填手机号'}，高疑似重复`, 'high');
      return;
    }

    if (sameGrade) {
      collectMessage(`系统已有：${student.legal_name} / ${student.grade || '未填年级'}，中疑似重复`, 'medium');
    }
  });

  (batchRows || []).forEach(function (row) {
    if (row.rowNumber === currentRowNumber) {
      return;
    }

    const sameLegalName = normalizeText(row.legal_name) === legalName;
    if (!sameLegalName) {
      return;
    }

    const samePhone = phone && normalizePhone(row.parent_phone) === phone;
    const sameGrade = grade && normalizeText(row.grade) === grade;

    if (samePhone) {
      collectMessage(`导入文件第 ${row.rowNumber} 行与当前行 legal_name + parent_phone 相同`, 'high');
      return;
    }

    if (sameGrade) {
      collectMessage(`导入文件第 ${row.rowNumber} 行与当前行 legal_name + grade 相同`, 'medium');
    }
  });

  return {
    level: highMessages.size ? 'high' : (mediumMessages.size ? 'medium' : 'none'),
    highMessages: Array.from(highMessages),
    mediumMessages: Array.from(mediumMessages)
  };
}

const authContext = await requirePageAuth({ allowedRoles: ['admin'] });

if (authContext) {
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
    studentsNotice: document.getElementById('studentsNotice'),
    openCreateStudentButton: document.getElementById('openCreateStudentButton'),
    openImportDialogButton: document.getElementById('openImportDialogButton'),
    downloadTemplateButton: document.getElementById('downloadTemplateButton'),
    studentDetailDialog: document.getElementById('studentDetailDialog'),
    closeStudentDetailButton: document.getElementById('closeStudentDetailButton'),
    studentDetailContent: document.getElementById('studentDetailContent'),
    createStudentDialog: document.getElementById('createStudentDialog'),
    createStudentForm: document.getElementById('createStudentForm'),
    closeCreateStudentButton: document.getElementById('closeCreateStudentButton'),
    cancelCreateStudentButton: document.getElementById('cancelCreateStudentButton'),
    submitCreateStudentButton: document.getElementById('submitCreateStudentButton'),
    createLegalNameInput: document.getElementById('createLegalNameInput'),
    createDisplayNameInput: document.getElementById('createDisplayNameInput'),
    createGradeInput: document.getElementById('createGradeInput'),
    createParentNameInput: document.getElementById('createParentNameInput'),
    createParentPhoneInput: document.getElementById('createParentPhoneInput'),
    createAvatarUrlInput: document.getElementById('createAvatarUrlInput'),
    createNotesInput: document.getElementById('createNotesInput'),
    manualDuplicateBox: document.getElementById('manualDuplicateBox'),
    importStudentsDialog: document.getElementById('importStudentsDialog'),
    closeImportDialogButton: document.getElementById('closeImportDialogButton'),
    cancelImportButton: document.getElementById('cancelImportButton'),
    importFileInput: document.getElementById('importFileInput'),
    importPreviewSummary: document.getElementById('importPreviewSummary'),
    importPreviewTableBody: document.getElementById('importPreviewTableBody'),
    confirmImportButton: document.getElementById('confirmImportButton')
  };

  const state = {
    campuses: [],
    students: [],
    search: '',
    status: 'all',
    selectedStudent: null,
    importRows: [],
    manualDuplicateAssessment: null,
    manualDuplicateTimer: null,
    isLoadingStudents: false,
    isSaving: false
  };

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

  function showInlineNotice(message, type) {
    if (!message) {
      elements.studentsInlineNotice.hidden = true;
      elements.studentsInlineNotice.textContent = '';
      elements.studentsInlineNotice.dataset.type = '';
      return;
    }

    elements.studentsInlineNotice.hidden = false;
    elements.studentsInlineNotice.dataset.type = type || 'info';
    elements.studentsInlineNotice.textContent = message;
  }

  function showNotice(message, type) {
    elements.studentsNotice.textContent = message;
    elements.studentsNotice.hidden = false;
    elements.studentsNotice.dataset.type = type || 'info';

    window.clearTimeout(showNotice.timer);
    showNotice.timer = window.setTimeout(function () {
      elements.studentsNotice.hidden = true;
    }, 2800);
  }

  function getCurrentStatusText() {
    return state.status === 'all' ? '全部状态' : `${state.status} / ${buildStatusLabel(state.status)}`;
  }

  function getCurrentSearchText() {
    return state.search ? `搜索：${state.search}` : '未搜索';
  }

  function renderSummary() {
    elements.studentTotalCount.textContent = String(state.students.length);
    elements.studentStatusSummary.textContent = getCurrentStatusText();
    elements.studentSearchSummary.textContent = getCurrentSearchText();
  }

  function renderCampusOptions() {
    const options = ['<option value="">全部校区（主档无固定校区）</option>'].concat(
      state.campuses.map(function (campus) {
        return `<option value="${escapeHtml(campus.id)}">${escapeHtml(campus.name)}</option>`;
      })
    );
    elements.studentsCampusFilter.innerHTML = options.join('');
  }

  function renderStudentsTable() {
    if (state.isLoadingStudents) {
      elements.studentsTableBody.innerHTML = '<tr><td colspan="8"><div class="empty-state">正在读取学生主档...</div></td></tr>';
      return;
    }

    if (!state.students.length) {
      elements.studentsTableBody.innerHTML = '<tr><td colspan="8"><div class="empty-state">当前没有符合条件的学生主档。</div></td></tr>';
      return;
    }

    elements.studentsTableBody.innerHTML = state.students.map(function (student) {
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
        <div><span>头像 URL</span><strong class="students-detail-text">${escapeHtml(student.avatar_url || '-')}</strong></div>
        <div class="students-detail-full"><span>备注</span><strong class="students-detail-text">${escapeHtml(student.notes || '-')}</strong></div>
      </div>
    `;
  }

  function renderManualDuplicateBox() {
    const assessment = state.manualDuplicateAssessment;
    if (!assessment || assessment.level === 'none') {
      elements.manualDuplicateBox.hidden = true;
      elements.manualDuplicateBox.innerHTML = '';
      return;
    }

    const messages = assessment.highMessages.concat(assessment.mediumMessages).map(function (message) {
      return `<li>${escapeHtml(message)}</li>`;
    }).join('');

    elements.manualDuplicateBox.hidden = false;
    elements.manualDuplicateBox.dataset.level = assessment.level;
    elements.manualDuplicateBox.innerHTML = `
      <strong>${assessment.level === 'high' ? '检测到高疑似重复' : '检测到中疑似重复'}</strong>
      <p>仅提醒，不会阻止继续保存，也不会自动合并学生。</p>
      <ul>${messages}</ul>
    `;
  }

  function getManualDraft() {
    return {
      legal_name: elements.createLegalNameInput.value,
      display_name: elements.createDisplayNameInput.value,
      grade: elements.createGradeInput.value,
      parent_name: elements.createParentNameInput.value,
      parent_phone: elements.createParentPhoneInput.value,
      avatar_url: elements.createAvatarUrlInput.value,
      notes: elements.createNotesInput.value
    };
  }

  async function refreshManualDuplicates() {
    const draft = getManualDraft();
    if (!normalizeText(draft.legal_name)) {
      state.manualDuplicateAssessment = null;
      renderManualDuplicateBox();
      return;
    }

    try {
      const candidates = await fetchStudentDuplicateCandidates({
        legalNames: [draft.legal_name],
        parentPhones: [draft.parent_phone]
      });
      state.manualDuplicateAssessment = buildDuplicateAssessment(draft, candidates, [], null);
    } catch (error) {
      state.manualDuplicateAssessment = null;
      showInlineNotice(`疑似重复检查失败：${error.message}`, 'error');
    }

    renderManualDuplicateBox();
  }

  function queueManualDuplicateCheck() {
    window.clearTimeout(state.manualDuplicateTimer);
    state.manualDuplicateTimer = window.setTimeout(function () {
      refreshManualDuplicates();
    }, 260);
  }

  function resetCreateStudentForm() {
    elements.createStudentForm.reset();
    state.manualDuplicateAssessment = null;
    renderManualDuplicateBox();
  }

  function resetImportState() {
    state.importRows = [];
    elements.importFileInput.value = '';
    elements.importPreviewSummary.textContent = '上传 CSV 后，这里会显示预览、可导入数量和疑似重复提醒。';
    elements.importPreviewTableBody.innerHTML = '<tr><td colspan="7"><div class="empty-state">尚未上传 CSV 文件。</div></td></tr>';
    elements.confirmImportButton.disabled = true;
  }

  function getValidImportRows() {
    return state.importRows.filter(function (row) {
      return !row.validationErrors.length;
    });
  }

  function renderImportPreview() {
    if (!state.importRows.length) {
      resetImportState();
      return;
    }

    const validCount = getValidImportRows().length;
    const invalidCount = state.importRows.length - validCount;
    const highCount = state.importRows.filter(function (row) { return row.duplicateAssessment.level === 'high'; }).length;
    const mediumCount = state.importRows.filter(function (row) { return row.duplicateAssessment.level === 'medium'; }).length;

    elements.importPreviewSummary.textContent = `共预览 ${state.importRows.length} 条，可导入 ${validCount} 条，校验异常 ${invalidCount} 条，高疑似重复 ${highCount} 条，中疑似重复 ${mediumCount} 条。`;
    elements.confirmImportButton.disabled = validCount === 0;

    elements.importPreviewTableBody.innerHTML = state.importRows.map(function (row) {
      const duplicateText = row.duplicateAssessment.level === 'high'
        ? '高疑似重复'
        : (row.duplicateAssessment.level === 'medium' ? '中疑似重复' : '无');
      const duplicateLines = row.duplicateAssessment.highMessages.concat(row.duplicateAssessment.mediumMessages);
      const validationText = row.validationErrors.length ? row.validationErrors.join('；') : '可导入';

      return `
        <tr>
          <td>${row.rowNumber}</td>
          <td>${escapeHtml(row.display_name || row.legal_name || '-')}</td>
          <td>${escapeHtml(row.legal_name || '-')}</td>
          <td>${escapeHtml(row.grade || '-')}</td>
          <td>${escapeHtml(row.parent_phone || '-')}</td>
          <td>
            <span class="student-risk-badge is-${row.duplicateAssessment.level}">${escapeHtml(duplicateText)}</span>
            ${duplicateLines.length ? `<p class="students-risk-copy">${escapeHtml(duplicateLines.join('；'))}</p>` : ''}
          </td>
          <td>${escapeHtml(validationText)}</td>
        </tr>
      `;
    }).join('');
  }

  async function loadStudents() {
    if (!isSupabaseConfigured) {
      renderCampusOptions();
      renderSummary();
      showInlineNotice('缺少 Supabase 配置，请先在 .env 中填写 SUPABASE_URL 和 SUPABASE_ANON_KEY。', 'error');
      elements.studentsTableBody.innerHTML = '<tr><td colspan="8"><div class="empty-state">缺少 Supabase 配置，学生主档无法读取。</div></td></tr>';
      return;
    }

    state.isLoadingStudents = true;
    renderStudentsTable();

    try {
      state.students = await fetchStudentsList({
        search: state.search,
        status: state.status,
        limit: 300
      });
      showInlineNotice('', 'info');
    } catch (error) {
      state.students = [];
      showInlineNotice(`学生列表读取失败：${error.message}`, 'error');
    } finally {
      state.isLoadingStudents = false;
      renderSummary();
      renderStudentsTable();
    }
  }

  async function initialize() {
    renderCampusOptions();
    renderSummary();
    renderStudentsTable();
    resetImportState();

    if (!isSupabaseConfigured) {
      showInlineNotice('缺少 Supabase 配置，学生管理页暂时无法连接数据库。', 'error');
      return;
    }

    try {
      state.campuses = await fetchCampuses();
      renderCampusOptions();
    } catch (error) {
      showInlineNotice(`校区列表读取失败：${error.message}`, 'error');
    }

    await loadStudents();
  }

  async function handleCreateStudentSubmit(event) {
    event.preventDefault();
    if (state.isSaving) {
      return;
    }

    const draft = getManualDraft();
    const legalName = normalizeText(draft.legal_name);
    if (!legalName) {
      showNotice('正式姓名为必填项。', 'error');
      return;
    }

    state.isSaving = true;
    elements.submitCreateStudentButton.disabled = true;
    elements.submitCreateStudentButton.textContent = '保存中...';
    const duplicateAssessment = state.manualDuplicateAssessment;

    try {
      const [insertedStudent] = await createStudents([buildStudentInsertRow(draft, 0)]);
      closeDialog(elements.createStudentDialog);
      resetCreateStudentForm();
      await loadStudents();

      const duplicateMessages = duplicateAssessment
        ? duplicateAssessment.highMessages.concat(duplicateAssessment.mediumMessages)
        : [];
      const duplicateText = duplicateMessages.length ? ` 已提示疑似重复：${duplicateMessages[0]}` : '';
      showNotice(`学生主档已创建：${insertedStudent.display_name || insertedStudent.legal_name}。${duplicateText}`, duplicateMessages.length ? 'info' : 'success');
    } catch (error) {
      showNotice(`新增学生失败：${error.message}`, 'error');
    } finally {
      state.isSaving = false;
      elements.submitCreateStudentButton.disabled = false;
      elements.submitCreateStudentButton.textContent = '保存学生主档';
    }
  }

  async function handleImportFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) {
      resetImportState();
      return;
    }

    try {
      const text = await file.text();
      const parsedRows = parseCsv(text);
      if (!parsedRows.length) {
        throw new Error('CSV 文件为空');
      }

      const headers = parsedRows[0].map(function (header) {
        return normalizeText(header).replace(/^\uFEFF/, '');
      });
      const missingFields = CSV_FIELDS.filter(function (field) {
        return !headers.includes(field);
      });

      if (missingFields.length) {
        throw new Error(`CSV 缺少字段：${missingFields.join(', ')}`);
      }

      const headerIndexMap = headers.reduce(function (map, header, index) {
        map[header] = index;
        return map;
      }, {});

      const importRows = parsedRows.slice(1).map(function (cells, index) {
        const draft = {
          legal_name: normalizeText(cells[headerIndexMap.legal_name]),
          display_name: normalizeText(cells[headerIndexMap.display_name]),
          grade: normalizeText(cells[headerIndexMap.grade]),
          parent_name: normalizeText(cells[headerIndexMap.parent_name]),
          parent_phone: normalizeText(cells[headerIndexMap.parent_phone]),
          avatar_url: normalizeText(cells[headerIndexMap.avatar_url]),
          notes: normalizeText(cells[headerIndexMap.notes]),
          rowNumber: index + 2,
          validationErrors: []
        };
        if (!CSV_FIELDS.some(function (field) {
          return Boolean(draft[field]);
        })) {
          return null;
        }

        if (!draft.legal_name) {
          draft.validationErrors.push('legal_name 必填');
        }

        return draft;
      }).filter(Boolean);

      if (!importRows.length) {
        throw new Error('CSV 中没有可预览的数据行');
      }

      const candidates = await fetchStudentDuplicateCandidates({
        legalNames: importRows.map(function (row) { return row.legal_name; }),
        parentPhones: importRows.map(function (row) { return row.parent_phone; })
      });

      state.importRows = importRows.map(function (row) {
        return {
          ...row,
          duplicateAssessment: buildDuplicateAssessment(row, candidates, importRows, row.rowNumber)
        };
      });
      renderImportPreview();
    } catch (error) {
      resetImportState();
      showNotice(`CSV 解析失败：${error.message}`, 'error');
    }
  }

  async function handleConfirmImport() {
    const validRows = getValidImportRows();
    if (!validRows.length || state.isSaving) {
      return;
    }

    state.isSaving = true;
    elements.confirmImportButton.disabled = true;
    elements.confirmImportButton.textContent = '导入中...';

    try {
      const payload = validRows.map(function (row, index) {
        return buildStudentInsertRow(row, index + 1);
      });
      await createStudents(payload);
      const invalidCount = state.importRows.length - validRows.length;
      const highCount = state.importRows.filter(function (row) { return row.duplicateAssessment.level === 'high'; }).length;
      const mediumCount = state.importRows.filter(function (row) { return row.duplicateAssessment.level === 'medium'; }).length;

      closeDialog(elements.importStudentsDialog);
      resetImportState();
      await loadStudents();
      showNotice(`已导入 ${validRows.length} 条学生主档；跳过 ${invalidCount} 条无效行；高疑似重复 ${highCount} 条，中疑似重复 ${mediumCount} 条。`, 'success');
    } catch (error) {
      showNotice(`批量导入失败：${error.message}`, 'error');
    } finally {
      state.isSaving = false;
      elements.confirmImportButton.disabled = false;
      elements.confirmImportButton.textContent = '确认导入';
    }
  }

  elements.studentsSearchForm.addEventListener('submit', function (event) {
    event.preventDefault();
    state.search = normalizeText(elements.studentsSearchInput.value);
    loadStudents();
  });

  elements.clearStudentsSearchButton.addEventListener('click', function () {
    state.search = '';
    elements.studentsSearchInput.value = '';
    loadStudents();
  });

  elements.studentsStatusFilter.addEventListener('change', function (event) {
    state.status = event.target.value;
    loadStudents();
  });

  elements.studentsTableBody.addEventListener('click', function (event) {
    const button = event.target.closest('[data-view-student]');
    if (!button) {
      return;
    }

    state.selectedStudent = state.students.find(function (student) {
      return student.id === button.dataset.viewStudent;
    }) || null;
    renderDetail(state.selectedStudent);
    openDialog(elements.studentDetailDialog);
  });

  elements.openCreateStudentButton.addEventListener('click', function () {
    resetCreateStudentForm();
    openDialog(elements.createStudentDialog);
  });

  elements.closeCreateStudentButton.addEventListener('click', function () {
    closeDialog(elements.createStudentDialog);
  });

  elements.cancelCreateStudentButton.addEventListener('click', function () {
    closeDialog(elements.createStudentDialog);
  });

  elements.createStudentForm.addEventListener('submit', handleCreateStudentSubmit);

  [
    elements.createLegalNameInput,
    elements.createDisplayNameInput,
    elements.createGradeInput,
    elements.createParentPhoneInput
  ].forEach(function (input) {
    input.addEventListener('input', queueManualDuplicateCheck);
  });

  elements.openImportDialogButton.addEventListener('click', function () {
    resetImportState();
    openDialog(elements.importStudentsDialog);
  });

  elements.closeImportDialogButton.addEventListener('click', function () {
    closeDialog(elements.importStudentsDialog);
  });

  elements.cancelImportButton.addEventListener('click', function () {
    closeDialog(elements.importStudentsDialog);
  });

  elements.importFileInput.addEventListener('change', handleImportFileChange);
  elements.confirmImportButton.addEventListener('click', handleConfirmImport);

  elements.closeStudentDetailButton.addEventListener('click', function () {
    closeDialog(elements.studentDetailDialog);
  });

  elements.downloadTemplateButton.addEventListener('click', function () {
    const blob = new Blob([createCsvTemplate()], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'students-import-template.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  });

  mountSessionActions(document.querySelector('.header-actions'), authContext);
  initialize();
});
}
