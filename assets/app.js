(function () {
  // 共享数据层：负责初始化假数据、本地存储、积分流水与榜单计算。
  const STORAGE_KEYS = {
    config: 'points-mvp-config',
    students: 'points-mvp-students',
    records: 'points-mvp-records'
  };

  const AVATAR_COLORS = [
    '#2f9e44',
    '#1971c2',
    '#d9480f',
    '#ae3ec9',
    '#0b7285',
    '#c2255c',
    '#5f3dc4',
    '#2b8a3e'
  ];

  const STUDENT_NAMES = [
    '小宇', '小橙', '小航', '小米', '小泽', '小悠', '小川', '小夏',
    '小森', '小禾', '小北', '小满', '小雨', '小诺', '小朗', '小鲸',
    '小芮', '小野', '小辰', '小鹿', '小葵', '小舟', '小苒', '小墨',
    '小羽', '小初', '小棠', '小安', '小言', '小暖', '小亦', '小苏',
    '小屿', '小哲', '小音', '小朵', '小青', '小叶', '小光', '小溪',
    '小岚', '小宸', '小珂', '小曼', '小嘉', '小逸', '小优', '小恒'
  ];

  const DEFAULT_CONFIG = {
    campuses: [
      { id: 'guanghua', name: '光华校区', classes: ['启航班', '追光班'] },
      { id: 'xinghai', name: '星海校区', classes: ['乘风班', '远志班'] },
      { id: 'linhe', name: '临河校区', classes: ['卓越班', '星辰班'] }
    ],
    tiers: [
      { name: '1段', threshold: 0 },
      { name: '2段', threshold: 20 },
      { name: '3段', threshold: 40 },
      { name: '4段', threshold: 60 },
      { name: '5段', threshold: 85 },
      { name: '6段', threshold: 115 },
      { name: '7段', threshold: 150 },
      { name: '8段', threshold: 190 },
      { name: '9段', threshold: 240 }
    ],
    buttonGroups: {
      '课堂': [
        { label: '积极发言', points: 2 },
        { label: '专注听讲', points: 1 },
        { label: '合作互助', points: 2 },
        { label: '课堂挑战', points: 3 },
        { label: '带动氛围', points: 2 }
      ],
      '作业': [
        { label: '按时提交', points: 1 },
        { label: '全对满分', points: 3 },
        { label: '认真订正', points: 2 },
        { label: '书写整洁', points: 1 },
        { label: '进步明显', points: 2 }
      ],
      '作品': [
        { label: '作品优秀', points: 3 },
        { label: '创意表达', points: 3 },
        { label: '展示自信', points: 2 },
        { label: '完成完整', points: 2 },
        { label: '团队贡献', points: 2 }
      ],
      '习惯': [
        { label: '晨读坚持', points: 1 },
        { label: '整理收纳', points: 1 },
        { label: '礼貌待人', points: 2 },
        { label: '守时守纪', points: 2 },
        { label: '主动服务', points: 2 }
      ]
    },
    badges: [
      { name: '晨读之星', rule: '连续 7 天晨读完成' },
      { name: '作业达人', rule: '一周内作业累计满分 3 次' },
      { name: '合作能手', rule: '小组互助加分累计 10 分' },
      { name: '创意表达者', rule: '作品类加分累计 12 分' },
      { name: '习惯标兵', rule: '习惯类加分累计 15 分' },
      { name: '进步飞轮', rule: '近 7 天积分提升达到 20 分' },
      { name: '班级榜样', rule: '单月获得整班表扬 5 次' },
      { name: '全能成长者', rule: '四大类均有加分记录' }
    ]
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function readStorage(key, fallback) {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : clone(fallback);
    } catch (error) {
      return clone(fallback);
    }
  }

  function writeStorage(key, value) {
    window.localStorage.setItem(key, JSON.stringify(value));
  }

  // 生成多校区、多班级的默认学生演示数据。
  function createDefaultStudents() {
    let cursor = 0;

    return DEFAULT_CONFIG.campuses.flatMap(function (campus, campusIndex) {
      return campus.classes.flatMap(function (className, classIndex) {
        return Array.from({ length: 8 }, function (_, studentIndex) {
          const nickname = STUDENT_NAMES[cursor % STUDENT_NAMES.length];
          const seed = campusIndex * 100 + classIndex * 30 + studentIndex * 7 + 9;
          cursor += 1;

          return {
            id: campus.id + '-' + classIndex + '-' + studentIndex,
            campusId: campus.id,
            campusName: campus.name,
            className: className,
            nickname: nickname,
            totalPoints: 18 + ((seed * 5) % 88),
            progress7d: 4 + ((seed * 3) % 20),
            badgeCount: 1 + (seed % 5),
            avatar: {
              symbol: nickname.slice(-1),
              color: AVATAR_COLORS[seed % AVATAR_COLORS.length]
            }
          };
        });
      });
    });
  }

  // 首次打开页面时，自动写入默认配置与演示数据。
  function bootstrap() {
    if (!window.localStorage.getItem(STORAGE_KEYS.config)) {
      writeStorage(STORAGE_KEYS.config, DEFAULT_CONFIG);
    }

    if (!window.localStorage.getItem(STORAGE_KEYS.students)) {
      writeStorage(STORAGE_KEYS.students, createDefaultStudents());
    }

    if (!window.localStorage.getItem(STORAGE_KEYS.records)) {
      writeStorage(STORAGE_KEYS.records, []);
    }
  }

  function getConfig() {
    bootstrap();
    return readStorage(STORAGE_KEYS.config, DEFAULT_CONFIG);
  }

  function saveConfig(config) {
    writeStorage(STORAGE_KEYS.config, config);
  }

  function getStudents() {
    bootstrap();
    return readStorage(STORAGE_KEYS.students, createDefaultStudents());
  }

  function saveStudents(students) {
    writeStorage(STORAGE_KEYS.students, students);
  }

  function getRecords() {
    bootstrap();
    return readStorage(STORAGE_KEYS.records, []);
  }

  function saveRecords(records) {
    writeStorage(STORAGE_KEYS.records, records.slice(0, 400));
  }

  function getStudentsByClass(campusId, className) {
    return getStudents().filter(function (student) {
      return student.campusId === campusId && student.className === className;
    });
  }

  function getClassSummary(campusId, className) {
    const students = getStudentsByClass(campusId, className);
    const totalPoints = students.reduce(function (sum, student) {
      return sum + student.totalPoints;
    }, 0);

    return {
      totalPoints: totalPoints,
      count: students.length
    };
  }

  function resolveTier(points, tiers) {
    const orderedTiers = clone(tiers || getConfig().tiers).sort(function (left, right) {
      return left.threshold - right.threshold;
    });

    return orderedTiers.reduce(function (current, tier) {
      return points >= Number(tier.threshold || 0) ? tier : current;
    }, orderedTiers[0]);
  }

  function formatDateTime(isoString) {
    const date = new Date(isoString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return year + '-' + month + '-' + day + ' ' + hours + ':' + minutes;
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function createAvatarHtml(student, extraClass) {
    const className = ['avatar-badge', extraClass || ''].join(' ').trim();
    return '<span class="' + className + '" style="background:' + escapeHtml(student.avatar.color) + '">' + escapeHtml(student.avatar.symbol) + '</span>';
  }

  function normalizePoints(value) {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
      return 0;
    }
    return parsed;
  }

  // 单次加分会同步更新学生积分、近 7 天增量和流水记录。
  function addPoints(studentId, payload) {
    const students = getStudents();
    const records = getRecords();
    const targetIndex = students.findIndex(function (student) {
      return student.id === studentId;
    });

    if (targetIndex === -1) {
      return null;
    }

    const delta = normalizePoints(payload.points);
    const updatedStudent = clone(students[targetIndex]);
    updatedStudent.totalPoints += delta;
    updatedStudent.progress7d = Math.max(0, updatedStudent.progress7d + delta);
    updatedStudent.badgeCount = Math.min(8, Math.max(updatedStudent.badgeCount, 1 + Math.floor(updatedStudent.totalPoints / 60)));
    students[targetIndex] = updatedStudent;
    saveStudents(students);

    const record = {
      id: 'record-' + Date.now() + '-' + Math.random().toString(16).slice(2, 8),
      studentId: updatedStudent.id,
      campusId: updatedStudent.campusId,
      className: updatedStudent.className,
      nickname: updatedStudent.nickname,
      avatar: updatedStudent.avatar,
      category: payload.category,
      action: payload.label,
      points: delta,
      createdAt: new Date().toISOString(),
      totalAfter: updatedStudent.totalPoints
    };

    records.unshift(record);
    saveRecords(records);

    return {
      student: updatedStudent,
      record: record
    };
  }

  function addBatchPoints(studentIds, payload) {
    const idSet = new Set(studentIds);
    const students = getStudents();
    const records = getRecords();
    const delta = normalizePoints(payload.points);
    const results = [];
    let recordOffset = 0;

    const nextStudents = students.map(function (student) {
      if (!idSet.has(student.id)) {
        return student;
      }

      const updatedStudent = clone(student);
      updatedStudent.totalPoints += delta;
      updatedStudent.progress7d = Math.max(0, updatedStudent.progress7d + delta);
      updatedStudent.badgeCount = Math.min(8, Math.max(updatedStudent.badgeCount, 1 + Math.floor(updatedStudent.totalPoints / 60)));

      const record = {
        id: 'record-' + Date.now() + '-' + recordOffset,
        studentId: updatedStudent.id,
        campusId: updatedStudent.campusId,
        className: updatedStudent.className,
        nickname: updatedStudent.nickname,
        avatar: updatedStudent.avatar,
        category: payload.category,
        action: payload.label,
        points: delta,
        createdAt: new Date(Date.now() + recordOffset * 1000).toISOString(),
        totalAfter: updatedStudent.totalPoints
      };

      recordOffset += 1;
      records.unshift(record);
      results.push({ student: updatedStudent, record: record });
      return updatedStudent;
    });

    saveStudents(nextStudents);
    saveRecords(records);
    return results;
  }

  // 大屏页基于真实数据叠加少量波动，用于模拟自动刷新效果。
  function getDashboardView(tick) {
    const pulse = Number(tick || 0);
    const config = getConfig();

    return getStudents().map(function (student, index) {
      const tier = resolveTier(student.totalPoints, config.tiers);
      const progressOffset = ((index + pulse) % 5) - 1;
      const badgeOffset = (index + pulse) % 4 === 0 ? 1 : 0;

      return {
        id: student.id,
        nickname: student.nickname,
        campusName: student.campusName,
        className: student.className,
        totalPoints: student.totalPoints,
        progress7d: Math.max(0, student.progress7d + progressOffset),
        badgeCount: Math.min(8, student.badgeCount + badgeOffset),
        avatar: student.avatar,
        tierName: tier.name
      };
    });
  }

  function resetAllData() {
    writeStorage(STORAGE_KEYS.config, DEFAULT_CONFIG);
    writeStorage(STORAGE_KEYS.students, createDefaultStudents());
    writeStorage(STORAGE_KEYS.records, []);
  }

  window.PointsMVP = {
    bootstrap: bootstrap,
    getConfig: getConfig,
    saveConfig: saveConfig,
    getStudents: getStudents,
    saveStudents: saveStudents,
    getStudentsByClass: getStudentsByClass,
    getClassSummary: getClassSummary,
    getRecords: getRecords,
    addPoints: addPoints,
    addBatchPoints: addBatchPoints,
    resolveTier: resolveTier,
    getDashboardView: getDashboardView,
    formatDateTime: formatDateTime,
    createAvatarHtml: createAvatarHtml,
    escapeHtml: escapeHtml,
    resetAllData: resetAllData,
    defaults: clone(DEFAULT_CONFIG)
  };
})();

