(function () {
  const manifest = window.__AVATAR_MANIFEST__ || { list: [], categories: {} };

  const CATEGORY_META = {
    classroom: { label: '课堂表现', shortLabel: '课堂', tip: '上课就点，反馈最直接' },
    homework: { label: '作业练习', shortLabel: '作业', tip: '课后补分，节奏很快' },
    project: { label: '作品展示', shortLabel: '作品', tip: '作品完成就能立刻鼓励' },
    habits: { label: '习惯评估', shortLabel: '习惯', tip: '把稳定的好习惯记下来' }
  };

  const LEGAL_NAMES = [
    '林沐阳', '陈知夏', '周星言', '许果果', '沈安可', '顾云舟', '宋小满', '何听雨',
    '苏禾禾', '程一诺', '江南星', '叶知远', '唐可乐', '白糯糯', '夏知秋', '陆安安',
    '温小树', '方晨曦', '齐月白', '裴星河', '梁柚子', '简鹿鸣', '赵晴川', '孟初晴'
  ];
  const DISPLAY_NAMES = [
    '小星星', '云朵', '果果', '跳跳', '阿树', '月牙', '小探险家', '花铃',
    '圆圆', '橙子', '闪闪', '小海风', '叶芽', '可可', '晴晴', '豆豆'
  ];
  const GRADES = ['小班', '中班', '大班', '一年级', '二年级', '三年级'];
  const CAMPUSES = ['星河校区', '海棠校区', '云杉校区'];
  const CLASS_NAMES = ['启航探索班', '森林创想班', '星光表达班'];
  const PARENTS = ['李妈妈', '王妈妈', '陈爸爸', '周妈妈', '林爸爸', '许妈妈'];
  const NOTES = [
    '喜欢动手搭建，适合项目激励。',
    '课堂专注度高，头像缩小后也很清晰。',
    '表达欲强，适合展示页高频曝光。',
    '在班级列表里辨识度很好。',
    '适合做统一主头像库的默认头像。'
  ];
  const STATUS_CYCLE = ['normal', 'normal', 'normal', 'temporary', 'pending_merge', 'normal'];

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function resolveAvatarAssetUrl(pathname) {
    const value = String(pathname || '').trim().replace(/\\/g, '/');
    if (!value) {
      return '';
    }
    if (/^(https?:\/\/|data:image\/|blob:|file:\/\/)/i.test(value)) {
      return value;
    }
    if (value.startsWith('./') || value.startsWith('../')) {
      return value;
    }
    if (value.startsWith('/')) {
      return '.' + value;
    }
    return './' + value.replace(/^\/+/, '');
  }

  function getStudentDisplayName(student) {
    return student && (student.display_name || student.legal_name || student.name || student.student_code) || '未命名学生';
  }

  function formatDateTime(value) {
    if (!value) {
      return '-';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return String(value);
    }
    const parts = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0')
    ];
    const time = [
      String(date.getHours()).padStart(2, '0'),
      String(date.getMinutes()).padStart(2, '0')
    ];
    return parts.join('-') + ' ' + time.join(':');
  }

  function getCampusShortName(name) {
    const value = String(name || '').trim();
    if (!value) {
      return '';
    }
    return value.replace(/校区$/u, '') || value;
  }

  function normalizeTierList(rows) {
    const normalized = (rows || []).map(function (row, index) {
      return {
        name: row.level_name || row.name || ('等级 ' + (index + 1)),
        threshold: Number(row.threshold || 0)
      };
    }).sort(function (left, right) {
      return left.threshold - right.threshold;
    });

    if (!normalized.length || normalized[0].threshold !== 0) {
      normalized.unshift({ name: '新芽', threshold: 0 });
    }
    return normalized;
  }

  function resolveTier(points, tiers) {
    const score = Number(points || 0);
    const levelTiers = normalizeTierList(tiers);
    let current = levelTiers[0];
    for (let index = 0; index < levelTiers.length; index += 1) {
      if (score >= levelTiers[index].threshold) {
        current = levelTiers[index];
      }
    }
    return current;
  }

  function getTierProgress(points, tiers) {
    const score = Number(points || 0);
    const levelTiers = normalizeTierList(tiers);
    let currentIndex = 0;
    for (let index = 0; index < levelTiers.length; index += 1) {
      if (score >= levelTiers[index].threshold) {
        currentIndex = index;
      }
    }
    const currentTier = levelTiers[currentIndex];
    const nextTier = levelTiers[currentIndex + 1] || null;
    if (!nextTier) {
      return { currentTier: currentTier, nextTier: null, distance: 0, progress: 100 };
    }
    const span = Math.max(1, nextTier.threshold - currentTier.threshold);
    const progress = Math.max(0, Math.min(100, ((score - currentTier.threshold) / span) * 100));
    return {
      currentTier: currentTier,
      nextTier: nextTier,
      distance: Math.max(0, nextTier.threshold - score),
      progress: progress
    };
  }

  function computeBadgePlaceholder(totalPoints, progress7d) {
    const total = Number(totalPoints || 0);
    const progress = Number(progress7d || 0);
    return Math.max(1, Math.round(total / 48) + Math.round(progress / 14));
  }

  function createAvatarHtml(student, extraClass) {
    const className = ['avatar-badge', extraClass || '', 'avatar-badge--image'].filter(Boolean).join(' ');
    const src = resolveAvatarAssetUrl(student && (student.avatar_url || student.image_path));
    return '<span class="' + className + '"><img src="' + escapeHtml(encodeURI(src)) + '" alt="' + escapeHtml(getStudentDisplayName(student)) + '" loading="lazy" /></span>';
  }

  function buildPreviewStudents(count, offset) {
    const size = Number(count || 12);
    const start = Number(offset || 0);
    const avatarList = Array.isArray(manifest.list) ? manifest.list : [];
    const avatarCount = Math.max(1, avatarList.length);

    return Array.from({ length: size }, function (_item, position) {
      const index = Math.abs(start + position);
      const avatar = avatarList[index % avatarCount] || {};
      const totalPoints = 108 + (index * 17) % 220;
      const progress = 6 + (index * 9) % 36;
      const badgeCount = Math.max(1, Math.round(totalPoints / 48) + (index % 3));
      const createdDate = new Date(Date.UTC(2026, 2, 1 + (index % 20), 8 + (index % 5), 10 + (index % 40), 0));

      return {
        id: 'preview-student-' + (index + 1),
        student_id: 'preview-student-' + (index + 1),
        student_code: 'PV' + String(index + 1).padStart(4, '0'),
        legal_name: LEGAL_NAMES[index % LEGAL_NAMES.length],
        display_name: DISPLAY_NAMES[index % DISPLAY_NAMES.length],
        grade: GRADES[index % GRADES.length],
        parent_name: PARENTS[index % PARENTS.length],
        parent_phone: '1390000' + String(1200 + index).padStart(4, '0'),
        avatar_url: avatar.image_path || '',
        avatar_code: avatar.code || '',
        avatar_name: avatar.name || '',
        notes: NOTES[index % NOTES.length],
        status: STATUS_CYCLE[index % STATUS_CYCLE.length],
        created_by_role: 'admin',
        created_at: createdDate.toISOString(),
        total_points: totalPoints,
        progress_7d: progress,
        badge_count: badgeCount,
        campus_name: CAMPUSES[index % CAMPUSES.length],
        class_name: CLASS_NAMES[index % CLASS_NAMES.length]
      };
    });
  }

  window.FileAvatarPreview = {
    manifest: manifest,
    CATEGORY_META: CATEGORY_META,
    escapeHtml: escapeHtml,
    resolveAvatarAssetUrl: resolveAvatarAssetUrl,
    getStudentDisplayName: getStudentDisplayName,
    formatDateTime: formatDateTime,
    getCampusShortName: getCampusShortName,
    normalizeTierList: normalizeTierList,
    resolveTier: resolveTier,
    getTierProgress: getTierProgress,
    computeBadgePlaceholder: computeBadgePlaceholder,
    createAvatarHtml: createAvatarHtml,
    buildPreviewStudents: buildPreviewStudents
  };
})();
