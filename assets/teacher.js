import { isSupabaseConfigured } from './supabase-client.js';
import { getAuthDisplayName, mountSessionActions, requirePageAuth } from './auth.js';
import {
  addStudentToClass,
  createClass,
  fetchBadgeDefinitions,
  fetchCampuses,
  fetchClasses,
  fetchClassRoster,
  fetchLevelTiers,
  fetchPointRules,
  fetchStudentBadgeProgress,
  fetchStudentLedger,
  fetchSubjects,
  fetchTeachers,
  insertStudentBadgeEvent,
  insertPointLedger,
  removeStudentFromClass,
  searchStudents
} from './supabase-service.js';
import {
  CATEGORY_META,
  createAvatarHtml,
  escapeHtml,
  formatDateTime,
  getStudentDisplayName,
  getTierProgress,
  groupRulesByCategory,
  normalizeTierList
} from './shared-ui.js';

const ACTION_TYPE_META = {
  add: '加分',
  batch_add: '整班加分',
  deduct: '兑换扣分',
  seed: '补录积分'
};

const isFileMode = window.location.protocol === 'file:';
const authContext = isFileMode ? null : await requirePageAuth({ allowedRoles: ['admin', 'teacher'] });

function mountFileModeFallback() {
  const fileNotice = document.getElementById('fileModeNotice');
  const campusSelect = document.getElementById('campusSelect');
  const classSelect = document.getElementById('classSelect');
  const selectedState = document.getElementById('selectedState');
  const selectionHint = document.getElementById('selectionHint');

  if (fileNotice) {
    fileNotice.hidden = false;
  }
  if (campusSelect) {
    campusSelect.innerHTML = "<option value=\"\">Use http://127.0.0.1:4175</option>";
    campusSelect.disabled = true;
  }
  if (classSelect) {
    classSelect.innerHTML = "<option value=\"\">File mode disabled</option>";
    classSelect.disabled = true;
  }
  if (selectedState) {
    selectedState.textContent = 'Use local server URL';
  }
  if (selectionHint) {
    selectionHint.textContent = 'file:// mode is disabled for real data.';
  }

  ['openCreateClassButton', 'openAddStudentButton', 'classBoostToggleButton', 'removeSelectedStudentButton', 'openSeedDialogButton', 'openRedeemButton'].forEach(function (id) {
    const button = document.getElementById(id);
    if (button) {
      button.disabled = true;
    }
  });
}

if (isFileMode) {
  mountFileModeFallback();
} else if (authContext) {
  const initTeacherPage = function () {
    const desktopMedia = window.matchMedia('(min-width: 1024px)');

    const elements = {
      campusSelect: document.getElementById('campusSelect'),
      classSelect: document.getElementById('classSelect'),
      campusRailShell: document.getElementById('campusRailShell'),
      campusRail: document.getElementById('campusRail'),
      campusRailPrevButton: document.getElementById('campusRailPrevButton'),
      campusRailNextButton: document.getElementById('campusRailNextButton'),
      classRailShell: document.getElementById('classRailShell'),
      classRail: document.getElementById('classRail'),
      classRailPrevButton: document.getElementById('classRailPrevButton'),
      classRailNextButton: document.getElementById('classRailNextButton'),
      classMeta: document.getElementById('classMeta'),
      studentGrid: document.getElementById('studentGrid'),
      studentCount: document.getElementById('studentCount'),
      classPoints: document.getElementById('classPoints'),
      selectedState: document.getElementById('selectedState'),
      selectionHint: document.getElementById('selectionHint'),
      classBoostToggleButton: document.getElementById('classBoostToggleButton'),
      classBoostDialog: document.getElementById('classBoostDialog'),
      classBoostDialogText: document.getElementById('classBoostDialogText'),
      classBoostDialogConfirmButton: document.getElementById('classBoostDialogConfirmButton'),
      classBoostDialogCancelButton: document.getElementById('classBoostDialogCancelButton'),
      classBoostDialogCloseButton: document.getElementById('classBoostDialogCloseButton'),
      classBoostConfirmBar: document.getElementById('classBoostConfirmBar'),
      classBoostPrompt: document.getElementById('classBoostPrompt'),
      classBoostConfirmButton: document.getElementById('classBoostConfirmButton'),
      classBoostCancelButton: document.getElementById('classBoostCancelButton'),
      teacherInlineNotice: document.getElementById('teacherInlineNotice'),
      openCreateClassButton: document.getElementById('openCreateClassButton'),
      openAddStudentButton: document.getElementById('openAddStudentButton'),
      teacherPanel: document.getElementById('teacherPanel'),
      panelEmptyState: document.getElementById('panelEmptyState'),
      panelContent: document.getElementById('panelContent'),
      panelBackButton: document.getElementById('panelBackButton'),
      closeSheetButton: document.getElementById('closeSheetButton'),
      sheetOverlay: document.getElementById('sheetOverlay'),
      studentSpotlight: document.getElementById('studentSpotlight'),
      removeSelectedStudentButton: document.getElementById('removeSelectedStudentButton'),
      openSeedDialogButton: document.getElementById('openSeedDialogButton'),
      openRedeemButton: document.getElementById('openRedeemButton'),
      redeemHint: document.getElementById('redeemHint'),
      categoryTabs: document.getElementById('categoryTabs'),
      activeCategoryTitle: document.getElementById('activeCategoryTitle'),
      activeCategoryTip: document.getElementById('activeCategoryTip'),
      actionCards: document.getElementById('actionCards'),
      badgeActionCards: document.getElementById('badgeActionCards'),
      badgeProgressList: document.getElementById('badgeProgressList'),
      studentRecordList: document.getElementById('studentRecordList'),
      toast: document.getElementById('toast'),
      fileModeNotice: document.getElementById('fileModeNotice'),
      createClassDialog: document.getElementById('createClassDialog'),
      createClassForm: document.getElementById('createClassForm'),
      closeCreateClassButton: document.getElementById('closeCreateClassButton'),
      cancelCreateClassButton: document.getElementById('cancelCreateClassButton'),
      createClassNameInput: document.getElementById('createClassNameInput'),
      createClassCampusSelect: document.getElementById('createClassCampusSelect'),
      createClassSubjectSelect: document.getElementById('createClassSubjectSelect'),
      createClassTeacherSelect: document.getElementById('createClassTeacherSelect'),
      createClassTypeSelect: document.getElementById('createClassTypeSelect'),
      createClassScheduleInput: document.getElementById('createClassScheduleInput'),
      createClassTeacherHint: document.getElementById('createClassTeacherHint'),
      addStudentDialog: document.getElementById('addStudentDialog'),
      closeAddStudentButton: document.getElementById('closeAddStudentButton'),
      studentSearchForm: document.getElementById('studentSearchForm'),
      studentSearchInput: document.getElementById('studentSearchInput'),
      studentSearchHint: document.getElementById('studentSearchHint'),
      studentSearchResults: document.getElementById('studentSearchResults'),
      seedDialog: document.getElementById('seedDialog'),
      seedForm: document.getElementById('seedForm'),
      closeSeedDialogButton: document.getElementById('closeSeedDialogButton'),
      cancelSeedButton: document.getElementById('cancelSeedButton'),
      seedStudentMeta: document.getElementById('seedStudentMeta'),
      seedPointsInput: document.getElementById('seedPointsInput'),
      seedRemarkInput: document.getElementById('seedRemarkInput'),
      seedPreview: document.getElementById('seedPreview'),
      seedSubmitButton: document.getElementById('seedSubmitButton'),

      redeemDialog: document.getElementById('redeemDialog'),
      redeemForm: document.getElementById('redeemForm'),
      closeRedeemButton: document.getElementById('closeRedeemButton'),
      cancelRedeemButton: document.getElementById('cancelRedeemButton'),
      redeemStudentMeta: document.getElementById('redeemStudentMeta'),
      redeemItemInput: document.getElementById('redeemItemInput'),
      redeemPointsInput: document.getElementById('redeemPointsInput'),
      redeemPreview: document.getElementById('redeemPreview'),
      redeemSubmitButton: document.getElementById('redeemSubmitButton')
    };

    const state = {
      campuses: [],
      subjects: [],
      teachers: [],
      classes: [],
      pointRules: [],
      badgeDefinitions: [],
      levelTiers: normalizeTierList([]),
      campusId: '',
      classId: '',
      roster: [],
      selectedStudentId: null,
      studentRecords: [],
      studentBadgeProgress: [],
      activeCategory: 'classroom',
      isMobilePanelOpen: false,
      classBoostArmed: false,
      feedback: null,
      badgeFeedback: null,
      searchResults: [],
      loadingRoster: false,
      loadingStudentDetails: false,
      authContext,
      isSavingClass: false,
      isRedeeming: false,
      isSeeding: false,
      isSavingBadgeEvent: false,
      savingBadgeDefinitionId: '',
      isCreatingTempStudent: false,
      lastSearchKeyword: ''
    };

    function getSelectedClass() {
      return state.classes.find(function (item) {
        return item.id === state.classId;
      }) || null;
    }

    function getSelectedStudent() {
      return state.roster.find(function (item) {
        return item.student_id === state.selectedStudentId;
      }) || null;
    }

    function getCurrentRules() {
      return groupRulesByCategory(state.pointRules);
    }

    function getSelectedBadgeProgress() {
      return state.studentBadgeProgress.filter(function (row) {
        return row.student_id === state.selectedStudentId;
      });
    }

    function getBadgeProgressRow(badgeDefinitionId) {
      return getSelectedBadgeProgress().find(function (row) {
        return row.badge_definition_id === badgeDefinitionId;
      }) || null;
    }

    function getBadgeSummary(rows) {
      const progressRows = Array.isArray(rows) ? rows : [];
      const unlockedRows = progressRows.filter(function (row) {
        return Boolean(row.unlocked_at);
      });
      const latestUnlocked = unlockedRows
        .slice()
        .sort(function (left, right) {
          return new Date(right.unlocked_at).getTime() - new Date(left.unlocked_at).getTime();
        })[0] || null;
      const nextLocked = progressRows
        .filter(function (row) {
          return !row.unlocked_at;
        })
        .sort(function (left, right) {
          if (Number(left.remaining_count || 0) !== Number(right.remaining_count || 0)) {
            return Number(left.remaining_count || 0) - Number(right.remaining_count || 0);
          }
          return Number(left.sort_order || 0) - Number(right.sort_order || 0);
        })[0] || null;

      return {
        unlockedCount: unlockedRows.length,
        totalCount: progressRows.length,
        latestUnlocked,
        nextLocked
      };
    }

    function getCampusName(campusId) {
      const campus = state.campuses.find(function (item) {
        return item.id === campusId;
      });
      return campus ? campus.name : '';
    }

    function getTeacherDisplayName(teacher) {
      return teacher?.display_name || teacher?.name || '未分配老师';
    }

    function getTeachersByCampus(campusId) {
      return state.teachers.filter(function (teacher) {
        return !campusId || teacher.campus_id === campusId;
      });
    }

    function getAvailableCampuses() {
      if (!state.authContext?.isTeacher) {
        return state.campuses;
      }

      const campusIds = new Set(
        state.classes.map(function (classItem) {
          return classItem.campus_id;
        }).filter(Boolean)
      );

      const teacherCampusId = state.authContext.profile?.teacher?.campus_id || '';
      if (teacherCampusId) {
        campusIds.add(teacherCampusId);
      }

      if (!campusIds.size) {
        return state.campuses;
      }

      return state.campuses.filter(function (campus) {
        return campusIds.has(campus.id);
      });
    }

    function getClassQueryOptions() {
      if (state.authContext?.isTeacher) {
        return { teacherId: state.authContext.teacherId };
      }
      return {};
    }

    function filteredClasses() {
      return state.classes.filter(function (classItem) {
        return !state.campusId || classItem.campus_id === state.campusId;
      });
    }

    function ensureCategorySelection() {
      const rules = getCurrentRules();
      const categoryKeys = Object.keys(rules);
      if (!categoryKeys.includes(state.activeCategory)) {
        state.activeCategory = categoryKeys[0] || 'classroom';
      }
    }

    function clearFeedbackLater() {
      window.clearTimeout(clearFeedbackLater.timer);
      clearFeedbackLater.timer = window.setTimeout(function () {
        state.feedback = null;
        state.badgeFeedback = null;
        renderAll();
      }, 1800);
    }

    function showToast(message) {
      elements.toast.textContent = message;
      elements.toast.hidden = false;
      window.clearTimeout(showToast.timer);
      showToast.timer = window.setTimeout(function () {
        elements.toast.hidden = true;
      }, 2200);
    }

    function showInlineNotice(message, type) {
      if (!message) {
        elements.teacherInlineNotice.hidden = true;
        elements.teacherInlineNotice.textContent = '';
        elements.teacherInlineNotice.dataset.type = '';
        return;
      }
      elements.teacherInlineNotice.hidden = false;
      elements.teacherInlineNotice.dataset.type = type || 'info';
      elements.teacherInlineNotice.textContent = message;
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

    function openClassBoostDialog() {
      const selectedClass = getSelectedClass();
      if (!selectedClass || !state.roster.length) {
        return;
      }
      if (elements.classBoostDialogText) {
        elements.classBoostDialogText.textContent = `${selectedClass.class_name} 全班 ${state.roster.length} 人统一 +1`;
      }
      if (elements.classBoostDialogConfirmButton) {
        elements.classBoostDialogConfirmButton.disabled = false;
        elements.classBoostDialogConfirmButton.textContent = '确认加分';
      }
      openDialog(elements.classBoostDialog);
    }

    function closeClassBoostDialog() {
      closeDialog(elements.classBoostDialog);
      if (elements.classBoostDialogConfirmButton) {
        elements.classBoostDialogConfirmButton.disabled = false;
        elements.classBoostDialogConfirmButton.textContent = '确认加分';
      }
    }

    function openSeedDialog() {
      const student = getSelectedStudent();
      if (!student) {
        showToast('请先选择学生');
        return;
      }
      elements.seedForm.reset();
      elements.seedRemarkInput.value = '历史积分补录';
      updateSeedPreview();
      openDialog(elements.seedDialog);
      elements.seedPointsInput.focus();
    }

    function closeSeedDialog() {
      closeDialog(elements.seedDialog);
      state.isSeeding = false;
      updateSeedPreview();
    }

    function normalizeText(value) {
      return String(value || '').trim();
    }

    function resetPanelScroll() {
      window.requestAnimationFrame(function () {
        elements.teacherPanel.scrollTop = 0;
        elements.panelContent.scrollTop = 0;
      });
    }

    function getRailControlSet(type) {
      return type === 'campus'
        ? {
            shell: elements.campusRailShell,
            rail: elements.campusRail,
            prev: elements.campusRailPrevButton,
            next: elements.campusRailNextButton
          }
        : {
            shell: elements.classRailShell,
            rail: elements.classRail,
            prev: elements.classRailPrevButton,
            next: elements.classRailNextButton
          };
    }

    function updateRailControlState(type) {
      const config = getRailControlSet(type);
      if (!config.shell || !config.rail || !config.prev || !config.next) {
        return;
      }

      const maxScroll = Math.max(0, config.rail.scrollWidth - config.rail.clientWidth);
      const scrollLeft = Math.max(0, config.rail.scrollLeft);
      const isScrollable = maxScroll > 8;

      config.shell.classList.toggle('is-scrollable', isScrollable);
      config.shell.classList.toggle('is-at-start', scrollLeft <= 4);
      config.shell.classList.toggle('is-at-end', scrollLeft >= maxScroll - 4);
      config.prev.hidden = !isScrollable;
      config.next.hidden = !isScrollable;
      config.prev.disabled = !isScrollable || scrollLeft <= 4;
      config.next.disabled = !isScrollable || scrollLeft >= maxScroll - 4;
    }

    function syncRailFocus(type) {
      const config = getRailControlSet(type);
      if (!config.rail) {
        return;
      }

      window.requestAnimationFrame(function () {
        const activeChip = config.rail.querySelector('.is-active');
        if (activeChip) {
          activeChip.scrollIntoView({ inline: 'center', block: 'nearest' });
        }
        updateRailControlState(type);
      });
    }

    function scrollRailByPage(type, direction) {
      const config = getRailControlSet(type);
      if (!config.rail) {
        return;
      }

      const distance = Math.max(180, Math.round(config.rail.clientWidth * 0.72)) * direction;
      config.rail.scrollBy({ left: distance, behavior: 'smooth' });
      window.setTimeout(function () {
        updateRailControlState(type);
      }, 280);
    }

    function refreshRailControls() {
      updateRailControlState('campus');
      updateRailControlState('class');
    }

    function renderCampusOptions() {
      const campuses = getAvailableCampuses();
      if (campuses.length && !campuses.some(function (campus) { return campus.id === state.campusId; })) {
        state.campusId = campuses[0].id;
      }

      const options = campuses.map(function (campus) {
        return `<option value="${escapeHtml(campus.id)}">${escapeHtml(campus.name)}</option>`;
      }).join('');

      elements.campusSelect.innerHTML = options || '<option value="">暂无校区</option>';
      elements.createClassCampusSelect.innerHTML = options || '<option value="">暂无校区</option>';
      elements.campusSelect.value = state.campusId;
      elements.createClassCampusSelect.value = state.campusId || campuses[0]?.id || '';
    }

    function renderCampusRail() {
      const campuses = getAvailableCampuses();
      if (!campuses.length) {
        elements.campusRail.innerHTML = '';
        updateRailControlState('campus');
        return;
      }

      elements.campusRail.innerHTML = campuses.map(function (campus) {
        const isActive = campus.id === state.campusId;
        return `<button class="teacher-filter-chip ${isActive ? 'is-active' : ''}" type="button" data-campus-id="${escapeHtml(campus.id)}">${escapeHtml(campus.name)}</button>`;
      }).join('');
      syncRailFocus('campus');
    }

    function renderClassOptions() {
      const classes = filteredClasses();
      if (classes.length && !classes.some(function (classItem) { return classItem.id === state.classId; })) {
        state.classId = classes[0].id;
      }

      elements.classSelect.innerHTML = classes.length
        ? classes.map(function (classItem) {
            const subjectName = classItem.subjects?.name ? ` · ${classItem.subjects.name}` : '';
            return `<option value="${escapeHtml(classItem.id)}">${escapeHtml(classItem.class_name)}${escapeHtml(subjectName)}</option>`;
          }).join('')
        : '<option value="">当前校区暂无班级</option>';

      if (state.classId) {
        elements.classSelect.value = state.classId;
      }
    }

    function renderClassRail() {
      const classes = filteredClasses();
      if (!classes.length) {
        elements.classRail.innerHTML = '<span class="teacher-filter-empty">????????</span>';
        updateRailControlState('class');
        return;
      }

      elements.classRail.innerHTML = classes.map(function (classItem) {
        const isActive = classItem.id === state.classId;
        const label = classItem.subjects?.name || classItem.class_type || classItem.class_name;
        return `
            <button class="teacher-filter-chip teacher-filter-chip--class ${isActive ? 'is-active' : ''}" type="button" data-class-id="${escapeHtml(classItem.id)}">
              <strong>${escapeHtml(classItem.class_name)}</strong>
              <span>${escapeHtml(label)}</span>
            </button>
          `;
      }).join('');
      syncRailFocus('class');
    }

    function renderDialogOptions() {
      elements.createClassSubjectSelect.innerHTML = state.subjects.map(function (subject) {
        return `<option value="${escapeHtml(subject.id)}">${escapeHtml(subject.name)}</option>`;
      }).join('');

      const teacherCampusId = elements.createClassCampusSelect.value || state.campusId || getAvailableCampuses()[0]?.id || '';

      if (state.authContext?.isTeacher) {
        const currentTeacher = state.authContext.profile?.teacher || state.teachers.find(function (teacher) {
          return teacher.id === state.authContext.teacherId;
        });
        const teacherName = getTeacherDisplayName(currentTeacher);
        elements.createClassTeacherSelect.innerHTML = currentTeacher
          ? `<option value="${escapeHtml(currentTeacher.id)}">${escapeHtml(teacherName)}</option>`
          : '<option value="">当前账号未绑定老师</option>';
        elements.createClassTeacherSelect.disabled = true;
        elements.createClassTeacherHint.textContent = currentTeacher
          ? `将自动归属给 ${teacherName}`
          : '当前账号未绑定老师，请先补齐 teacher_id。';
        return;
      }

      const teachers = getTeachersByCampus(teacherCampusId);
      elements.createClassTeacherSelect.innerHTML = ['<option value="">暂不分配老师</option>'].concat(
        teachers.map(function (teacher) {
          return `<option value="${escapeHtml(teacher.id)}">${escapeHtml(getTeacherDisplayName(teacher))}</option>`;
        })
      ).join('');
      elements.createClassTeacherSelect.disabled = false;
      elements.createClassTeacherHint.textContent = '可直接选老师，也可先空着。';
    }

    function syncClassSelection() {
      const classes = filteredClasses();
      if (!classes.length) {
        state.classId = '';
        state.roster = [];
        state.selectedStudentId = null;
        state.studentRecords = [];
        state.studentBadgeProgress = [];
        state.badgeFeedback = null;
        return;
      }

      const exists = classes.some(function (classItem) {
        return classItem.id === state.classId;
      });

      if (!exists) {
        state.classId = classes[0].id;
      }
    }

    function syncStudentSelection() {
      const exists = state.roster.some(function (student) {
        return student.student_id === state.selectedStudentId;
      });

      if (desktopMedia.matches) {
        if (!exists) {
          state.selectedStudentId = state.roster[0]?.student_id || null;
        }
        state.isMobilePanelOpen = false;
        return;
      }

      if (!exists) {
        state.selectedStudentId = null;
        state.isMobilePanelOpen = false;
      }
    }

    async function loadRosterAndRecords() {
      if (!state.classId) {
        state.roster = [];
        state.studentRecords = [];
        state.studentBadgeProgress = [];
        state.selectedStudentId = null;
        state.loadingStudentDetails = false;
        renderAll();
        return;
      }

      state.loadingRoster = true;
      state.studentRecords = [];
      state.studentBadgeProgress = [];
      state.loadingStudentDetails = Boolean(state.selectedStudentId);
      renderAll();

      try {
        state.roster = await fetchClassRoster(state.classId);
        syncStudentSelection();
        if (state.selectedStudentId) {
          const [studentRecords, studentBadgeProgress] = await Promise.all([
            fetchStudentLedger(state.selectedStudentId, desktopMedia.matches ? 6 : 5),
            fetchStudentBadgeProgress(state.selectedStudentId)
          ]);
          state.studentRecords = studentRecords;
          state.studentBadgeProgress = studentBadgeProgress;
        } else {
          state.studentRecords = [];
          state.studentBadgeProgress = [];
        }
        showInlineNotice('');
      } catch (error) {
        state.roster = [];
        state.studentRecords = [];
        state.studentBadgeProgress = [];
        showInlineNotice(`班级数据读取失败：${error.message}`, 'error');
      } finally {
        state.loadingRoster = false;
        state.loadingStudentDetails = false;
        renderAll();
      }
    }

    async function loadStudentRecords(studentId) {
      if (!studentId) {
        state.studentRecords = [];
        state.studentBadgeProgress = [];
        state.loadingStudentDetails = false;
        renderPanel();
        return;
      }

      state.loadingStudentDetails = true;
      renderPanel();
      const requestedStudentId = studentId;

      try {
        const [studentRecords, studentBadgeProgress] = await Promise.all([
          fetchStudentLedger(studentId, desktopMedia.matches ? 6 : 5),
          fetchStudentBadgeProgress(studentId)
        ]);

        if (requestedStudentId !== state.selectedStudentId) {
          return;
        }

        state.studentRecords = studentRecords;
        state.studentBadgeProgress = studentBadgeProgress;
      } catch (error) {
        if (requestedStudentId === state.selectedStudentId) {
          state.studentRecords = [];
          state.studentBadgeProgress = [];
          showInlineNotice(`学生详情读取失败：${error.message}`, 'error');
        }
      } finally {
        if (requestedStudentId === state.selectedStudentId) {
          state.loadingStudentDetails = false;
        }
      }
      renderPanel();
    }

    function renderSummary() {
      const selectedStudent = getSelectedStudent();
      const totalClassPoints = state.roster.reduce(function (sum, student) {
        return sum + Number(student.total_points || 0);
      }, 0);

      elements.studentCount.textContent = String(state.roster.length);
      elements.classPoints.textContent = String(totalClassPoints);
      if (elements.selectedState) {
        elements.selectedState.textContent = '';
      }
      if (elements.selectionHint) {
        elements.selectionHint.textContent = '';
      }
    }

    function renderClassMeta() {
      const selectedClass = getSelectedClass();
      if (!selectedClass) {
        elements.classMeta.innerHTML = '<span class="teacher-class-chip">先建一个班级</span>';
        return;
      }

      const scheduleText = selectedClass.schedule_text || '时间待定';
      const subjectName = selectedClass.subjects?.name || '未设置学科';

      elements.classMeta.innerHTML = `
        <span class="teacher-class-chip">${escapeHtml(selectedClass.class_name)}</span>
        <span class="teacher-class-chip">${escapeHtml(subjectName)}</span>
        <span class="teacher-class-chip">${escapeHtml(scheduleText)}</span>
      `;
    }

    function renderClassBoostState() {
      const disabled = !state.classId || !state.roster.length;
      elements.classBoostToggleButton.disabled = disabled;
      elements.classBoostToggleButton.textContent = '整班 +1';
      if (elements.classBoostConfirmBar) {
        elements.classBoostConfirmBar.hidden = true;
      }
      if (elements.classBoostPrompt) {
        elements.classBoostPrompt.textContent = '';
      }
      elements.openAddStudentButton.disabled = !state.classId;
    }

    function renderStudents() {
      if (state.loadingRoster) {
        elements.studentGrid.innerHTML = '<div class="empty-state">正在读取当前班级学生...</div>';
        return;
      }

      if (!state.classId) {
        elements.studentGrid.innerHTML = '<div class="empty-state">当前校区暂无班级，先建班再选学生。</div>';
        return;
      }

      if (!state.roster.length) {
        elements.studentGrid.innerHTML = '<div class="empty-state">当前班级还没有学生，点“搜索加人”即可加入。</div>';
        return;
      }

      elements.studentGrid.innerHTML = state.roster.map(function (student) {
        const progress = getTierProgress(Number(student.total_points || 0), state.levelTiers);
        const isActive = student.student_id === state.selectedStudentId;
        const isRecent = state.feedback && state.feedback.studentId === student.student_id && Date.now() - state.feedback.timestamp < 1200;
        const nextTierText = progress.nextTier ? `距 ${progress.nextTier.name} ${progress.distance} 分` : '已到最高段位';
        const gradeText = student.grade || student.student_code || '未设置年级';

        return `
          <button class="student-card teacher-student-card ${isActive ? 'is-active' : ''} ${isRecent ? 'is-recent' : ''}" type="button" data-student-id="${escapeHtml(student.student_id)}">
            <div class="teacher-student-header">
              <div class="teacher-student-main">
                ${createAvatarHtml(student)}
                <div>
                  <h3>${escapeHtml(getStudentDisplayName(student))}</h3>
                  <p>${escapeHtml(gradeText)}</p>
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
      const selectedClass = getSelectedClass();
      const progress = getTierProgress(Number(student.total_points || 0), state.levelTiers);
      const badgeRows = getSelectedBadgeProgress();
      const badgeSummary = getBadgeSummary(badgeRows);
      const recentFeedback = state.feedback && state.feedback.studentId === student.student_id && Date.now() - state.feedback.timestamp < 1800
        ? state.feedback
        : null;
      const recentBadgeFeedback = state.badgeFeedback && state.badgeFeedback.studentId === student.student_id && Date.now() - state.badgeFeedback.timestamp < 2200
        ? state.badgeFeedback
        : null;
      const deltaText = recentFeedback ? `${recentFeedback.pointsDelta > 0 ? '+' : ''}${recentFeedback.pointsDelta}` : '';
      const levelUpMessage = recentFeedback && recentFeedback.leveledUp
        ? `升级到 ${recentFeedback.newTierName}`
        : '';
      const nextLabel = progress.nextTier ? `下一段 ${progress.nextTier.name}` : '当前已是最高段位';
      const distanceLabel = progress.nextTier ? `还差 ${progress.distance} 分` : '继续保持';
      const metaLine = [getCampusName(selectedClass?.campus_id), selectedClass?.class_name].filter(Boolean).join(' · ');
      const badgeChipText = badgeSummary.totalCount
        ? `已解锁 ${badgeSummary.unlockedCount} / ${badgeSummary.totalCount} 枚徽章`
        : '暂无徽章规则';
      const badgeSummaryLine = badgeSummary.nextLocked
        ? `下一个：${badgeSummary.nextLocked.badge_name}，再 ${badgeSummary.nextLocked.remaining_count} 次“${badgeSummary.nextLocked.event_label}”`
        : (badgeSummary.latestUnlocked ? `最近解锁：${badgeSummary.latestUnlocked.badge_name}` : '老师记录行为后会自动累计徽章进度');

      elements.studentSpotlight.innerHTML = `
        <div class="student-spotlight__hero">
          <div class="student-spotlight__identity">
            ${createAvatarHtml(student, 'large')}
            <div>
              <p class="eyebrow teacher-spotlight-eyebrow">Current Student</p>
              <h2>${escapeHtml(getStudentDisplayName(student))}</h2>
              <p>${escapeHtml(metaLine)}</p>
            </div>
          </div>
          <div class="student-score-card ${recentFeedback ? 'is-energized' : ''}">
            <span class="student-score-card__label">当前总分</span>
            <strong>${escapeHtml(student.total_points)}</strong>
            ${recentFeedback ? `<span class="student-score-card__delta ${recentFeedback.pointsDelta < 0 ? 'is-negative' : ''}">${escapeHtml(deltaText)}</span>` : ''}
          </div>
        </div>
        <div class="student-spotlight__chips">
          <span class="tag-pill teacher-contrast-pill">${escapeHtml(progress.currentTier.name)}</span>
          <span class="status-pill teacher-contrast-pill">${escapeHtml(distanceLabel)}</span>
          <span class="status-pill teacher-contrast-pill">${escapeHtml(nextLabel)}</span>
          <span class="status-pill teacher-contrast-pill">${escapeHtml(badgeChipText)}</span>
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
        <p class="teacher-badge-summary-line">${escapeHtml(badgeSummaryLine)}</p>
        ${levelUpMessage ? `<div class="teacher-levelup-banner">${escapeHtml(levelUpMessage)}</div>` : ''}
        ${recentFeedback?.note ? `<p class="teacher-feedback-line">${escapeHtml(recentFeedback.note)}</p>` : ''}
        ${recentBadgeFeedback?.note ? `<p class="teacher-feedback-line teacher-feedback-line--badge">${escapeHtml(recentBadgeFeedback.note)}</p>` : ''}
      `;
    }

    function renderTabs() {
      const groupedRules = getCurrentRules();
      const categoryKeys = Object.keys(groupedRules);
      elements.categoryTabs.innerHTML = categoryKeys.map(function (category) {
        const meta = CATEGORY_META[category] || { label: category, shortLabel: category, tip: '' };
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
      elements.activeCategoryTip.textContent = desktopMedia.matches ? '点一下立即生效' : '点一下马上记分';
    }

    function renderActionCards() {
      const groupedRules = getCurrentRules();
      const rules = groupedRules[state.activeCategory] || [];
      const recentFeedback = state.feedback && Date.now() - state.feedback.timestamp < 1200 ? state.feedback : null;

      if (!rules.length) {
        elements.actionCards.innerHTML = '<div class="empty-state">当前分类还没有启用的积分规则。</div>';
        return;
      }

      elements.actionCards.innerHTML = rules.map(function (rule, index) {
        const isRecent = recentFeedback && recentFeedback.ruleId === rule.id;
        const isHighFrequency = rule.is_common || index < 2;
        const helperText = isRecent ? '已记分' : (isHighFrequency ? '高频' : '即点即加');
        const actionBadge = isRecent
          ? '<span class="teacher-action-feedback">已加分</span>'
          : (isHighFrequency ? '<span class="teacher-action-badge">常用</span>' : '');

        return `
          <button class="teacher-action-card ${isRecent ? 'is-ack' : ''} ${isHighFrequency ? 'is-high-frequency' : ''}" type="button" data-rule-id="${escapeHtml(rule.id)}" data-category="${escapeHtml(state.activeCategory)}">
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

    function renderBadgeActionCards() {
      const student = getSelectedStudent();

      if (!student) {
        elements.badgeActionCards.innerHTML = '<div class="empty-state">先选择学生，再记录行为徽章。</div>';
        return;
      }

      if (state.loadingStudentDetails && !state.studentBadgeProgress.length) {
        elements.badgeActionCards.innerHTML = '<div class="empty-state">正在读取当前学生的徽章进度...</div>';
        return;
      }

      if (!state.badgeDefinitions.length) {
        elements.badgeActionCards.innerHTML = '<div class="empty-state">当前还没有启用的徽章规则。</div>';
        return;
      }

      elements.badgeActionCards.innerHTML = state.badgeDefinitions.map(function (badge) {
        const progress = getBadgeProgressRow(badge.id);
        const eventCount = Number(progress?.event_count || 0);
        const threshold = Number(progress?.threshold || badge.threshold || 1);
        const remainingCount = Math.max(Number(progress?.remaining_count ?? (threshold - eventCount)), 0);
        const isUnlocked = Boolean(progress?.unlocked_at);
        const progressPercent = Math.max(8, Math.min(100, Math.round((eventCount / threshold) * 100)));
        const helperText = isUnlocked
          ? `已解锁 · 累计 ${eventCount} 次`
          : `累计 ${eventCount} / ${threshold} · 再 ${remainingCount} 次解锁`;
        const actionState = state.isSavingBadgeEvent
          ? (state.savingBadgeDefinitionId === badge.id ? '记录中...' : '处理中...')
          : '点击记录';

        return `
          <button class="teacher-badge-action-card ${isUnlocked ? 'is-unlocked' : ''}" type="button" data-badge-definition-id="${escapeHtml(badge.id)}" ${state.isSavingBadgeEvent ? 'disabled' : ''}>
            <div class="teacher-badge-action-card__head">
              <span class="teacher-badge-token">${escapeHtml(badge.icon_token || '🏅')}</span>
              <span class="teacher-badge-state">${escapeHtml(isUnlocked ? '已解锁' : '待解锁')}</span>
            </div>
            <strong>${escapeHtml(badge.name)}</strong>
            <p>${escapeHtml(badge.event_label)}</p>
            <div class="teacher-badge-action-card__meta">
              <span>${escapeHtml(helperText)}</span>
              <span>${escapeHtml(actionState)}</span>
            </div>
            <div class="teacher-badge-action-card__track">
              <span style="width:${isUnlocked ? 100 : progressPercent}%"></span>
            </div>
          </button>
        `;
      }).join('');
    }

    function renderBadgeProgress() {
      const student = getSelectedStudent();

      if (!student) {
        elements.badgeProgressList.innerHTML = '<div class="empty-state">选中学生后，这里显示真实徽章累计和解锁结果。</div>';
        return;
      }

      if (state.loadingStudentDetails && !state.studentBadgeProgress.length) {
        elements.badgeProgressList.innerHTML = '<div class="empty-state">正在同步真实徽章结果...</div>';
        return;
      }

      const badgeRows = getSelectedBadgeProgress();

      if (!badgeRows.length) {
        elements.badgeProgressList.innerHTML = '<div class="empty-state">当前学生还没有徽章进度。</div>';
        return;
      }

      elements.badgeProgressList.innerHTML = badgeRows.map(function (row) {
        const eventCount = Number(row.event_count || 0);
        const threshold = Math.max(1, Number(row.threshold || 1));
        const remainingCount = Math.max(Number(row.remaining_count || 0), 0);
        const isUnlocked = Boolean(row.unlocked_at);
        const progressPercent = Math.max(8, Math.min(100, Math.round((eventCount / threshold) * 100)));
        const description = row.description || `${row.event_label} 累计达到阈值后解锁`;

        return `
          <article class="teacher-badge-progress-item ${isUnlocked ? 'is-unlocked' : ''}">
            <div class="teacher-badge-progress-item__head">
              <strong>${escapeHtml(row.icon_token || '🏅')} ${escapeHtml(row.badge_name)}</strong>
              <span>${escapeHtml(isUnlocked ? `已解锁 · ${formatDateTime(row.unlocked_at)}` : `累计 ${eventCount} / ${threshold}`)}</span>
            </div>
            <p>${escapeHtml(description)}</p>
            <div class="teacher-badge-progress-item__track">
              <span style="width:${isUnlocked ? 100 : progressPercent}%"></span>
            </div>
            <div class="teacher-badge-progress-item__meta">
              <span>${escapeHtml(row.event_label)}</span>
              <span>${escapeHtml(isUnlocked ? `首解锁于第 ${row.source_event_count || threshold} 次` : `还差 ${remainingCount} 次`)}</span>
            </div>
          </article>
        `;
      }).join('');
    }

    function renderStudentRecords() {
      if (!state.selectedStudentId) {
        elements.studentRecordList.innerHTML = '<div class="empty-state">选学生后，这里显示最近积分和兑换记录。</div>';
        return;
      }

      if (state.loadingStudentDetails && !state.studentRecords.length) {
        elements.studentRecordList.innerHTML = '<div class="empty-state">正在读取最近积分流水...</div>';
        return;
      }

      if (!state.studentRecords.length) {
        elements.studentRecordList.innerHTML = '<div class="empty-state">当前学生还没有积分流水。</div>';
        return;
      }

      elements.studentRecordList.innerHTML = state.studentRecords.map(function (record) {
        const categoryLabel = record.action_type === 'deduct'
          ? '积分兑换'
          : (record.action_type === 'seed' ? '历史补录' : (CATEGORY_META[record.category_snapshot]?.label || record.category_snapshot));
        const score = Number(record.points_delta || 0);
        const scoreText = `${score > 0 ? '+' : ''}${score}`;
        const typeLabel = ACTION_TYPE_META[record.action_type] || record.action_type || '记录';
        const detail = record.remark && record.remark !== record.rule_name_snapshot
          ? `<p class="teacher-record-detail">${escapeHtml(record.remark)}</p>`
          : '';

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

    function renderPanel() {
      const selectedStudent = getSelectedStudent();
      const hasStudent = Boolean(selectedStudent);

      elements.panelEmptyState.hidden = hasStudent;
      elements.panelContent.hidden = !hasStudent;
      elements.removeSelectedStudentButton.disabled = !hasStudent;
      elements.openSeedDialogButton.disabled = !hasStudent;
      elements.openRedeemButton.disabled = !hasStudent;
      if (elements.redeemHint) {
        elements.redeemHint.hidden = true;
        elements.redeemHint.textContent = '';
      }

      if (!hasStudent) {
        return;
      }

      renderSpotlight(selectedStudent);
      renderTabs();
      renderActionCards();
      renderBadgeActionCards();
      renderBadgeProgress();
      renderStudentRecords();
      updateSeedPreview();
      updateRedeemPreview();
    }

    function updatePanelVisibility() {
      const shouldShowPanel = desktopMedia.matches || state.isMobilePanelOpen;
      elements.teacherPanel.classList.toggle('is-open', shouldShowPanel);
      elements.teacherPanel.classList.toggle('is-docked', desktopMedia.matches);
      elements.teacherPanel.setAttribute('aria-hidden', shouldShowPanel ? 'false' : 'true');
      elements.sheetOverlay.hidden = desktopMedia.matches || !state.isMobilePanelOpen;
      document.body.classList.toggle('teacher-panel-open', !desktopMedia.matches && state.isMobilePanelOpen);
    }

    function renderSearchResults() {
      if (!state.classId) {
        elements.studentSearchResults.innerHTML = '<div class="empty-state">先选班级，再从学生主档搜索加入。</div>';
        return;
      }

      if (!state.searchResults.length) {
        elements.studentSearchResults.innerHTML = '<div class="empty-state">没有找到匹配的学生主档，可换关键字后重试。</div>';
        return;
      }

      elements.studentSearchResults.innerHTML = state.searchResults.map(function (student) {
        const alreadyJoined = state.roster.some(function (member) {
          return member.student_id === student.id;
        });
        const statusLabel = student.status === 'temporary' ? '临时学生' : '正式学生';
        const legalName = student.legal_name && student.legal_name !== student.display_name ? `（${student.legal_name}）` : '';
        return `
          <article class="teacher-search-card">
            <div class="teacher-search-card__text">
              <h3>${escapeHtml(getStudentDisplayName(student))} ${escapeHtml(legalName)}</h3>
              <p>${escapeHtml(student.grade || '未设置年级')} · ${escapeHtml(student.student_code || '未生成学号')} · ${escapeHtml(statusLabel)}</p>
              <p>家长：${escapeHtml(student.parent_name || '未填写')} · ${escapeHtml(student.parent_phone || '未填写')}</p>
            </div>
            <button class="${alreadyJoined ? 'ghost-button' : 'primary-button'}" type="button" data-add-student-id="${escapeHtml(student.id)}" ${alreadyJoined ? 'disabled' : ''}>
              ${alreadyJoined ? '已在班级中' : '加入班级'}
            </button>
          </article>
        `;
      }).join('');
    }

    function resetTempStudentForm() {
      state.isCreatingTempStudent = false;
    }

    function updateSeedPreview() {
      const student = getSelectedStudent();
      if (!student) {
        elements.seedStudentMeta.innerHTML = '';
        elements.seedPreview.innerHTML = '<div class="teacher-redeem-preview__row"><span>先选择学生</span><strong>-</strong></div>';
        elements.seedSubmitButton.disabled = true;
        elements.seedSubmitButton.textContent = state.isSeeding ? '补录中...' : '确认补录';
        return;
      }

      const rawPoints = Number(elements.seedPointsInput.value || 0);
      const seedPoints = Math.floor(rawPoints);
      const remark = normalizeText(elements.seedRemarkInput.value) || '历史积分补录';
      const currentPoints = Number(student.total_points || 0);
      const nextPoints = currentPoints + Math.max(0, seedPoints);
      const invalid = !Number.isInteger(seedPoints) || seedPoints <= 0 || seedPoints > 5000 || !remark;

      elements.seedStudentMeta.innerHTML =
        '<div class="teacher-dialog-meta__student">' +
          createAvatarHtml(student) +
          '<div>' +
            '<strong>' + escapeHtml(getStudentDisplayName(student)) + '</strong>' +
            '<span>当前积分 ' + escapeHtml(currentPoints) + ' 分</span>' +
          '</div>' +
        '</div>';

      elements.seedPreview.innerHTML = [
        '<div class="teacher-redeem-preview__row"><span>当前积分</span><strong>' + escapeHtml(currentPoints) + ' 分</strong></div>',
        '<div class="teacher-redeem-preview__row"><span>本次补录</span><strong>' + (seedPoints > 0 ? '+' + escapeHtml(seedPoints) + ' 分' : '待填写') + '</strong></div>',
        '<div class="teacher-redeem-preview__row ' + (seedPoints > 5000 ? 'is-warning' : '') + '"><span>补录后总分</span><strong>' + (seedPoints > 0 ? escapeHtml(nextPoints) + ' 分' : '待计算') + '</strong></div>',
        '<div class="teacher-redeem-preview__row"><span>备注</span><strong>' + escapeHtml(remark) + '</strong></div>'
      ].join('');

      elements.seedSubmitButton.disabled = invalid || state.isSeeding;
      elements.seedSubmitButton.textContent = state.isSeeding ? '补录中...' : '确认补录';
    }

    function updateRedeemPreview() {
      const student = getSelectedStudent();
      if (!student) {
        elements.redeemStudentMeta.innerHTML = '';
        elements.redeemPreview.innerHTML = '<div class="teacher-redeem-preview__row"><span>先选择学生</span><strong>-</strong></div>';
        elements.redeemSubmitButton.disabled = true;
        return;
      }

      const redeemPoints = Math.max(0, Number(elements.redeemPointsInput.value || 0));
      const currentPoints = Number(student.total_points || 0);
      const remainingPoints = Math.max(0, currentPoints - redeemPoints);
      const itemName = elements.redeemItemInput.value.trim();
      const invalid = !itemName || !redeemPoints || redeemPoints > currentPoints;

      elements.redeemStudentMeta.innerHTML = `
        <div class="teacher-dialog-meta__student">
          ${createAvatarHtml(student)}
          <div>
            <strong>${escapeHtml(getStudentDisplayName(student))}</strong>
            <span>当前积分 ${escapeHtml(currentPoints)} 分</span>
          </div>
        </div>
      `;
      elements.redeemPreview.innerHTML = `
        <div class="teacher-redeem-preview__row"><span>当前积分</span><strong>${escapeHtml(currentPoints)} 分</strong></div>
        <div class="teacher-redeem-preview__row"><span>本次扣除</span><strong>${redeemPoints ? `-${escapeHtml(redeemPoints)} 分` : '待填写'}</strong></div>
        <div class="teacher-redeem-preview__row ${invalid && redeemPoints > currentPoints ? 'is-warning' : ''}"><span>兑换后剩余</span><strong>${escapeHtml(remainingPoints)} 分</strong></div>
      `;
      elements.redeemSubmitButton.disabled = invalid || state.isRedeeming;
    }

    function renderAll() {
      ensureCategorySelection();
      renderCampusOptions();
      renderCampusRail();
      renderClassOptions();
      renderClassRail();
      renderDialogOptions();
      renderClassMeta();
      renderSummary();
      renderClassBoostState();
      renderStudents();
      renderPanel();
      renderSearchResults();
      updatePanelVisibility();
    }
    async function initializeData() {
      if (!isSupabaseConfigured) {
        showInlineNotice('尚未配置 Supabase，请先创建 .env 并填写 SUPABASE_URL / SUPABASE_ANON_KEY。', 'error');
        elements.studentGrid.innerHTML = '<div class="empty-state">缺少 Supabase 配置，老师页暂时无法读取真实数据。</div>';
        return;
      }

      if (state.authContext?.isTeacher && !state.authContext.teacherId) {
        showInlineNotice('当前老师账号没有绑定 teachers 表记录，请先在 user_profiles 中补齐 teacher_id。', 'error');
        elements.studentGrid.innerHTML = '<div class="empty-state">当前账号缺少 teacher_id 绑定，暂时无法读取老师名下班级。</div>';
        return;
      }

      try {
        const teacherPromise = state.authContext?.isTeacher
          ? (state.authContext.profile.teacher
              ? Promise.resolve([state.authContext.profile.teacher])
              : fetchTeachers().then(function (rows) {
                  return rows.filter(function (teacher) {
                    return teacher.id === state.authContext.teacherId;
                  });
                }))
          : fetchTeachers();

        const [campuses, subjects, teachers, classes, pointRules, levelTiers, badgeDefinitions] = await Promise.all([
          fetchCampuses(),
          fetchSubjects(),
          teacherPromise,
          fetchClasses(getClassQueryOptions()),
          fetchPointRules(),
          fetchLevelTiers().catch(function () { return []; }),
          fetchBadgeDefinitions().catch(function () { return []; })
        ]);

        state.campuses = campuses;
        state.subjects = subjects;
        state.teachers = teachers;
        state.classes = classes;
        state.pointRules = pointRules;
        state.badgeDefinitions = badgeDefinitions;
        state.levelTiers = normalizeTierList(levelTiers);
        state.campusId = classes[0]?.campus_id || state.authContext.profile?.teacher?.campus_id || campuses[0]?.id || '';
        syncClassSelection();
        renderAll();
        await loadRosterAndRecords();
      } catch (error) {
        showInlineNotice(`初始化 Supabase 数据失败：${error.message}`, 'error');
        elements.studentGrid.innerHTML = '<div class="empty-state">真实数据初始化失败，请检查 Supabase 表结构和环境变量。</div>';
      }
    }

    function selectStudent(studentId) {
      state.selectedStudentId = studentId;
      state.studentRecords = [];
      state.studentBadgeProgress = [];
      state.loadingStudentDetails = true;
      if (!desktopMedia.matches) {
        state.isMobilePanelOpen = true;
      }
      renderAll();
      resetPanelScroll();
      loadStudentRecords(studentId);
    }

    function closeMobilePanel() {
      if (desktopMedia.matches) {
        return;
      }
      state.isMobilePanelOpen = false;
      updatePanelVisibility();
    }

    async function refreshClassesAndRoster(nextClassId) {
      state.classes = await fetchClasses(getClassQueryOptions());
      if (nextClassId) {
        state.classId = nextClassId;
        const selectedClass = getSelectedClass();
        if (selectedClass) {
          state.campusId = selectedClass.campus_id;
        }
      }
      syncClassSelection();
      renderAll();
      await loadRosterAndRecords();
    }

    async function handleAction(ruleId) {
      const rule = state.pointRules.find(function (item) {
        return item.id === ruleId;
      });
      const selectedClass = getSelectedClass();
      const student = getSelectedStudent();

      if (!rule || !selectedClass || !student) {
        return;
      }

      const beforeProgress = getTierProgress(Number(student.total_points || 0), state.levelTiers);

      try {
        await insertPointLedger({
          student_id: student.student_id,
          class_id: selectedClass.id,
          campus_id: selectedClass.campus_id,
          subject_id: selectedClass.subject_id,
          teacher_id: selectedClass.teacher_id || state.authContext.teacherId || null,
          rule_id: rule.id,
          rule_name_snapshot: rule.rule_name,
          category_snapshot: rule.category,
          points_delta: rule.points,
          action_type: 'add',
          remark: '老师端即时加分'
        });

        await loadRosterAndRecords();
        const updatedStudent = getSelectedStudent();
        const afterProgress = getTierProgress(Number(updatedStudent?.total_points || 0), state.levelTiers);
        state.feedback = {
          studentId: student.student_id,
          category: rule.category,
          ruleId: rule.id,
          actionLabel: rule.rule_name,
          pointsDelta: Number(rule.points),
          leveledUp: beforeProgress.currentTier.name !== afterProgress.currentTier.name,
          newTierName: afterProgress.currentTier.name,
          note: `${CATEGORY_META[rule.category]?.label || rule.category} · ${rule.rule_name} +${rule.points} 分`,
          timestamp: Date.now()
        };
        renderAll();
        showToast(
          state.feedback.leveledUp
            ? `${getStudentDisplayName(updatedStudent || student)} +${rule.points} 分，升级到 ${afterProgress.currentTier.name}`
            : `${getStudentDisplayName(updatedStudent || student)} +${rule.points} 分`
        );
        clearFeedbackLater();
      } catch (error) {
        showInlineNotice(`写入积分流水失败：${error.message}`, 'error');
        showToast('加分失败，请检查 Supabase 配置');
      }
    }

    async function handleBadgeAction(badgeDefinitionId) {
      if (state.isSavingBadgeEvent) {
        return;
      }

      const selectedClass = getSelectedClass();
      const student = getSelectedStudent();
      const badgeDefinition = state.badgeDefinitions.find(function (item) {
        return item.id === badgeDefinitionId;
      });

      if (!selectedClass || !student || !badgeDefinition) {
        return;
      }

      const previousProgress = getBadgeProgressRow(badgeDefinition.id);
      const teacherId = state.authContext.teacherId || selectedClass.teacher_id || null;

      state.isSavingBadgeEvent = true;
      state.savingBadgeDefinitionId = badgeDefinition.id;
      renderBadgeActionCards();

      try {
        await insertStudentBadgeEvent({
          student_id: student.student_id,
          badge_definition_id: badgeDefinition.id,
          teacher_id: teacherId,
          class_id: selectedClass.id,
          note: `老师端行为记录：${badgeDefinition.event_label}`
        });

        await loadStudentRecords(student.student_id);
        const updatedProgress = getBadgeProgressRow(badgeDefinition.id);
        const eventCount = Number(updatedProgress?.event_count || 0);
        const threshold = Number(updatedProgress?.threshold || badgeDefinition.threshold || 1);
        const unlockedJustNow = !previousProgress?.unlocked_at && Boolean(updatedProgress?.unlocked_at);
        const studentName = getStudentDisplayName(getSelectedStudent() || student);

        state.badgeFeedback = {
          studentId: student.student_id,
          badgeDefinitionId: badgeDefinition.id,
          badgeName: badgeDefinition.name,
          unlockedJustNow,
          note: unlockedJustNow
            ? `${badgeDefinition.name} 已解锁，${badgeDefinition.event_label} 已累计到 ${eventCount} 次`
            : `${badgeDefinition.event_label} 已记录，当前 ${eventCount} / ${threshold}`,
          timestamp: Date.now()
        };
        renderPanel();
        showToast(unlockedJustNow ? `${studentName} 解锁 ${badgeDefinition.name}` : `${studentName} 已记录“${badgeDefinition.event_label}”`);
        clearFeedbackLater();
      } catch (error) {
        showInlineNotice(`记录行为失败：${error.message}`, 'error');
        showToast('徽章记录失败，请稍后重试');
      } finally {
        state.isSavingBadgeEvent = false;
        state.savingBadgeDefinitionId = '';
        renderBadgeActionCards();
      }
    }

    async function handleRedeemSubmit(event) {
      event.preventDefault();
      if (state.isRedeeming) {
        return;
      }

      const selectedClass = getSelectedClass();
      const student = getSelectedStudent();
      const itemName = elements.redeemItemInput.value.trim();
      const points = Math.floor(Number(elements.redeemPointsInput.value || 0));
      const currentPoints = Number(student?.total_points || 0);

      if (!selectedClass || !student) {
        showToast('请先选择学生');
        return;
      }
      if (!itemName || !points) {
        showToast('请填写兑换内容和扣分');
        return;
      }
      if (points > currentPoints) {
        showToast('积分不足，无法兑换');
        updateRedeemPreview();
        return;
      }

      state.isRedeeming = true;
      updateRedeemPreview();

      try {
        await insertPointLedger({
          student_id: student.student_id,
          class_id: selectedClass.id,
          campus_id: selectedClass.campus_id,
          subject_id: selectedClass.subject_id,
          teacher_id: selectedClass.teacher_id || state.authContext.teacherId || null,
          rule_id: null,
          rule_name_snapshot: `兑换：${itemName}`,
          category_snapshot: 'classroom',
          points_delta: points * -1,
          action_type: 'deduct',
          remark: `兑换${itemName}，扣除 ${points} 分`
        });

        closeDialog(elements.redeemDialog);
        elements.redeemForm.reset();
        await loadRosterAndRecords();
        const updatedStudent = getSelectedStudent();
        state.feedback = {
          studentId: student.student_id,
          category: 'redeem',
          ruleId: '',
          actionLabel: itemName,
          pointsDelta: points * -1,
          leveledUp: false,
          newTierName: '',
          note: `兑换 ${itemName}，扣除 ${points} 分，剩余 ${updatedStudent?.total_points || 0} 分`,
          timestamp: Date.now()
        };
        renderAll();
        showToast(`${getStudentDisplayName(updatedStudent || student)} 兑换 ${itemName}，剩余 ${updatedStudent?.total_points || 0} 分`);
        clearFeedbackLater();
      } catch (error) {
        showInlineNotice(`兑换扣分失败：${error.message}`, 'error');
        showToast('兑换失败，请稍后重试');
      } finally {
        state.isRedeeming = false;
        updateRedeemPreview();
      }
    }

    async function handleSeedSubmit(event) {
      event.preventDefault();
      if (state.isSeeding) {
        return;
      }

      const selectedClass = getSelectedClass();
      const student = getSelectedStudent();
      const seedPoints = Math.floor(Number(elements.seedPointsInput.value || 0));
      const remark = normalizeText(elements.seedRemarkInput.value) || '历史积分补录';

      if (!selectedClass || !student) {
        showToast('请先选择学生');
        return;
      }
      if (!Number.isInteger(seedPoints) || seedPoints <= 0) {
        showToast('补录积分只能填写正整数');
        updateSeedPreview();
        return;
      }
      if (seedPoints > 5000) {
        showToast('单次补录上限为 5000 分');
        updateSeedPreview();
        return;
      }
      if (!remark) {
        showToast('请填写补录备注');
        updateSeedPreview();
        return;
      }

      state.isSeeding = true;
      updateSeedPreview();
      const beforeProgress = getTierProgress(Number(student.total_points || 0), state.levelTiers);

      try {
        await insertPointLedger({
          student_id: student.student_id,
          class_id: selectedClass.id,
          campus_id: selectedClass.campus_id,
          subject_id: selectedClass.subject_id,
          teacher_id: selectedClass.teacher_id || state.authContext.teacherId || null,
          rule_id: null,
          rule_name_snapshot: '补录积分',
          category_snapshot: 'classroom',
          points_delta: seedPoints,
          action_type: 'seed',
          remark
        });

        closeSeedDialog();
        await loadRosterAndRecords();
        const updatedStudent = getSelectedStudent();
        const afterProgress = getTierProgress(Number(updatedStudent?.total_points || 0), state.levelTiers);
        state.feedback = {
          studentId: student.student_id,
          category: 'seed',
          ruleId: '',
          actionLabel: '补录积分',
          pointsDelta: seedPoints,
          leveledUp: beforeProgress.currentTier.name !== afterProgress.currentTier.name,
          newTierName: afterProgress.currentTier.name,
          note: `补录积分 +${seedPoints} 分`,
          timestamp: Date.now()
        };
        renderAll();
        showToast(
          state.feedback.leveledUp
            ? `${getStudentDisplayName(updatedStudent || student)} 补录 ${seedPoints} 分，升级到 ${afterProgress.currentTier.name}`
            : `${getStudentDisplayName(updatedStudent || student)} 已补录 ${seedPoints} 分`
        );
        clearFeedbackLater();
      } catch (error) {
        showInlineNotice(`补录积分失败：${error.message}`, 'error');
        showToast('补录失败，请稍后重试');
      } finally {
        state.isSeeding = false;
        updateSeedPreview();
      }
    }

    async function confirmClassBoost() {
      const selectedClass = getSelectedClass();
      if (!selectedClass || !state.roster.length) {
        renderClassBoostState();
        closeClassBoostDialog();
        return;
      }

      const payload = state.roster.map(function (student) {
        return {
          student_id: student.student_id,
          class_id: selectedClass.id,
          campus_id: selectedClass.campus_id,
          subject_id: selectedClass.subject_id,
          teacher_id: selectedClass.teacher_id || state.authContext.teacherId || null,
          rule_id: null,
          rule_name_snapshot: '整班鼓励',
          category_snapshot: 'classroom',
          points_delta: 1,
          action_type: 'batch_add',
          remark: '老师端整班 +1'
        };
      });

      if (elements.classBoostDialogConfirmButton) {
        elements.classBoostDialogConfirmButton.disabled = true;
      }

      try {
        await insertPointLedger(payload);
        state.feedback = null;
        closeClassBoostDialog();
        await loadRosterAndRecords();
        showToast(`${selectedClass.class_name} 已完成整班 +1`);
        showInlineNotice('');
      } catch (error) {
        showInlineNotice(`整班加分失败：${error.message}`, 'error');
      } finally {
        if (elements.classBoostDialogConfirmButton) {
          elements.classBoostDialogConfirmButton.disabled = false;
        }
      }
    }

    async function handleCreateClassSubmit(event) {
      event.preventDefault();
      if (state.isSavingClass) {
        return;
      }

      const campusId = elements.createClassCampusSelect.value;
      const subjectId = elements.createClassSubjectSelect.value;
      const teacherId = state.authContext?.isTeacher ? state.authContext.teacherId : (elements.createClassTeacherSelect.value || null);
      const className = elements.createClassNameInput.value.trim();
      const scheduleText = elements.createClassScheduleInput.value.trim();
      const classType = elements.createClassTypeSelect.value || 'regular';

      if (!className || !campusId || !subjectId) {
        showToast('请完整填写班级信息');
        return;
      }

      state.isSavingClass = true;

      try {
        const createdClass = await createClass({
          class_name: className,
          campus_id: campusId,
          subject_id: subjectId,
          teacher_id: teacherId,
          schedule_text: scheduleText || null,
          class_type: classType,
          status: 'active',
          created_by_id: state.authContext.teacherId || null
        });
        closeDialog(elements.createClassDialog);
        elements.createClassForm.reset();
        state.campusId = campusId;
        await refreshClassesAndRoster(createdClass.id);
        showToast(`已创建班级：${createdClass.class_name}`);
      } catch (error) {
        showInlineNotice(`创建班级失败：${error.message}`, 'error');
        showToast('新建班级失败');
      } finally {
        state.isSavingClass = false;
      }
    }

    async function handleStudentSearch(event) {
      if (event) {
        event.preventDefault();
      }

      state.searchResults = [];
      elements.studentSearchHint.textContent = '正在搜索学生主档...';
      elements.studentSearchResults.innerHTML = '<div class="empty-state">正在搜索学生，请稍候...</div>';

      try {
        state.searchResults = await searchStudents(elements.studentSearchInput.value || '');
        renderSearchResults();
        elements.studentSearchHint.textContent = state.searchResults.length
          ? `已找到 ${state.searchResults.length} 个可加入学生`
          : '没有找到匹配的学生主档，可尝试更换关键字';
      } catch (error) {
        state.searchResults = [];
        renderSearchResults();
        elements.studentSearchHint.textContent = `搜索失败：${error.message}`;
      }
    }

    function buildOptimisticRosterStudent(studentId) {
      const student = state.searchResults.find(function (item) {
        return item.id === studentId;
      });
      if (!student) {
        return null;
      }
      return {
        student_id: student.id,
        student_code: student.student_code || '',
        legal_name: student.legal_name || '',
        display_name: student.display_name || student.legal_name || '',
        avatar_url: student.avatar_url || '',
        grade: student.grade || '',
        student_status: student.status || 'normal',
        status: student.status || 'normal',
        total_points: 0,
        progress_7d: 0,
        last_point_at: null,
        joined_at: new Date().toISOString(),
        member_status: 'active'
      };
    }

    function addStudentToRosterOptimistically(studentId) {
      const optimisticStudent = buildOptimisticRosterStudent(studentId);
      if (!optimisticStudent) {
        return;
      }
      state.roster = state.roster.concat(optimisticStudent);
      syncStudentSelection();
      renderAll();
    }

    async function handleAddStudent(studentId) {
      const selectedClass = getSelectedClass();
      if (!selectedClass) {
        showToast('请先选择班级');
        return;
      }

      const alreadyJoined = state.roster.some(function (member) {
        return member.student_id === studentId;
      });
      if (alreadyJoined) {
        showToast('该学生已在当前班级中');
        return;
      }

      addStudentToRosterOptimistically(studentId);
      showInlineNotice('');
      showToast('学生已加入当前班级');

      try {
        await addStudentToClass({
          class_id: selectedClass.id,
          student_id: studentId,
          member_status: 'active',
          joined_by_id: state.authContext.teacherId || null,
          notes: '老师端加入班级'
        });
        loadRosterAndRecords().catch(function (refreshError) {
          showInlineNotice(`班级刷新失败：${refreshError.message}`, 'error');
        });
        handleStudentSearch().catch(function () {});
      } catch (error) {
        if (error.code === '23505') {
          loadRosterAndRecords().catch(function () {});
          handleStudentSearch().catch(function () {});
          showToast('该学生已在当前班级中');
          return;
        }

        state.roster = state.roster.filter(function (member) {
          return member.student_id !== studentId;
        });
        syncStudentSelection();
        renderAll();
        showInlineNotice(`加入班级失败：${error.message}`, 'error');
        showToast('加入班级失败');
      }
    }

    function openCreateClassDialog() {
      elements.createClassForm.reset();
      elements.createClassCampusSelect.value = state.campusId || getAvailableCampuses()[0]?.id || state.campuses[0]?.id || '';
      renderDialogOptions();
      if (state.authContext?.isTeacher && state.authContext.teacherId) {
        elements.createClassTeacherSelect.value = state.authContext.teacherId;
      }
      openDialog(elements.createClassDialog);
      elements.createClassNameInput.focus();
    }

    function openAddStudentDialog() {
      if (!state.classId) {
        showToast('请先选择或创建班级');
        return;
      }

      state.searchResults = [];
      state.lastSearchKeyword = '';
      elements.studentSearchInput.value = '';
      resetTempStudentForm();
      elements.studentSearchHint.textContent = '搜索学生';
      renderSearchResults();
      openDialog(elements.addStudentDialog);
      handleStudentSearch();
    }

    function openRedeemDialog() {
      const student = getSelectedStudent();
      if (!student) {
        showToast('请先选择学生');
        return;
      }
      elements.redeemForm.reset();
      updateRedeemPreview();
      openDialog(elements.redeemDialog);
      elements.redeemItemInput.focus();
    }

    async function handleRemoveSelectedStudent() {
      const selectedClass = getSelectedClass();
      const student = getSelectedStudent();
      if (!selectedClass || !student) {
        showToast('\u8bf7\u5148\u9009\u62e9\u5b66\u751f');
        return;
      }

      const studentName = getStudentDisplayName(student);
      const confirmed = window.confirm(`\u786e\u8ba4\u628a${studentName}\u79fb\u51fa${selectedClass.class_name}\u5417\uff1f`);
      if (!confirmed) {
        return;
      }

      try {
        await removeStudentFromClass({
          classId: selectedClass.id,
          studentId: student.student_id,
          notes: '\u8001\u5e08\u7aef\u79fb\u51fa\u73ed\u7ea7'
        });
        state.feedback = null;
        await loadRosterAndRecords();
        showToast(`${studentName} \u5df2\u79fb\u51fa\u5f53\u524d\u73ed\u7ea7`);
      } catch (error) {
        showInlineNotice(`\u79fb\u51fa\u73ed\u7ea7\u5931\u8d25\uff1a${error.message}`, 'error');
        showToast('\u79fb\u51fa\u5931\u8d25');
      }
    }

    elements.campusSelect.addEventListener('change', async function (event) {
      state.campusId = event.target.value;
      state.classBoostArmed = false;
      syncClassSelection();
      renderAll();
      await loadRosterAndRecords();
    });

    elements.classSelect.addEventListener('change', async function (event) {
      state.classId = event.target.value;
      state.classBoostArmed = false;
      renderAll();
      await loadRosterAndRecords();
    });

    elements.campusRail.addEventListener('click', async function (event) {
      const button = event.target.closest('[data-campus-id]');
      if (!button) {
        return;
      }
      state.campusId = button.dataset.campusId;
      state.classBoostArmed = false;
      syncClassSelection();
      renderAll();
      await loadRosterAndRecords();
    });

    elements.classRail.addEventListener('click', async function (event) {
      const button = event.target.closest('[data-class-id]');
      if (!button) {
        return;
      }
      state.classId = button.dataset.classId;
      state.classBoostArmed = false;
      renderAll();
      await loadRosterAndRecords();
    });

    elements.campusRail.addEventListener('scroll', function () {
      updateRailControlState('campus');
    }, { passive: true });

    elements.classRail.addEventListener('scroll', function () {
      updateRailControlState('class');
    }, { passive: true });

    elements.campusRailPrevButton.addEventListener('click', function () {
      scrollRailByPage('campus', -1);
    });

    elements.campusRailNextButton.addEventListener('click', function () {
      scrollRailByPage('campus', 1);
    });

    elements.classRailPrevButton.addEventListener('click', function () {
      scrollRailByPage('class', -1);
    });

    elements.classRailNextButton.addEventListener('click', function () {
      scrollRailByPage('class', 1);
    });

    elements.studentGrid.addEventListener('click', function (event) {
      const button = event.target.closest('[data-student-id]');
      if (!button) {
        return;
      }
      selectStudent(button.dataset.studentId);
    });

    elements.categoryTabs.addEventListener('click', function (event) {
      const button = event.target.closest('[data-category]');
      if (!button) {
        return;
      }
      state.activeCategory = button.dataset.category;
      renderTabs();
      renderActionCards();
      resetPanelScroll();
    });

    elements.actionCards.addEventListener('click', function (event) {
      const button = event.target.closest('[data-rule-id]');
      if (!button) {
        return;
      }
      handleAction(button.dataset.ruleId);
    });

    elements.badgeActionCards.addEventListener('click', function (event) {
      const button = event.target.closest('[data-badge-definition-id]');
      if (!button) {
        return;
      }
      handleBadgeAction(button.dataset.badgeDefinitionId);
    });
    elements.classBoostToggleButton.addEventListener('click', function () {
      const selectedClass = getSelectedClass();
      if (!selectedClass || !state.roster.length) {
        return;
      }
      openClassBoostDialog();
    });

    if (elements.classBoostDialogCancelButton) {
      elements.classBoostDialogCancelButton.addEventListener('click', closeClassBoostDialog);
    }

    if (elements.classBoostDialogCloseButton) {
      elements.classBoostDialogCloseButton.addEventListener('click', closeClassBoostDialog);
    }

    if (elements.classBoostDialogConfirmButton) {
      elements.classBoostDialogConfirmButton.addEventListener('click', confirmClassBoost);
    }

    elements.openCreateClassButton.addEventListener('click', openCreateClassDialog);
    elements.openAddStudentButton.addEventListener('click', openAddStudentDialog);
    elements.removeSelectedStudentButton.addEventListener('click', handleRemoveSelectedStudent);
    elements.openSeedDialogButton.addEventListener('click', openSeedDialog);
    elements.openRedeemButton.addEventListener('click', openRedeemDialog);
    elements.createClassCampusSelect.addEventListener('change', renderDialogOptions);
    elements.createClassForm.addEventListener('submit', handleCreateClassSubmit);
    elements.closeCreateClassButton.addEventListener('click', function () {
      closeDialog(elements.createClassDialog);
    });
    elements.cancelCreateClassButton.addEventListener('click', function () {
      closeDialog(elements.createClassDialog);
    });

    elements.studentSearchForm.addEventListener('submit', handleStudentSearch);
    elements.studentSearchResults.addEventListener('click', function (event) {
      const button = event.target.closest('[data-add-student-id]');
      if (!button) {
        return;
      }
      handleAddStudent(button.dataset.addStudentId);
    });
    elements.closeAddStudentButton.addEventListener('click', function () {
      closeDialog(elements.addStudentDialog);
    });

    elements.seedForm.addEventListener('submit', handleSeedSubmit);
    elements.seedPointsInput.addEventListener('input', updateSeedPreview);
    elements.seedRemarkInput.addEventListener('input', updateSeedPreview);
    elements.closeSeedDialogButton.addEventListener('click', closeSeedDialog);
    elements.cancelSeedButton.addEventListener('click', closeSeedDialog);

    elements.redeemForm.addEventListener('submit', handleRedeemSubmit);
    elements.redeemItemInput.addEventListener('input', updateRedeemPreview);
    elements.redeemPointsInput.addEventListener('input', updateRedeemPreview);
    elements.closeRedeemButton.addEventListener('click', function () {
      closeDialog(elements.redeemDialog);
    });
    elements.cancelRedeemButton.addEventListener('click', function () {
      closeDialog(elements.redeemDialog);
    });

    elements.panelBackButton.addEventListener('click', closeMobilePanel);
    elements.closeSheetButton.addEventListener('click', closeMobilePanel);
    elements.sheetOverlay.addEventListener('click', closeMobilePanel);

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        closeMobilePanel();
      }
    });

    function handleViewportChange() {
      syncStudentSelection();
      renderAll();
      refreshRailControls();
      if (state.selectedStudentId) {
        resetPanelScroll();
        loadStudentRecords(state.selectedStudentId);
      }
    }

    if (typeof desktopMedia.addEventListener === 'function') {
      desktopMedia.addEventListener('change', handleViewportChange);
    } else if (typeof desktopMedia.addListener === 'function') {
      desktopMedia.addListener(handleViewportChange);
    }

    window.addEventListener('resize', refreshRailControls);

    if (window.__FILE_MODE__ && elements.fileModeNotice) {
      elements.fileModeNotice.hidden = false;
    }
    mountSessionActions(document.querySelector('.teacher-console-links'), authContext);
    renderSearchResults();
    updateSeedPreview();
    updateRedeemPreview();
    showInlineNotice('' );
    initializeData();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTeacherPage, { once: true });
  } else {
    initTeacherPage();
  }
}



















