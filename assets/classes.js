import { isSupabaseConfigured } from './supabase-client.js';
import { mountSessionActions, requirePageAuth } from './auth.js';
import {
  addStudentToClass,
  createClass,
  fetchCampuses,
  fetchClassMemberLinks,
  fetchClassRoster,
  fetchClassesDirectory,
  fetchSubjects,
  fetchTeachers,
  removeStudentFromClass,
  searchStudents
} from './supabase-service.js';
import {
  escapeHtml,
  formatDateTime
} from './shared-ui.js';

const CLASS_STATUS_META = {
  active: '进行中',
  draft: '草稿',
  archived: '已归档'
};

const STUDENT_STATUS_META = {
  normal: '正常',
  temporary: '临时',
  pending_merge: '待合并',
  merged: '已合并'
};

function normalizeText(value) {
  return String(value || '').trim();
}

const authContext = await requirePageAuth({ allowedRoles: ['admin'] });

if (authContext) {
  document.addEventListener('DOMContentLoaded', function () {
  const elements = {
    classesSearchForm: document.getElementById('classesSearchForm'),
    classesSearchInput: document.getElementById('classesSearchInput'),
    clearClassesSearchButton: document.getElementById('clearClassesSearchButton'),
    classesCampusFilter: document.getElementById('classesCampusFilter'),
    classesSubjectFilter: document.getElementById('classesSubjectFilter'),
    classesTotalCount: document.getElementById('classesTotalCount'),
    classesSelectedCount: document.getElementById('classesSelectedCount'),
    classesFilterSummary: document.getElementById('classesFilterSummary'),
    classesInlineNotice: document.getElementById('classesInlineNotice'),
    classesTableBody: document.getElementById('classesTableBody'),
    classDetailEmpty: document.getElementById('classDetailEmpty'),
    classDetailContent: document.getElementById('classDetailContent'),
    classDetailTitle: document.getElementById('classDetailTitle'),
    classDetailMeta: document.getElementById('classDetailMeta'),
    classDetailGrid: document.getElementById('classDetailGrid'),
    classRosterSummary: document.getElementById('classRosterSummary'),
    classRosterBody: document.getElementById('classRosterBody'),
    classStudentSearchForm: document.getElementById('classStudentSearchForm'),
    classStudentSearchInput: document.getElementById('classStudentSearchInput'),
    classStudentSearchHint: document.getElementById('classStudentSearchHint'),
    classStudentSearchResults: document.getElementById('classStudentSearchResults'),
    openCreateClassButton: document.getElementById('openCreateClassButton'),
    classesNotice: document.getElementById('classesNotice'),
    createClassDialog: document.getElementById('createClassDialog'),
    createClassForm: document.getElementById('createClassForm'),
    closeCreateClassButton: document.getElementById('closeCreateClassButton'),
    cancelCreateClassButton: document.getElementById('cancelCreateClassButton'),
    createClassNameInput: document.getElementById('createClassNameInput'),
    createClassCampusSelect: document.getElementById('createClassCampusSelect'),
    createClassSubjectSelect: document.getElementById('createClassSubjectSelect'),
    createClassTeacherSelect: document.getElementById('createClassTeacherSelect'),
    createClassTypeSelect: document.getElementById('createClassTypeSelect'),
    createClassStatusSelect: document.getElementById('createClassStatusSelect'),
    createClassScheduleInput: document.getElementById('createClassScheduleInput')
  };

  const state = {
    campuses: [],
    subjects: [],
    teachers: [],
    classes: [],
    classMemberLinks: [],
    selectedClassId: '',
    classSearch: '',
    campusFilter: 'all',
    subjectFilter: 'all',
    roster: [],
    searchResults: [],
    loadingClasses: false,
    loadingDetail: false,
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
      elements.classesInlineNotice.hidden = true;
      elements.classesInlineNotice.textContent = '';
      elements.classesInlineNotice.dataset.type = '';
      return;
    }

    elements.classesInlineNotice.hidden = false;
    elements.classesInlineNotice.dataset.type = type || 'info';
    elements.classesInlineNotice.textContent = message;
  }

  function showNotice(message, type) {
    elements.classesNotice.textContent = message;
    elements.classesNotice.hidden = false;
    elements.classesNotice.dataset.type = type || 'info';
    window.clearTimeout(showNotice.timer);
    showNotice.timer = window.setTimeout(function () {
      elements.classesNotice.hidden = true;
    }, 2600);
  }

  function buildClassStatusLabel(status) {
    return CLASS_STATUS_META[status] || status || '未设置';
  }

  function buildStudentStatusLabel(status) {
    return STUDENT_STATUS_META[status] || status || '未设置';
  }

  function getSelectedClass() {
    return state.classes.find(function (classItem) {
      return classItem.id === state.selectedClassId;
    }) || null;
  }

  function getClassMemberCountMap() {
    return state.classMemberLinks.reduce(function (map, row) {
      const nextCount = (map.get(row.class_id) || 0) + 1;
      map.set(row.class_id, nextCount);
      return map;
    }, new Map());
  }

  function getFilteredClasses() {
    const keyword = state.classSearch.toLowerCase();
    return state.classes.filter(function (classItem) {
      if (state.campusFilter !== 'all' && classItem.campus_id !== state.campusFilter) {
        return false;
      }
      if (state.subjectFilter !== 'all' && classItem.subject_id !== state.subjectFilter) {
        return false;
      }
      if (keyword && !String(classItem.class_name || '').toLowerCase().includes(keyword)) {
        return false;
      }
      return true;
    });
  }

  function syncSelectedClass() {
    const filteredClasses = getFilteredClasses();
    if (!filteredClasses.length) {
      state.selectedClassId = '';
      state.roster = [];
      state.searchResults = [];
      return false;
    }

    const exists = filteredClasses.some(function (classItem) {
      return classItem.id === state.selectedClassId;
    });

    if (!exists) {
      state.selectedClassId = filteredClasses[0].id;
      return true;
    }

    return false;
  }

  function renderFilterOptions() {
    const campusOptions = ['<option value="all">全部校区</option>'].concat(
      state.campuses.map(function (campus) {
        return `<option value="${escapeHtml(campus.id)}">${escapeHtml(campus.name)}</option>`;
      })
    );
    const subjectOptions = ['<option value="all">全部学科</option>'].concat(
      state.subjects.map(function (subject) {
        return `<option value="${escapeHtml(subject.id)}">${escapeHtml(subject.name)}</option>`;
      })
    );

    elements.classesCampusFilter.innerHTML = campusOptions.join('');
    elements.classesSubjectFilter.innerHTML = subjectOptions.join('');
    elements.classesCampusFilter.value = state.campusFilter;
    elements.classesSubjectFilter.value = state.subjectFilter;

    elements.createClassCampusSelect.innerHTML = state.campuses.map(function (campus) {
      return `<option value="${escapeHtml(campus.id)}">${escapeHtml(campus.name)}</option>`;
    }).join('');
    elements.createClassSubjectSelect.innerHTML = state.subjects.map(function (subject) {
      return `<option value="${escapeHtml(subject.id)}">${escapeHtml(subject.name)}</option>`;
    }).join('');
  }

  function renderCreateTeacherOptions() {
    const teachers = state.teachers.slice().sort(function (left, right) {
      const leftName = String(left.display_name || left.name || '');
      const rightName = String(right.display_name || right.name || '');
      return leftName.localeCompare(rightName, 'zh-CN');
    });

    const options = ['<option value="">\u6682\u4e0d\u5206\u914d\u8001\u5e08</option>'].concat(
      teachers.map(function (teacher) {
        return `<option value="${escapeHtml(teacher.id)}">${escapeHtml(teacher.display_name || teacher.name)}</option>`;
      })
    );

    elements.createClassTeacherSelect.innerHTML = options.join('');
  }

  function renderSummary() {
    const filteredClasses = getFilteredClasses();
    elements.classesTotalCount.textContent = String(filteredClasses.length);
    elements.classesSelectedCount.textContent = String(state.roster.length);

    const parts = [];
    if (state.campusFilter !== 'all') {
      const campus = state.campuses.find(function (item) {
        return item.id === state.campusFilter;
      });
      parts.push(`校区：${campus?.name || '未知'}`);
    }
    if (state.subjectFilter !== 'all') {
      const subject = state.subjects.find(function (item) {
        return item.id === state.subjectFilter;
      });
      parts.push(`学科：${subject?.name || '未知'}`);
    }
    if (state.classSearch) {
      parts.push(`搜索：${state.classSearch}`);
    }
    elements.classesFilterSummary.textContent = parts.length ? parts.join(' / ') : '全部班级';
  }

  function renderClassTable() {
    if (state.loadingClasses) {
      elements.classesTableBody.innerHTML = '<tr><td colspan="8"><div class="empty-state">正在读取班级目录...</div></td></tr>';
      return;
    }

    const countMap = getClassMemberCountMap();
    const filteredClasses = getFilteredClasses();
    if (!filteredClasses.length) {
      elements.classesTableBody.innerHTML = '<tr><td colspan="8"><div class="empty-state">当前没有符合条件的班级。</div></td></tr>';
      return;
    }

    elements.classesTableBody.innerHTML = filteredClasses.map(function (classItem) {
      const isActive = classItem.id === state.selectedClassId;
      const teacherName = classItem.teachers?.display_name || classItem.teachers?.name || '未分配老师';
      const campusName = classItem.campuses?.name || '未设置校区';
      const subjectName = classItem.subjects?.name || '未设置学科';
      const memberCount = countMap.get(classItem.id) || 0;

      return `
        <tr class="classes-row ${isActive ? 'is-active' : ''}">
          <td><strong>${escapeHtml(classItem.class_name)}</strong></td>
          <td>${escapeHtml(campusName)}</td>
          <td>${escapeHtml(subjectName)}</td>
          <td>${escapeHtml(teacherName)}</td>
          <td><span class="class-status-badge is-${escapeHtml(classItem.status)}">${escapeHtml(buildClassStatusLabel(classItem.status))}</span></td>
          <td>${memberCount}</td>
          <td>${escapeHtml(formatDateTime(classItem.created_at))}</td>
          <td><button class="inline-button" type="button" data-view-class="${escapeHtml(classItem.id)}">查看</button></td>
        </tr>
      `;
    }).join('');
  }

  function renderSearchResults() {
    const selectedClass = getSelectedClass();
    if (!selectedClass) {
      elements.classStudentSearchResults.innerHTML = '<div class="empty-state">先选择班级，再搜索学生加入。</div>';
      return;
    }

    if (!state.searchResults.length) {
      elements.classStudentSearchResults.innerHTML = '<div class="empty-state">输入关键字后搜索，或直接查看最近学生主档。</div>';
      return;
    }

    elements.classStudentSearchResults.innerHTML = state.searchResults.map(function (student) {
      const alreadyJoined = state.roster.some(function (member) {
        return member.student_id === student.id;
      });
      const legalName = student.legal_name && student.legal_name !== student.display_name ? `（${student.legal_name}）` : '';
      return `
        <article class="teacher-search-card">
          <div class="teacher-search-card__text">
            <h3>${escapeHtml(student.display_name || student.legal_name)} ${escapeHtml(legalName)}</h3>
            <p>${escapeHtml(student.grade || '未设置年级')} · ${escapeHtml(student.student_code || '未生成学号')} · ${escapeHtml(buildStudentStatusLabel(student.status))}</p>
            <p>家长手机号：${escapeHtml(student.parent_phone || '未填写')}</p>
          </div>
          <button class="${alreadyJoined ? 'ghost-button' : 'primary-button'}" type="button" data-add-class-student="${escapeHtml(student.id)}" ${alreadyJoined ? 'disabled' : ''}>
            ${alreadyJoined ? '该学生已在本班' : '加入班级'}
          </button>
        </article>
      `;
    }).join('');
  }

  function renderClassDetail() {
    const selectedClass = getSelectedClass();
    const hasClass = Boolean(selectedClass);
    elements.classDetailEmpty.hidden = hasClass;
    elements.classDetailContent.hidden = !hasClass;

    if (!hasClass) {
      return;
    }

    const campusName = selectedClass.campuses?.name || '未设置校区';
    const subjectName = selectedClass.subjects?.name || '未设置学科';
    const teacherName = selectedClass.teachers?.display_name || selectedClass.teachers?.name || '未分配老师';

    elements.classDetailTitle.textContent = selectedClass.class_name;
    elements.classDetailMeta.textContent = `${campusName} · ${subjectName} · ${teacherName}`;
    elements.classDetailGrid.innerHTML = `
      <div><span>班级名称</span><strong>${escapeHtml(selectedClass.class_name)}</strong></div>
      <div><span>校区</span><strong>${escapeHtml(campusName)}</strong></div>
      <div><span>学科</span><strong>${escapeHtml(subjectName)}</strong></div>
      <div><span>老师</span><strong>${escapeHtml(teacherName)}</strong></div>
      <div><span>班级类型</span><strong>${escapeHtml(selectedClass.class_type || 'regular')}</strong></div>
      <div><span>班级状态</span><strong>${escapeHtml(buildClassStatusLabel(selectedClass.status))}</strong></div>
      <div><span>上课时间</span><strong>${escapeHtml(selectedClass.schedule_text || '未设置')}</strong></div>
      <div><span>创建时间</span><strong>${escapeHtml(formatDateTime(selectedClass.created_at))}</strong></div>
    `;

    if (state.loadingDetail) {
      elements.classRosterSummary.textContent = '正在读取班级学生...';
      elements.classRosterBody.innerHTML = '<tr><td colspan="6"><div class="empty-state">正在读取当前班级学生...</div></td></tr>';
      return;
    }

    elements.classRosterSummary.textContent = `当前班级共 ${state.roster.length} 名学生`;
    if (!state.roster.length) {
      elements.classRosterBody.innerHTML = '<tr><td colspan="6"><div class="empty-state">当前班级还没有学生，请先从学生主档搜索并加入。</div></td></tr>';
    } else {
      elements.classRosterBody.innerHTML = state.roster.map(function (student) {
        return `<tr>
            <td>${escapeHtml(student.display_name || student.legal_name || '-')}</td>
            <td>${escapeHtml(student.legal_name || '-')}</td>
            <td>${escapeHtml(student.grade || '-')}</td>
            <td>${escapeHtml(buildStudentStatusLabel(student.status))}</td>
            <td>${escapeHtml(formatDateTime(student.joined_at))}</td>
            <td><button class="inline-button class-roster-remove-button" type="button" data-remove-class-student="${escapeHtml(student.student_id)}">\u79fb\u51fa</button></td>
          </tr>`;
      }).join('');
    }

    renderSearchResults();
  }

  function renderAll() {
    renderFilterOptions();
    renderCreateTeacherOptions();
    renderSummary();
    renderClassTable();
    renderClassDetail();
  }

  async function refreshDirectory(nextSelectedId, loadDetail) {
    state.loadingClasses = true;
    renderClassTable();

    try {
      const [classes, classMemberLinks] = await Promise.all([
        fetchClassesDirectory(),
        fetchClassMemberLinks()
      ]);
      state.classes = classes;
      state.classMemberLinks = classMemberLinks;
      if (typeof nextSelectedId === 'string') {
        state.selectedClassId = nextSelectedId;
      }
      const changedSelection = syncSelectedClass();
      renderAll();
      if (loadDetail || changedSelection) {
        await loadSelectedClassDetail(true);
      }
      showInlineNotice('');
    } catch (error) {
      state.classes = [];
      state.classMemberLinks = [];
      state.selectedClassId = '';
      state.roster = [];
      state.searchResults = [];
      renderAll();
      showInlineNotice(`班级目录读取失败：${error.message}`, 'error');
    } finally {
      state.loadingClasses = false;
      renderClassTable();
    }
  }

  async function loadSelectedClassDetail(prefillSearch) {
    const selectedClass = getSelectedClass();
    if (!selectedClass) {
      state.roster = [];
      state.searchResults = [];
      renderClassDetail();
      return;
    }

    state.loadingDetail = true;
    renderClassDetail();

    try {
      state.roster = await fetchClassRoster(selectedClass.id);
      showInlineNotice('');
      renderClassDetail();
      if (prefillSearch) {
        await handleStudentSearch();
      }
    } catch (error) {
      state.roster = [];
      renderClassDetail();
      showInlineNotice(`班级详情读取失败：${error.message}`, 'error');
    } finally {
      state.loadingDetail = false;
      renderClassDetail();
    }
  }

  async function initialize() {
    renderAll();

    if (!isSupabaseConfigured) {
      showInlineNotice('缺少 Supabase 配置，请先在 .env 中填写 SUPABASE_URL 和 SUPABASE_ANON_KEY。', 'error');
      elements.classesTableBody.innerHTML = '<tr><td colspan="8"><div class="empty-state">缺少 Supabase 配置，班级页无法读取真实数据。</div></td></tr>';
      return;
    }

    try {
      const [campuses, subjects, teachers] = await Promise.all([
        fetchCampuses(),
        fetchSubjects(),
        fetchTeachers()
      ]);
      state.campuses = campuses;
      state.subjects = subjects;
      state.teachers = teachers;
      renderAll();
      await refreshDirectory('', true);
    } catch (error) {
      showInlineNotice(`初始化失败：${error.message}`, 'error');
    }
  }

  async function handleStudentSearch(event) {
    if (event) {
      event.preventDefault();
    }

    const selectedClass = getSelectedClass();
    if (!selectedClass) {
      showNotice('请先选择班级。', 'error');
      return;
    }

    try {
      state.searchResults = await searchStudents(elements.classStudentSearchInput.value || '');
      elements.classStudentSearchHint.textContent = `搜索到 ${state.searchResults.length} 条学生主档，可直接加入当前班级。`;
      renderSearchResults();
    } catch (error) {
      state.searchResults = [];
      renderSearchResults();
      elements.classStudentSearchHint.textContent = `搜索失败：${error.message}`;
    }
  }

  async function handleCreateClassSubmit(event) {
    event.preventDefault();
    if (state.isSaving) {
      return;
    }

    const className = normalizeText(elements.createClassNameInput.value);
    const campusId = elements.createClassCampusSelect.value;
    const subjectId = elements.createClassSubjectSelect.value;
    const teacherId = elements.createClassTeacherSelect.value || null;
    const classType = elements.createClassTypeSelect.value || 'regular';
    const status = elements.createClassStatusSelect.value || 'active';
    const scheduleText = normalizeText(elements.createClassScheduleInput.value);

    if (!className || !campusId || !subjectId) {
      showNotice('请完整填写班级名称、校区和学科。', 'error');
      return;
    }

    state.isSaving = true;

    try {
      const createdClass = await createClass({
        class_name: className,
        campus_id: campusId,
        subject_id: subjectId,
        teacher_id: teacherId,
        schedule_text: scheduleText || null,
        class_type: classType,
        status,
        created_by_id: teacherId
      });
      closeDialog(elements.createClassDialog);
      elements.createClassForm.reset();
      renderCreateTeacherOptions();
      await refreshDirectory(createdClass.id, true);
      showNotice(`已创建班级：${createdClass.class_name}`, 'success');
    } catch (error) {
      if (!teacherId && String(error.message || '').includes('teacher_id')) {
        showInlineNotice('当前数据库仍要求 teacher_id 非空；如果要允许空老师，请先执行 supabase/004_classes_teacher_nullable.sql，或先选择一个老师。', 'error');
      } else {
        showInlineNotice(`创建班级失败：${error.message}`, 'error');
      }
    } finally {
      state.isSaving = false;
    }
  }

  async function handleAddStudent(studentId) {
    const selectedClass = getSelectedClass();
    if (!selectedClass) {
      showNotice('请先选择班级。', 'error');
      return;
    }

    const alreadyJoined = state.roster.some(function (student) {
      return student.student_id === studentId;
    });
    if (alreadyJoined) {
      showNotice('该学生已在本班。', 'info');
      return;
    }

    try {
      await addStudentToClass({
        class_id: selectedClass.id,
        student_id: studentId,
        member_status: 'active',
        joined_by_id: selectedClass.teacher_id || null,
        notes: '班级管理页加入班级'
      });
      await refreshDirectory(selectedClass.id, true);
      showNotice('学生已加入当前班级。', 'success');
    } catch (error) {
      if (error.code === '23505') {
        showNotice('该学生已在本班。', 'info');
        return;
      }
      showInlineNotice(`加入班级失败：${error.message}`, 'error');
    }
  }

  async function handleRemoveStudent(studentId) {
    const selectedClass = getSelectedClass();
    if (!selectedClass || !studentId) {
      showNotice('\u8bf7\u5148\u9009\u62e9\u73ed\u7ea7\u3002', 'error');
      return;
    }

    const targetStudent = state.roster.find(function (student) {
      return student.student_id === studentId;
    });
    const studentName = targetStudent?.display_name || targetStudent?.legal_name || '\u8be5\u5b66\u751f';
    const confirmed = window.confirm(`\u786e\u8ba4\u628a${studentName}\u79fb\u51fa\u5f53\u524d\u73ed\u7ea7\u5417\uff1f`);
    if (!confirmed) {
      return;
    }

    try {
      await removeStudentFromClass({
        classId: selectedClass.id,
        studentId,
        notes: '\u7ba1\u7406\u7aef\u79fb\u51fa\u73ed\u7ea7'
      });
      await refreshDirectory(selectedClass.id, true);
      showNotice(`${studentName} \u5df2\u79fb\u51fa\u5f53\u524d\u73ed\u7ea7\u3002`, 'success');
    } catch (error) {
      showInlineNotice(`\u79fb\u51fa\u73ed\u7ea7\u5931\u8d25\uff1a${error.message}`, 'error');
    }
  }

  function openCreateClassDialog() {
    elements.createClassCampusSelect.value = state.campusFilter !== 'all' ? state.campusFilter : (state.campuses[0]?.id || '');
    elements.createClassSubjectSelect.value = state.subjectFilter !== 'all' ? state.subjectFilter : (state.subjects[0]?.id || '');
    elements.createClassStatusSelect.value = 'active';
    elements.createClassTypeSelect.value = 'regular';
    renderCreateTeacherOptions();
    openDialog(elements.createClassDialog);
  }

  elements.classesSearchForm.addEventListener('submit', function (event) {
    event.preventDefault();
    state.classSearch = normalizeText(elements.classesSearchInput.value);
    const changedSelection = syncSelectedClass();
    renderAll();
    if (changedSelection) {
      loadSelectedClassDetail(true);
    }
  });

  elements.clearClassesSearchButton.addEventListener('click', function () {
    state.classSearch = '';
    elements.classesSearchInput.value = '';
    const changedSelection = syncSelectedClass();
    renderAll();
    if (changedSelection) {
      loadSelectedClassDetail(true);
    }
  });

  elements.classesCampusFilter.addEventListener('change', function (event) {
    state.campusFilter = event.target.value;
    const changedSelection = syncSelectedClass();
    renderAll();
    if (changedSelection) {
      loadSelectedClassDetail(true);
    }
  });

  elements.classesSubjectFilter.addEventListener('change', function (event) {
    state.subjectFilter = event.target.value;
    const changedSelection = syncSelectedClass();
    renderAll();
    if (changedSelection) {
      loadSelectedClassDetail(true);
    }
  });

  elements.classesTableBody.addEventListener('click', function (event) {
    const button = event.target.closest('[data-view-class]');
    if (!button) {
      return;
    }
    state.selectedClassId = button.dataset.viewClass;
    renderAll();
    loadSelectedClassDetail(true);
  });

  elements.classStudentSearchForm.addEventListener('submit', handleStudentSearch);
  elements.classStudentSearchResults.addEventListener('click', function (event) {
    const button = event.target.closest('[data-add-class-student]');
    if (!button) {
      return;
    }
    handleAddStudent(button.dataset.addClassStudent);
  });

  elements.classRosterBody.addEventListener('click', function (event) {
    const button = event.target.closest('[data-remove-class-student]');
    if (!button) {
      return;
    }
    handleRemoveStudent(button.dataset.removeClassStudent);
  });

  elements.openCreateClassButton.addEventListener('click', openCreateClassDialog);
  elements.closeCreateClassButton.addEventListener('click', function () {
    closeDialog(elements.createClassDialog);
  });
  elements.cancelCreateClassButton.addEventListener('click', function () {
    closeDialog(elements.createClassDialog);
  });
  elements.createClassCampusSelect.addEventListener('change', renderCreateTeacherOptions);
  elements.createClassForm.addEventListener('submit', handleCreateClassSubmit);

  mountSessionActions(document.querySelector('.header-actions'), authContext);
  initialize();
});
}