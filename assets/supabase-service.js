import { ensureSupabase } from './supabase-client.js';

import { DEFAULT_BADGE_DEFINITIONS, DEFAULT_POINT_RULES, OFFICIAL_CAMPUSES, OFFICIAL_CAMPUS_NAMES } from './default-config.js';

const ACTIVE_POINT_RULE_FIELDS = 'id, category, rule_name, points, sort_order, is_active, is_common, created_at';
const ADMIN_POINT_RULE_FIELDS = 'id, category, rule_name, points, sort_order, is_active, is_common, created_at';
const LEVEL_TIER_FIELDS = 'id, level_no, level_name, threshold, is_active, created_at, updated_at';
const BADGE_DEFINITION_FIELDS = 'id, code, name, description, event_label, icon_token, threshold, is_active, sort_order, created_at, updated_at';
const SUBJECT_FIELDS = 'id, name, code, status, created_at';
const STUDENT_FIELDS = 'id, student_code, legal_name, display_name, gender, grade, birth_year, parent_name, parent_phone, avatar_url, status, created_by_role, created_by_id, notes, created_at, updated_at';
const STUDENT_DUPLICATE_FIELDS = 'id, student_code, legal_name, display_name, grade, parent_name, parent_phone, status, created_at';
const CLASS_SELECT_FIELDS = `
  id,
  class_name,
  campus_id,
  subject_id,
  teacher_id,
  schedule_text,
  class_type,
  status,
  created_by_id,
  created_at,
  campuses:campus_id ( id, name, code ),
  subjects:subject_id ( id, name, code ),
  teachers:teacher_id ( id, name, display_name )
`;

const CATEGORY_ORDER = ['classroom', 'homework', 'project', 'habits'];
const INACTIVE_STORAGE_STATUS = 'pending_merge';

const OFFICIAL_CAMPUS_ORDER = OFFICIAL_CAMPUS_NAMES.reduce(function (orderMap, campusName, index) {
  orderMap[normalizeCampusName(campusName)] = index;
  return orderMap;
}, {});

const OFFICIAL_CAMPUS_ID_MAP = OFFICIAL_CAMPUSES.reduce(function (idMap, campus) {
  idMap[campus.id] = campus;
  return idMap;
}, {});

function normalizeCampusName(value) {
  return String(value || '').trim().replace(/校区$/u, '');
}

function getCanonicalCampusName(value) {
  const normalized = normalizeCampusName(value);
  return OFFICIAL_CAMPUS_NAMES.find(function (campusName) {
    return normalizeCampusName(campusName) === normalized;
  }) || normalized || String(value || '').trim();
}

function isOfficialCampusName(value) {
  const normalized = normalizeCampusName(value);
  return Object.prototype.hasOwnProperty.call(OFFICIAL_CAMPUS_ORDER, normalized);
}

function sortCampusesByOfficialOrder(rows) {
  return rows.slice().sort(function (left, right) {
    const leftRank = OFFICIAL_CAMPUS_ORDER[normalizeCampusName(left?.name)] ?? Number.MAX_SAFE_INTEGER;
    const rightRank = OFFICIAL_CAMPUS_ORDER[normalizeCampusName(right?.name)] ?? Number.MAX_SAFE_INTEGER;
    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }
    return String(left?.name || '').localeCompare(String(right?.name || ''), 'zh-CN');
  });
}

function mapCampusNameFields(row) {
  if (!row || typeof row !== 'object') {
    return row;
  }

  const mappedRow = { ...row };
  if (mappedRow.name) {
    mappedRow.name = getCanonicalCampusName(mappedRow.name);
  }
  if (mappedRow.campus_name) {
    mappedRow.campus_name = getCanonicalCampusName(mappedRow.campus_name);
  }
  if (mappedRow.campuses?.name) {
    mappedRow.campuses = {
      ...mappedRow.campuses,
      name: getCanonicalCampusName(mappedRow.campuses.name)
    };
  }
  return mappedRow;
}

function normalizeRuleName(value) {
  const ruleName = String(value || '').trim();
  if (ruleName === '专注听讲') {
    return '专注听课';
  }
  if (ruleName === '积极发言') {
    return '积极表达';
  }
  return ruleName;
}

function comparePointRules(left, right) {
  if (String(left?.category || '') !== String(right?.category || '')) {
    const leftRank = CATEGORY_ORDER.indexOf(String(left?.category || ''));
    const rightRank = CATEGORY_ORDER.indexOf(String(right?.category || ''));
    return (leftRank === -1 ? CATEGORY_ORDER.length : leftRank) - (rightRank === -1 ? CATEGORY_ORDER.length : rightRank);
  }
  if (Number(left?.sort_order || 0) !== Number(right?.sort_order || 0)) {
    return Number(left?.sort_order || 0) - Number(right?.sort_order || 0);
  }
  if (Boolean(left?.is_common) !== Boolean(right?.is_common)) {
    return Number(Boolean(right?.is_common)) - Number(Boolean(left?.is_common));
  }
  return String(left?.rule_name || '').localeCompare(String(right?.rule_name || ''), 'zh-CN');
}

function buildOfficialCampusRows(rows) {
  const campusMap = new Map();

  (rows || []).forEach(function (row) {
    const mappedRow = mapCampusNameFields(row);
    const campusName = normalizeCampusName(mappedRow?.name);
    if (campusName && isOfficialCampusName(campusName)) {
      campusMap.set(campusName, {
        ...mappedRow,
        status: mappedRow.status || 'active',
        __localOnly: false
      });
    }
  });

  OFFICIAL_CAMPUSES.forEach(function (campus) {
    const normalizedName = normalizeCampusName(campus.name);
    if (!campusMap.has(normalizedName)) {
      campusMap.set(normalizedName, {
        id: campus.id,
        name: campus.name,
        code: campus.code,
        status: 'active',
        created_at: null,
        __localOnly: true
      });
    }
  });

  return sortCampusesByOfficialOrder(Array.from(campusMap.values()));
}

function reconcilePointRuleRows(rows) {
  const merged = (rows || []).map(function (row) {
    const normalizedRuleName = normalizeRuleName(row.rule_name);
    const isPunctualRule = normalizedRuleName === '准时到课';
    return {
      ...row,
      rule_name: normalizedRuleName,
      category: isPunctualRule ? 'classroom' : row.category,
      points: isPunctualRule ? 1 : Number(row.points || 0),
      sort_order: isPunctualRule ? 60 : Number(row.sort_order || 0),
      is_active: row.is_active !== false,
      is_common: isPunctualRule ? true : Boolean(row.is_common),
      __localOnly: false
    };
  });

  const hasPunctualRule = merged.some(function (row) {
    return row.rule_name === '准时到课';
  });
  if (!hasPunctualRule) {
    const fallbackPunctualRule = DEFAULT_POINT_RULES.find(function (row) {
      return row.rule_name === '准时到课' && row.category === 'classroom';
    });
    if (fallbackPunctualRule) {
      merged.push({
        ...fallbackPunctualRule,
        __localOnly: true
      });
    }
  }

  DEFAULT_POINT_RULES
    .filter(function (row) {
      return Number(row.points || 0) < 0;
    })
    .forEach(function (fallbackRule) {
      const exists = merged.some(function (row) {
        return row.id === fallbackRule.id || row.rule_name === fallbackRule.rule_name;
      });
      if (!exists) {
        merged.push({
          ...fallbackRule,
          __localOnly: true
        });
      }
    });

  return merged.sort(comparePointRules);
}

function reconcileBadgeDefinitionRows(rows) {
  const merged = (rows || []).map(function (row) {
    if (row.code === 'persistence_star') {
      return {
        ...row,
        event_label: '准时到课',
        description: '准时到课累计达到阈值后解锁。'
      };
    }
    return {
      ...row,
      event_label: normalizeRuleName(row.event_label)
    };
  });

  const hasPersistenceBadge = merged.some(function (row) {
    return row.code === 'persistence_star';
  });
  if (!hasPersistenceBadge) {
    const fallbackBadge = DEFAULT_BADGE_DEFINITIONS.find(function (row) {
      return row.code === 'persistence_star';
    });
    if (fallbackBadge) {
      merged.push({
        ...fallbackBadge,
        id: fallbackBadge.id || null
      });
    }
  }

  return merged.sort(function (left, right) {
    if (Number(left?.sort_order || 0) !== Number(right?.sort_order || 0)) {
      return Number(left?.sort_order || 0) - Number(right?.sort_order || 0);
    }
    return String(left?.name || '').localeCompare(String(right?.name || ''), 'zh-CN');
  });
}

function buildErrorMessage(prefix, message) {
  const normalizedPrefix = String(prefix || '').trim();
  const normalizedMessage = String(message || '').trim();
  if (!normalizedPrefix) {
    return normalizedMessage;
  }
  if (!normalizedMessage) {
    return normalizedPrefix;
  }
  return `${normalizedPrefix}：${normalizedMessage}`;
}

function mapSupabaseError(error, context) {
  const code = String(error?.code || '').trim();
  const message = String(error?.message || error || '').trim();

  if (
    code === 'PGRST205'
    && /(badge_definitions|student_badge_progress|student_badge_unlocks|badge_leaderboard)/i.test(message)
  ) {
    return new Error(buildErrorMessage(
      context,
      '生产数据库尚未升级到真实徽章链路。请先执行 supabase/009_badges_real_chain.sql，再刷新页面重试。'
    ));
  }

  return new Error(buildErrorMessage(context, message || '请求失败'));
}

async function runQuery(builder, context) {
  const { data, error } = await builder;
  if (error) {
    throw mapSupabaseError(error, context);
  }
  return data;
}

function chunkValues(values, size = 50) {
  const chunks = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

function uniqueTruthy(values) {
  return Array.from(new Set((values || []).map(function (value) {
    return String(value || '').trim();
  }).filter(Boolean)));
}

function mergeRowsById(rows) {
  const rowMap = new Map();
  rows.forEach(function (row) {
    if (row?.id) {
      rowMap.set(row.id, row);
    }
  });
  return Array.from(rowMap.values());
}

export async function fetchCampuses() {
  const supabase = ensureSupabase();
  const rows = await runQuery(
    supabase.from('campuses').select('id, name, code, status, created_at').eq('status', 'active').order('created_at')
  );

  return buildOfficialCampusRows(rows);
}

export async function fetchSubjects() {
  const supabase = ensureSupabase();
  return runQuery(
    supabase
      .from('subjects')
      .select(SUBJECT_FIELDS)
      .eq('status', 'active')
      .order('name'),
    '读取课程列表失败'
  );
}

function mapStudentStatusForApp(status) {
  const normalizedStatus = String(status || '').trim();
  if (normalizedStatus === INACTIVE_STORAGE_STATUS) {
    return 'inactive';
  }
  return normalizedStatus || 'normal';
}

function mapStudentStatusForStorage(status) {
  const normalizedStatus = String(status || '').trim();
  if (normalizedStatus === 'inactive') {
    return INACTIVE_STORAGE_STATUS;
  }
  return normalizedStatus || 'normal';
}

function mapStudentStatusFields(row) {
  if (!row || typeof row !== 'object') {
    return row;
  }
  const mappedRow = { ...row };
  if (Object.prototype.hasOwnProperty.call(mappedRow, 'status')) {
    mappedRow.status = mapStudentStatusForApp(mappedRow.status);
  }
  if (Object.prototype.hasOwnProperty.call(mappedRow, 'student_status')) {
    mappedRow.student_status = mapStudentStatusForApp(mappedRow.student_status);
  }
  return mappedRow;
}

function mapStudentStatusRows(rows) {
  return (rows || []).map(mapStudentStatusFields);
}

function isStudentInactiveStatus(status) {
  const normalizedStatus = String(status || '').trim();
  return normalizedStatus === 'inactive' || normalizedStatus === INACTIVE_STORAGE_STATUS;
}

function isExcludedStudentStatus(status) {
  const normalizedStatus = String(status || '').trim();
  return normalizedStatus === 'merged' || isStudentInactiveStatus(normalizedStatus);
}

export async function fetchSubjectsDirectory() {
  const supabase = ensureSupabase();
  return runQuery(
    supabase
      .from('subjects')
      .select(SUBJECT_FIELDS)
      .order('status', { ascending: true })
      .order('name', { ascending: true }),
    '读取课程目录失败'
  );
}

export async function upsertSubjects(rows) {
  const supabase = ensureSupabase();
  const payload = (Array.isArray(rows) ? rows : [rows]).map(function (row) {
    const baseRow = {
      name: String(row.name || '').trim(),
      code: String(row.code || '').trim(),
      status: row.status === 'inactive' ? 'inactive' : 'active'
    };
    if (row.id) {
      return {
        id: row.id,
        ...baseRow
      };
    }
    return baseRow;
  });

  return runQuery(
    supabase
      .from('subjects')
      .upsert(payload, { onConflict: 'id' })
      .select(SUBJECT_FIELDS)
      .order('status', { ascending: true })
      .order('name', { ascending: true }),
    '保存课程失败'
  );
}

export async function fetchTeachers(campusId) {
  const supabase = ensureSupabase();
  let query = supabase
    .from('teachers')
    .select('id, name, display_name, phone, role, campus_id, status, created_at')
    .eq('status', 'active')
    .order('created_at', { ascending: true });

  if (campusId) {
    query = query.eq('campus_id', campusId);
  }

  return runQuery(query);
}

export async function fetchClasses(options = {}) {
  const supabase = ensureSupabase();
  const statuses = Array.isArray(options.statuses) && options.statuses.length
    ? options.statuses
    : ['draft', 'active'];

  let query = supabase
    .from('classes')
    .select(CLASS_SELECT_FIELDS)
    .in('status', statuses)
    .order('created_at', { ascending: true });

  if (options.teacherId) {
    query = query.eq('teacher_id', options.teacherId);
  }

  const rows = await runQuery(query);
  return rows
    .map(mapCampusNameFields)
    .filter(function (row) {
      return isOfficialCampusName(row?.campuses?.name);
    });
}

export async function fetchClassesDirectory() {
  const supabase = ensureSupabase();
  const rows = await runQuery(
    supabase
      .from('classes')
      .select(CLASS_SELECT_FIELDS)
      .order('created_at', { ascending: false })
  );

  return rows
    .map(mapCampusNameFields)
    .filter(function (row) {
      return isOfficialCampusName(row?.campuses?.name);
    });
}

export async function fetchClassMemberLinks() {
  const supabase = ensureSupabase();
  return runQuery(
    supabase
      .from('class_students')
      .select('id, class_id, student_id, joined_at, member_status')
      .eq('member_status', 'active')
  );
}

export async function fetchPointRules() {
  const supabase = ensureSupabase();
  const rows = await runQuery(
    supabase
      .from('point_rules')
      .select(ACTIVE_POINT_RULE_FIELDS)
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('is_common', { ascending: false })
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
  );

  return reconcilePointRuleRows(rows).filter(function (row) {
    return row.is_active !== false;
  });
}

export async function fetchAdminPointRules() {
  const supabase = ensureSupabase();
  const rows = await runQuery(
    supabase
      .from('point_rules')
      .select(ADMIN_POINT_RULE_FIELDS)
      .order('category', { ascending: true })
      .order('is_common', { ascending: false })
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
  );

  return reconcilePointRuleRows(rows);
}

export async function upsertPointRules(rows) {
  const supabase = ensureSupabase();
  const payload = Array.isArray(rows) ? rows : [rows];
  return runQuery(
    supabase
      .from('point_rules')
      .upsert(payload, { onConflict: 'id' })
      .select(ADMIN_POINT_RULE_FIELDS)
      .order('category', { ascending: true })
      .order('is_common', { ascending: false })
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
  );
}

export async function fetchLevelTiers() {
  const supabase = ensureSupabase();
  return runQuery(
    supabase
      .from('level_tiers')
      .select(LEVEL_TIER_FIELDS)
      .order('level_no', { ascending: true })
  );
}

export async function upsertLevelTiers(rows) {
  const supabase = ensureSupabase();
  const payload = Array.isArray(rows) ? rows : [rows];
  return runQuery(
    supabase
      .from('level_tiers')
      .upsert(payload, { onConflict: 'level_no' })
      .select(LEVEL_TIER_FIELDS)
      .order('level_no', { ascending: true })
  );
}

export async function fetchBadgeDefinitions(options = {}) {
  const supabase = ensureSupabase();
  const activeOnly = options.activeOnly !== false;
  let query = supabase
    .from('badge_definitions')
    .select(BADGE_DEFINITION_FIELDS)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  const rows = await runQuery(query, '读取徽章规则失败');
  return reconcileBadgeDefinitionRows(rows).filter(function (row) {
    return activeOnly ? row.is_active !== false : true;
  });
}

export async function upsertBadgeDefinitions(rows) {
  const supabase = ensureSupabase();
  const payload = Array.isArray(rows) ? rows : [rows];
  return runQuery(
    supabase
      .from('badge_definitions')
      .upsert(payload, { onConflict: 'code' })
      .select(BADGE_DEFINITION_FIELDS)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
  , '保存徽章规则失败');
}

export async function fetchStudentsList(options = {}) {
  const supabase = ensureSupabase();
  const search = String(options.search || '').trim();
  const status = mapStudentStatusForStorage(options.status);
  const limit = Math.max(1, Math.min(Number(options.limit || 200), 500));

  let query = supabase
    .from('students')
    .select(STUDENT_FIELDS)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  if (search) {
    query = query.or([
      `display_name.ilike.%${search}%`,
      `legal_name.ilike.%${search}%`,
      `parent_phone.ilike.%${search}%`,
      `student_code.ilike.%${search}%`
    ].join(','));
  }

  return mapStudentStatusRows(await runQuery(query));
}

export async function createStudents(rows) {
  const supabase = ensureSupabase();
  const payload = (Array.isArray(rows) ? rows : [rows]).map(function (row) {
    return {
      ...row,
      status: mapStudentStatusForStorage(row?.status)
    };
  });
  return mapStudentStatusRows(await runQuery(
    supabase
      .from('students')
      .insert(payload)
      .select(STUDENT_FIELDS)
  ));
}

export async function updateStudent(studentId, payload) {
  const supabase = ensureSupabase();
  return mapStudentStatusFields(await runQuery(
    supabase
      .from('students')
      .update({
        ...payload,
        ...(Object.prototype.hasOwnProperty.call(payload || {}, 'status')
          ? { status: mapStudentStatusForStorage(payload.status) }
          : {})
      })
      .eq('id', studentId)
      .select(STUDENT_FIELDS)
      .single()
  ));
}

export async function updateStudentStatus(studentId, status) {
  return updateStudent(studentId, { status });
}

export async function fetchStudentUsageStats(studentId) {
  const supabase = ensureSupabase();
  const [classRelationCount, ledgerCount, badgeEventCount, badgeUnlockCount] = await Promise.all([
    fetchHeadCount(
      supabase
        .from('class_students')
        .select('id', { count: 'exact', head: true })
        .eq('student_id', studentId),
      '读取学生班级关系失败'
    ),
    fetchHeadCount(
      supabase
        .from('point_ledger')
        .select('id', { count: 'exact', head: true })
        .eq('student_id', studentId),
      '读取学生积分流水失败'
    ),
    fetchHeadCount(
      supabase
        .from('student_badge_events')
        .select('id', { count: 'exact', head: true })
        .eq('student_id', studentId),
      '读取学生徽章行为记录失败'
    ),
    fetchHeadCount(
      supabase
        .from('student_badge_unlocks')
        .select('id', { count: 'exact', head: true })
        .eq('student_id', studentId),
      '读取学生徽章解锁记录失败'
    )
  ]);

  return {
    classRelationCount,
    ledgerCount,
    badgeEventCount,
    badgeUnlockCount,
    canHardDelete: classRelationCount === 0 && ledgerCount === 0 && badgeEventCount === 0 && badgeUnlockCount === 0
  };
}

export async function deleteStudent(studentId) {
  const supabase = ensureSupabase();
  const stats = await fetchStudentUsageStats(studentId);
  if (!stats.canHardDelete) {
    const blockers = [
      stats.classRelationCount ? `${stats.classRelationCount} 条班级关系` : '',
      stats.ledgerCount ? `${stats.ledgerCount} 条积分流水` : '',
      stats.badgeEventCount ? `${stats.badgeEventCount} 条徽章行为记录` : '',
      stats.badgeUnlockCount ? `${stats.badgeUnlockCount} 条徽章解锁记录` : ''
    ].filter(Boolean);
    throw new Error(`学生已有历史数据（${blockers.join('、')}），只能停用，不能直接删除。`);
  }

  const { error } = await supabase
    .from('students')
    .delete()
    .eq('id', studentId);

  if (error) {
    throw mapSupabaseError(error, '删除学生失败');
  }

  return true;
}

export async function fetchStudentDuplicateCandidates(options = {}) {
  const supabase = ensureSupabase();
  const legalNames = uniqueTruthy(options.legalNames);
  const parentPhones = uniqueTruthy(options.parentPhones);
  const builders = [];

  chunkValues(legalNames).forEach(function (namesChunk) {
    builders.push(
      supabase
        .from('students')
        .select(STUDENT_DUPLICATE_FIELDS)
        .neq('status', 'merged')
        .in('legal_name', namesChunk)
    );
  });

  chunkValues(parentPhones).forEach(function (phonesChunk) {
    builders.push(
      supabase
        .from('students')
        .select(STUDENT_DUPLICATE_FIELDS)
        .neq('status', 'merged')
        .in('parent_phone', phonesChunk)
    );
  });

  if (!builders.length) {
    return [];
  }

  const resultSets = await Promise.all(builders.map(function (builder) {
    return runQuery(builder);
  }));

  return mapStudentStatusRows(mergeRowsById(resultSets.flat()));
}

export async function fetchClassRoster(classId) {
  const supabase = ensureSupabase();
  const rows = await runQuery(
    supabase
      .from('class_student_roster')
      .select('*')
      .eq('class_id', classId)
      .eq('member_status', 'active')
      .order('joined_at', { ascending: true })
  );
  return mapStudentStatusRows(rows).filter(function (row) {
    return !isExcludedStudentStatus(row.student_status);
  });
}

export async function fetchStudentLedger(studentId, limit = 6) {
  const supabase = ensureSupabase();
  return runQuery(
    supabase
      .from('point_ledger')
      .select('id, student_id, class_id, campus_id, subject_id, teacher_id, rule_id, rule_name_snapshot, category_snapshot, points_delta, action_type, remark, created_at')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .limit(limit)
  );
}

export async function fetchStudentBadgeProgress(studentId) {
  const supabase = ensureSupabase();
  const ids = Array.isArray(studentId) ? studentId.filter(Boolean) : [studentId].filter(Boolean);
  let query = supabase
    .from('student_badge_progress')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('badge_name', { ascending: true });

  if (ids.length === 1) {
    query = query.eq('student_id', ids[0]);
  } else if (ids.length > 1) {
    query = query.in('student_id', ids);
  }

  const rows = mapStudentStatusRows(await runQuery(query, '读取学生徽章进度失败')).filter(function (row) {
    return !isExcludedStudentStatus(row.status);
  });
  return rows.map(function (row) {
    if (row.code === 'persistence_star') {
      return {
        ...row,
        event_label: '准时到课',
        description: '准时到课累计达到阈值后解锁。'
      };
    }
    return {
      ...row,
      event_label: normalizeRuleName(row.event_label)
    };
  });
}

export async function insertStudentBadgeEvent(payload) {
  const supabase = ensureSupabase();
  return runQuery(
    supabase
      .from('student_badge_events')
      .insert(Array.isArray(payload) ? payload : [payload])
      .select('id, student_id, badge_definition_id, teacher_id, class_id, note, created_at')
  , '写入徽章行为记录失败');
}

export async function createClass(payload) {
  const supabase = ensureSupabase();
  try {
    return await runQuery(
      supabase
        .from('classes')
        .insert(payload)
        .select(CLASS_SELECT_FIELDS)
        .single(),
      '创建班级失败'
    );
  } catch (error) {
    const targetCampus = OFFICIAL_CAMPUS_ID_MAP[String(payload?.campus_id || '').trim()];
    if (targetCampus && /foreign key|violates/i.test(String(error?.message || ''))) {
      throw new Error(`正式校区“${targetCampus.name}”还没写入数据库，请先执行 supabase/010_rollout_cleanup.sql。`);
    }
    throw error;
  }
}

export async function updateClass(classId, payload) {
  const supabase = ensureSupabase();
  try {
    return await runQuery(
      supabase
        .from('classes')
        .update(payload)
        .eq('id', classId)
        .select(CLASS_SELECT_FIELDS)
        .single(),
      '更新班级失败'
    );
  } catch (error) {
    const targetCampus = OFFICIAL_CAMPUS_ID_MAP[String(payload?.campus_id || '').trim()];
    if (targetCampus && /foreign key|violates/i.test(String(error?.message || ''))) {
      throw new Error(`正式校区“${targetCampus.name}”还没写入数据库，请先执行 supabase/010_rollout_cleanup.sql。`);
    }
    throw error;
  }
}

export async function archiveClass(classId) {
  return updateClass(classId, { status: 'archived' });
}

async function fetchHeadCount(builder, context) {
  const { count, error } = await builder;
  if (error) {
    throw mapSupabaseError(error, context);
  }
  return Number(count || 0);
}

export async function fetchClassUsageStats(classId) {
  const supabase = ensureSupabase();
  const [activeMemberCount, ledgerCount] = await Promise.all([
    fetchHeadCount(
      supabase
        .from('class_students')
        .select('id', { count: 'exact', head: true })
        .eq('class_id', classId)
        .eq('member_status', 'active'),
      '读取班级学生人数失败'
    ),
    fetchHeadCount(
      supabase
        .from('point_ledger')
        .select('id', { count: 'exact', head: true })
        .eq('class_id', classId),
      '读取班级积分流水失败'
    )
  ]);

  return {
    activeMemberCount,
    ledgerCount,
    canHardDelete: activeMemberCount === 0 && ledgerCount === 0
  };
}

export async function deleteClass(classId) {
  const supabase = ensureSupabase();
  const stats = await fetchClassUsageStats(classId);
  if (!stats.canHardDelete) {
    throw new Error('班级已有学生或积分流水，只能归档，不能直接删除。');
  }

  const { error } = await supabase
    .from('classes')
    .delete()
    .eq('id', classId);

  if (error) {
    throw mapSupabaseError(error, '删除班级失败');
  }

  return true;
}

export async function searchStudents(keyword) {
  const supabase = ensureSupabase();
  const trimmed = keyword.trim();
  let query = supabase
    .from('students')
    .select('id, student_code, legal_name, display_name, grade, parent_name, parent_phone, status, created_at')
    .neq('status', 'merged')
    .neq('status', INACTIVE_STORAGE_STATUS)
    .order('created_at', { ascending: false })
    .limit(20);

  if (trimmed) {
    query = query.or([
      `display_name.ilike.%${trimmed}%`,
      `legal_name.ilike.%${trimmed}%`,
      `student_code.ilike.%${trimmed}%`,
      `parent_phone.ilike.%${trimmed}%`
    ].join(','));
  }

  return mapStudentStatusRows(await runQuery(query, '搜索学生失败'));
}

export async function addStudentToClass(payload) {
  const supabase = ensureSupabase();
  const row = Array.isArray(payload) ? payload[0] : payload;
  return runQuery(
    supabase
      .from('class_students')
      .upsert({
        ...row,
        joined_at: row?.joined_at || new Date().toISOString(),
        member_status: row?.member_status || 'active'
      }, { onConflict: 'class_id,student_id' })
      .select('id, class_id, student_id, joined_at, member_status, joined_by_id, notes')
      .single()
  );
}

export async function removeStudentFromClass(payload) {
  const supabase = ensureSupabase();
  const classId = String(payload?.classId || payload?.class_id || '').trim();
  const studentId = String(payload?.studentId || payload?.student_id || '').trim();
  const notes = String(payload?.notes || '').trim();

  return runQuery(
    supabase
      .from('class_students')
      .update({
        member_status: 'removed',
        notes: notes || '\u79fb\u51fa\u73ed\u7ea7'
      })
      .eq('class_id', classId)
      .eq('student_id', studentId)
      .eq('member_status', 'active')
      .select('id, class_id, student_id, joined_at, member_status, joined_by_id, notes')
      .single()
  );
}

export async function insertPointLedger(rows) {
  const supabase = ensureSupabase();
  return runQuery(
    supabase
      .from('point_ledger')
      .insert(Array.isArray(rows) ? rows : [rows])
      .select('id, student_id, points_delta, created_at, action_type')
  );
}

export async function fetchStudentPointsSummary(studentIds) {
  const supabase = ensureSupabase();
  let query = supabase
    .from('student_points_summary')
    .select('*')
    .neq('status', 'merged')
    .neq('status', INACTIVE_STORAGE_STATUS);
  if (studentIds?.length) {
    query = query.in('student_id', studentIds);
  }
  return mapStudentStatusRows(await runQuery(query));
}

function parseCampusNameFromNotes(notes) {
  const text = String(notes || '');
  const matchWithSuffix = text.match(/([^\s：:，,；;]+?校区)/u);
  if (matchWithSuffix) {
    return getCanonicalCampusName(matchWithSuffix[1]);
  }
  const matchWithoutSuffix = OFFICIAL_CAMPUS_NAMES.find(function (campusName) {
    return text.includes(campusName);
  });
  return matchWithoutSuffix || '';
}

async function fetchCampusNameMapForStudents(studentIds) {
  const supabase = ensureSupabase();
  const uniqueStudentIds = uniqueTruthy(studentIds);
  const campusMap = new Map();

  if (!uniqueStudentIds.length) {
    return campusMap;
  }

  const ledgerBatches = await Promise.all(chunkValues(uniqueStudentIds).map(function (idChunk) {
    return runQuery(
      supabase
        .from('point_ledger')
        .select('student_id, campus_id, created_at, campuses:campus_id ( name )')
        .in('student_id', idChunk)
        .not('campus_id', 'is', null)
        .order('created_at', { ascending: false })
    );
  }));

  ledgerBatches.flat().forEach(function (row) {
    if (!campusMap.has(row.student_id) && row.campuses?.name) {
      const campusName = getCanonicalCampusName(row.campuses.name);
      if (isOfficialCampusName(campusName)) {
        campusMap.set(row.student_id, campusName);
      }
    }
  });

  const missingIds = uniqueStudentIds.filter(function (studentId) {
    return !campusMap.has(studentId);
  });

  if (missingIds.length) {
    const memberBatches = await Promise.all(chunkValues(missingIds).map(function (idChunk) {
      return runQuery(
        supabase
          .from('class_students')
          .select('student_id, class_id, joined_at')
          .eq('member_status', 'active')
          .in('student_id', idChunk)
          .order('joined_at', { ascending: false })
      );
    }));

    const memberLinks = memberBatches.flat();
    const classIds = uniqueTruthy(memberLinks.map(function (row) { return row.class_id; }));

    if (classIds.length) {
      const classBatches = await Promise.all(chunkValues(classIds).map(function (idChunk) {
        return runQuery(
          supabase
            .from('classes')
            .select('id, campuses:campus_id ( name )')
            .in('id', idChunk)
        );
      }));

      const classCampusMap = new Map();
      classBatches.flat().forEach(function (row) {
        const campusName = getCanonicalCampusName(row.campuses?.name || '');
        classCampusMap.set(row.id, isOfficialCampusName(campusName) ? campusName : '');
      });

      memberLinks.forEach(function (row) {
        if (!campusMap.has(row.student_id)) {
          const campusName = classCampusMap.get(row.class_id);
          if (campusName) {
            campusMap.set(row.student_id, campusName);
          }
        }
      });
    }
  }

  const noteFallbackIds = uniqueStudentIds.filter(function (studentId) {
    return !campusMap.has(studentId);
  });

  if (noteFallbackIds.length) {
    const studentBatches = await Promise.all(chunkValues(noteFallbackIds).map(function (idChunk) {
      return runQuery(
        supabase
          .from('students')
          .select('id, notes')
          .in('id', idChunk)
      );
    }));

    studentBatches.flat().forEach(function (row) {
      const campusName = parseCampusNameFromNotes(row.notes);
      if (!campusMap.has(row.id) && campusName) {
        campusMap.set(row.id, campusName);
      }
    });
  }

  return campusMap;
}

export async function fetchLeaderboardSummary() {
  const supabase = ensureSupabase();
  const summary = await runQuery(
    supabase
      .from('student_points_summary')
      .select('*')
      .neq('status', 'merged')
      .neq('status', INACTIVE_STORAGE_STATUS)
      .order('total_points', { ascending: false })
      .order('progress_7d', { ascending: false })
      .order('display_name', { ascending: true })
  );

  const campusMap = await fetchCampusNameMapForStudents(summary.map(function (row) {
    return row.student_id;
  }));

  return mapStudentStatusRows(summary).map(function (row) {
    return {
      ...row,
      campus_name: campusMap.get(row.student_id) || ''
    };
  }).filter(function (row) {
    return Boolean(String(row.campus_name || '').trim());
  });
}

export async function fetchBadgeLeaderboard(studentIds) {
  const supabase = ensureSupabase();
  let query = supabase
    .from('badge_leaderboard')
    .select('*')
    .order('unlocked_count', { ascending: false })
    .order('event_count', { ascending: false })
    .order('latest_unlocked_at', { ascending: false, nullsFirst: false })
    .order('display_name', { ascending: true });

  if (Array.isArray(studentIds) && studentIds.length) {
    query = query.in('student_id', studentIds);
  }

  const rows = mapStudentStatusRows(await runQuery(query)).filter(function (row) {
    return !isExcludedStudentStatus(row.status);
  });
  const campusMap = await fetchCampusNameMapForStudents(rows.map(function (row) {
    return row.student_id;
  }));

  return rows.map(function (row) {
    return {
      ...row,
      campus_name: campusMap.get(row.student_id) || ''
    };
  }).filter(function (row) {
    return Boolean(String(row.campus_name || '').trim());
  });
}
function waitForAdminApi(ms) {
  return new Promise(function (resolve) {
    window.setTimeout(resolve, ms);
  });
}

async function getTeacherAccountsAccessToken(supabase) {
  let lastError = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      lastError = sessionError;
    }

    const accessToken = sessionData?.session?.access_token;
    if (accessToken) {
      return accessToken;
    }

    lastError = lastError || new Error('Admin session is missing. Please sign in again.');
    if (attempt < 2) {
      await waitForAdminApi(400 * (attempt + 1));
    }
  }

  throw lastError || new Error('Admin session is missing. Please sign in again.');
}

async function requestTeacherAccountsApi(method, payload) {
  const supabase = ensureSupabase();
  let lastError = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const accessToken = await getTeacherAccountsAccessToken(supabase);
    const response = await fetch('/api/admin/teacher-accounts', {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      body: payload ? JSON.stringify(payload) : undefined
    });

    const responseText = await response.text();
    let result = {};
    try {
      result = responseText ? JSON.parse(responseText) : {};
    } catch (_error) {
      result = {};
    }

    if (response.ok) {
      return result;
    }

    const fallbackMessage = response.status === 404
      ? '线上缺少 /api/admin/teacher-accounts 接口，请确认当前 Vercel 项目已包含 api/admin/teacher-accounts.js 并完成重新部署。'
      : response.status >= 500 && /SUPABASE_(URL|ANON_KEY|SERVICE_ROLE_KEY)|缺少服务端 Supabase 环境变量/i.test(responseText)
        ? 'Vercel 服务端环境变量不完整，请补齐 SUPABASE_URL、SUPABASE_ANON_KEY、SUPABASE_SERVICE_ROLE_KEY。'
        : `Teacher account API request failed (HTTP ${response.status}).`;
    lastError = new Error(result.error || fallbackMessage);
    if (response.status !== 401 || attempt === 2) {
      throw lastError;
    }

    await waitForAdminApi(500 * (attempt + 1));
  }

  throw lastError || new Error('Teacher account API request failed.');
}

export async function fetchTeacherAccountDirectory() {
  const result = await requestTeacherAccountsApi('GET');
  return result.accounts || [];
}

export async function saveTeacherAccount(payload) {
  const result = await requestTeacherAccountsApi('POST', {
    action: 'createOrUpdate',
    ...payload
  });
  return result.result;
}

export async function resetTeacherAccountPassword(payload) {
  const result = await requestTeacherAccountsApi('POST', {
    action: 'resetPassword',
    ...payload
  });
  return result.result;
}





