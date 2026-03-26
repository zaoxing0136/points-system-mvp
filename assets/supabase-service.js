import { ensureSupabase } from './supabase-client.js';

const ACTIVE_POINT_RULE_FIELDS = 'id, category, rule_name, points, sort_order, is_active, is_common, created_at';
const ADMIN_POINT_RULE_FIELDS = 'id, category, rule_name, points, sort_order, is_active, is_common, created_at';
const LEVEL_TIER_FIELDS = 'id, level_no, level_name, threshold, is_active, created_at, updated_at';
const BADGE_DEFINITION_FIELDS = 'id, code, name, description, event_label, icon_token, threshold, is_active, sort_order, created_at, updated_at';
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
  return runQuery(
    supabase.from('campuses').select('id, name, code, status, created_at').eq('status', 'active').order('name')
  );
}

export async function fetchSubjects() {
  const supabase = ensureSupabase();
  return runQuery(
    supabase.from('subjects').select('id, name, code, status, created_at').eq('status', 'active').order('name')
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

  return runQuery(query);
}

export async function fetchClassesDirectory() {
  const supabase = ensureSupabase();
  return runQuery(
    supabase
      .from('classes')
      .select(CLASS_SELECT_FIELDS)
      .order('created_at', { ascending: false })
  );
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
  return runQuery(
    supabase
      .from('point_rules')
      .select(ACTIVE_POINT_RULE_FIELDS)
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('is_common', { ascending: false })
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
  );
}

export async function fetchAdminPointRules() {
  const supabase = ensureSupabase();
  return runQuery(
    supabase
      .from('point_rules')
      .select(ADMIN_POINT_RULE_FIELDS)
      .order('category', { ascending: true })
      .order('is_common', { ascending: false })
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
  );
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

  return runQuery(query, '读取徽章规则失败');
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
  const status = String(options.status || '').trim();
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

  return runQuery(query);
}

export async function createStudents(rows) {
  const supabase = ensureSupabase();
  const payload = Array.isArray(rows) ? rows : [rows];
  return runQuery(
    supabase
      .from('students')
      .insert(payload)
      .select(STUDENT_FIELDS)
  );
}

export async function updateStudent(studentId, payload) {
  const supabase = ensureSupabase();
  return runQuery(
    supabase
      .from('students')
      .update(payload)
      .eq('id', studentId)
      .select(STUDENT_FIELDS)
      .single()
  );
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

  return mergeRowsById(resultSets.flat());
}

export async function fetchClassRoster(classId) {
  const supabase = ensureSupabase();
  return runQuery(
    supabase
      .from('class_student_roster')
      .select('*')
      .eq('class_id', classId)
      .eq('member_status', 'active')
      .order('joined_at', { ascending: true })
  );
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

  return runQuery(query, '读取学生徽章进度失败');
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
  return runQuery(
    supabase
      .from('classes')
      .insert(payload)
      .select(CLASS_SELECT_FIELDS)
      .single()
  );
}

export async function searchStudents(keyword) {
  const supabase = ensureSupabase();
  const trimmed = keyword.trim();
  let query = supabase
    .from('students')
    .select('id, student_code, legal_name, display_name, grade, parent_name, parent_phone, status, created_at')
    .neq('status', 'merged')
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

  return runQuery(query, '读取徽章榜失败');
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
  let query = supabase.from('student_points_summary').select('*').neq('status', 'merged');
  if (studentIds?.length) {
    query = query.in('student_id', studentIds);
  }
  return runQuery(query);
}

function parseCampusNameFromNotes(notes) {
  const match = String(notes || '').match(/([^\s：:，,；;]+?校区)/u);
  return match ? match[1] : '';
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
      campusMap.set(row.student_id, row.campuses.name);
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
        classCampusMap.set(row.id, row.campuses?.name || '');
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
      .order('total_points', { ascending: false })
      .order('progress_7d', { ascending: false })
      .order('display_name', { ascending: true })
  );

  const campusMap = await fetchCampusNameMapForStudents(summary.map(function (row) {
    return row.student_id;
  }));

  return summary.map(function (row) {
    return {
      ...row,
      campus_name: campusMap.get(row.student_id) || ''
    };
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

  const rows = await runQuery(query);
  const campusMap = await fetchCampusNameMapForStudents(rows.map(function (row) {
    return row.student_id;
  }));

  return rows.map(function (row) {
    return {
      ...row,
      campus_name: campusMap.get(row.student_id) || ''
    };
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





