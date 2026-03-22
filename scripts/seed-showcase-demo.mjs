import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';
import { AVATAR_LIBRARY } from '../assets/avatar-library.js';

const cwd = process.cwd();
const ENV_FILES = ['.env.local', '.env'];
const SUBJECT_IDS = {
  lego: '31111111-1111-1111-1111-111111111111',
  english: '32222222-2222-2222-2222-222222222222',
  ai: '33333333-3333-3333-3333-333333333333',
  chinese: '34444444-4444-4444-4444-444444444444',
  logic: '35555555-5555-5555-5555-555555555555',
  art: '36666666-6666-6666-6666-666666666666',
  reading: '37777777-7777-7777-7777-777777777777'
};

const SUBJECTS = [
  { id: SUBJECT_IDS.lego, name: '乐高编程', code: 'LEGO_CODING' },
  { id: SUBJECT_IDS.english, name: '英语口才', code: 'ENGLISH_SPEAKING' },
  { id: SUBJECT_IDS.ai, name: 'AI伴学', code: 'AI_LEARNING' },
  { id: SUBJECT_IDS.chinese, name: '大语文', code: 'CHINESE_LANGUAGE' },
  { id: SUBJECT_IDS.logic, name: '逻辑思维', code: 'LOGICAL_THINKING' },
  { id: SUBJECT_IDS.art, name: '美术', code: 'ART_STUDIO' },
  { id: SUBJECT_IDS.reading, name: '阅读', code: 'READING' }
];

const RULES = {
  classroomSpeak: { id: '81111111-1111-1111-1111-111111111111', name: '积极发言', category: 'classroom', points: 2 },
  classroomFocus: { id: '82222222-2222-2222-2222-222222222222', name: '专注听讲', category: 'classroom', points: 1 },
  homeworkSubmit: { id: '83333333-3333-3333-3333-333333333333', name: '按时提交', category: 'homework', points: 1 },
  homeworkPerfect: { id: '84444444-4444-4444-4444-444444444444', name: '作业优秀', category: 'homework', points: 3 },
  projectCreative: { id: '85555555-5555-5555-5555-555555555555', name: '创意表达', category: 'project', points: 2 },
  projectExcellent: { id: '86666666-6666-6666-6666-666666666666', name: '作品之星', category: 'project', points: 5 },
  habitsPunctual: { id: '87777777-7777-7777-7777-777777777777', name: '准时到课', category: 'habits', points: 1 },
  habitsHelpful: { id: '88888888-8888-8888-8888-888888888888', name: '自律榜样', category: 'habits', points: 3 }
};

const CAMPUSES = [
  { id: 'a1111111-1111-1111-1111-111111111111', name: '橙湾校区', code: 'ORANGE_BAY' },
  { id: 'a2222222-2222-2222-2222-222222222222', name: '星河校区', code: 'STAR_RIVER' },
  { id: 'a3333333-3333-3333-3333-333333333333', name: '海棠校区', code: 'BEGONIA' },
  { id: 'a4444444-4444-4444-4444-444444444444', name: '三墩校区', code: 'SANDUN' },
  { id: 'a5555555-5555-5555-5555-555555555555', name: '东新校区', code: 'DONGXIN' },
  { id: 'a6666666-6666-6666-6666-666666666666', name: '江湾校区', code: 'JIANGWAN' }
];

const TEACHERS = [
  { id: 'b1111111-1111-1111-1111-111111111111', name: '陈老师', display_name: '陈老师', phone: '13880010001', campus_id: CAMPUSES[0].id },
  { id: 'b2222222-2222-2222-2222-222222222222', name: '许老师', display_name: '许老师', phone: '13880010002', campus_id: CAMPUSES[1].id },
  { id: 'b3333333-3333-3333-3333-333333333333', name: '沈老师', display_name: '沈老师', phone: '13880010003', campus_id: CAMPUSES[2].id },
  { id: 'b4444444-4444-4444-4444-444444444444', name: '郑老师', display_name: '郑老师', phone: '13880010004', campus_id: CAMPUSES[3].id },
  { id: 'b5555555-5555-5555-5555-555555555555', name: '周老师', display_name: '周老师', phone: '13880010005', campus_id: CAMPUSES[4].id },
  { id: 'b6666666-6666-6666-6666-666666666666', name: '吴老师', display_name: '吴老师', phone: '13880010006', campus_id: CAMPUSES[5].id }
];

const CLASSES = [
  { id: 'd1111111-1111-1111-1111-111111111111', class_name: '橙湾乐高创想班', campus_id: CAMPUSES[0].id, subject_id: SUBJECT_IDS.lego, teacher_id: TEACHERS[0].id, schedule_text: '周二 18:30-20:00', class_type: 'regular' },
  { id: 'd1222222-2222-2222-2222-222222222222', class_name: '橙湾英语口才班', campus_id: CAMPUSES[0].id, subject_id: SUBJECT_IDS.english, teacher_id: TEACHERS[0].id, schedule_text: '周六 09:30-11:00', class_type: 'regular' },
  { id: 'd2111111-1111-1111-1111-111111111111', class_name: '星河AI伴学班', campus_id: CAMPUSES[1].id, subject_id: SUBJECT_IDS.ai, teacher_id: TEACHERS[1].id, schedule_text: '周四 19:00-20:30', class_type: 'regular' },
  { id: 'd2222222-2222-2222-2222-222222222222', class_name: '星河大语文班', campus_id: CAMPUSES[1].id, subject_id: SUBJECT_IDS.chinese, teacher_id: TEACHERS[1].id, schedule_text: '周日 10:00-11:30', class_type: 'regular' },
  { id: 'd3111111-1111-1111-1111-111111111111', class_name: '海棠逻辑思维班', campus_id: CAMPUSES[2].id, subject_id: SUBJECT_IDS.logic, teacher_id: TEACHERS[2].id, schedule_text: '周二 18:30-20:00', class_type: 'regular' },
  { id: 'd3222222-2222-2222-2222-222222222222', class_name: '海棠美术创作班', campus_id: CAMPUSES[2].id, subject_id: SUBJECT_IDS.art, teacher_id: TEACHERS[2].id, schedule_text: '周六 14:00-15:30', class_type: 'intensive' },
  { id: 'd4111111-1111-1111-1111-111111111111', class_name: '三墩阅读表达班', campus_id: CAMPUSES[3].id, subject_id: SUBJECT_IDS.reading, teacher_id: TEACHERS[0].id, schedule_text: '周三 18:20-19:50', class_type: 'regular' },
  { id: 'd4222222-2222-2222-2222-222222222222', class_name: '三墩乐高进阶班', campus_id: CAMPUSES[3].id, subject_id: SUBJECT_IDS.lego, teacher_id: TEACHERS[3].id, schedule_text: '周六 13:30-15:00', class_type: 'intensive' },
  { id: 'd5111111-1111-1111-1111-111111111111', class_name: '东新英语口才班', campus_id: CAMPUSES[4].id, subject_id: SUBJECT_IDS.english, teacher_id: TEACHERS[0].id, schedule_text: '周五 18:40-20:10', class_type: 'regular' },
  { id: 'd5222222-2222-2222-2222-222222222222', class_name: '东新逻辑思维班', campus_id: CAMPUSES[4].id, subject_id: SUBJECT_IDS.logic, teacher_id: TEACHERS[4].id, schedule_text: '周日 09:40-11:10', class_type: 'regular' },
  { id: 'd6111111-1111-1111-1111-111111111111', class_name: '江湾大语文班', campus_id: CAMPUSES[5].id, subject_id: SUBJECT_IDS.chinese, teacher_id: TEACHERS[5].id, schedule_text: '周三 18:10-19:40', class_type: 'regular' },
  { id: 'd6222222-2222-2222-2222-222222222222', class_name: '江湾美术启发班', campus_id: CAMPUSES[5].id, subject_id: SUBJECT_IDS.art, teacher_id: TEACHERS[5].id, schedule_text: '周六 15:40-17:10', class_type: 'intensive' }
];

const BASE_STUDENTS = [
  { id: 'c0000001-1111-1111-1111-111111111111', code: 'DMO-0001', legal_name: '林星禾', display_name: '小禾', gender: 'female', grade: '三年级', birth_year: 2017, parent_name: '林妈妈', parent_phone: '13790000001', status: 'normal', campus_id: CAMPUSES[0].id },
  { id: 'c0000002-2222-2222-2222-222222222222', code: 'DMO-0002', legal_name: '许沐阳', display_name: '沐阳', gender: 'male', grade: '四年级', birth_year: 2016, parent_name: '许爸爸', parent_phone: '13790000002', status: 'normal', campus_id: CAMPUSES[0].id },
  { id: 'c0000003-3333-3333-3333-333333333333', code: 'DMO-0003', legal_name: '顾安然', display_name: '安安', gender: 'female', grade: '二年级', birth_year: 2018, parent_name: '顾妈妈', parent_phone: '13790000003', status: 'normal', campus_id: CAMPUSES[0].id },
  { id: 'c0000004-4444-4444-4444-444444444444', code: 'DMO-0004', legal_name: '周书言', display_name: '言言', gender: 'male', grade: '五年级', birth_year: 2015, parent_name: '周爸爸', parent_phone: '13790000004', status: 'normal', campus_id: CAMPUSES[0].id },
  { id: 'c0000005-5555-5555-5555-555555555555', code: 'DMO-0005', legal_name: '苏可心', display_name: '可可', gender: 'female', grade: '一年级', birth_year: 2019, parent_name: '苏妈妈', parent_phone: '13790000005', status: 'normal', campus_id: CAMPUSES[0].id },
  { id: 'c0000006-6666-6666-6666-666666666666', code: 'DMO-0006', legal_name: '唐以宁', display_name: '宁宁', gender: 'female', grade: '三年级', birth_year: 2017, parent_name: '唐妈妈', parent_phone: '13790000006', status: 'normal', campus_id: CAMPUSES[0].id },
  { id: 'c0000007-7777-7777-7777-777777777777', code: 'DMO-0007', legal_name: '江子辰', display_name: '子辰', gender: 'male', grade: '四年级', birth_year: 2016, parent_name: '江爸爸', parent_phone: '13790000007', status: 'normal', campus_id: CAMPUSES[0].id },
  { id: 'c0000008-8888-8888-8888-888888888888', code: 'DMO-0008', legal_name: '陆知夏', display_name: '夏夏', gender: 'female', grade: '二年级', birth_year: 2018, parent_name: '陆妈妈', parent_phone: '13790000008', status: 'normal', campus_id: CAMPUSES[1].id },
  { id: 'c0000009-9999-9999-9999-999999999999', code: 'DMO-0009', legal_name: '梁宥恩', display_name: '恩恩', gender: 'female', grade: '三年级', birth_year: 2017, parent_name: '梁妈妈', parent_phone: '13790000009', status: 'normal', campus_id: CAMPUSES[1].id },
  { id: 'c0000010-1010-1010-1010-101010101010', code: 'DMO-0010', legal_name: '韩若彤', display_name: '彤彤', gender: 'female', grade: '五年级', birth_year: 2015, parent_name: '韩妈妈', parent_phone: '13790000010', status: 'normal', campus_id: CAMPUSES[1].id },
  { id: 'c0000011-1111-1111-1111-111111111110', code: 'DMO-0011', legal_name: '高承泽', display_name: '承泽', gender: 'male', grade: '四年级', birth_year: 2016, parent_name: '高爸爸', parent_phone: '13790000011', status: 'normal', campus_id: CAMPUSES[1].id },
  { id: 'c0000012-1212-1212-1212-121212121212', code: 'DMO-0012', legal_name: '宋雨桐', display_name: '雨桐', gender: 'female', grade: '二年级', birth_year: 2018, parent_name: '宋妈妈', parent_phone: '13790000012', status: 'normal', campus_id: CAMPUSES[1].id },
  { id: 'c0000013-1313-1313-1313-131313131313', code: 'DMO-0013', legal_name: '郭景行', display_name: '景行', gender: 'male', grade: '三年级', birth_year: 2017, parent_name: '郭爸爸', parent_phone: '13790000013', status: 'normal', campus_id: CAMPUSES[1].id },
  { id: 'c0000014-1414-1414-1414-141414141414', code: 'DMO-0014', legal_name: '沈语希', display_name: '语希', gender: 'female', grade: '一年级', birth_year: 2019, parent_name: '沈妈妈', parent_phone: '13790000014', status: 'normal', campus_id: CAMPUSES[1].id },
  { id: 'c0000015-1515-1515-1515-151515151515', code: 'DMO-0015', legal_name: '程知乐', display_name: '知乐', gender: 'male', grade: '三年级', birth_year: 2017, parent_name: '程爸爸', parent_phone: '13790000015', status: 'normal', campus_id: CAMPUSES[2].id },
  { id: 'c0000016-1616-1616-1616-161616161616', code: 'DMO-0016', legal_name: '叶初晴', display_name: '初晴', gender: 'female', grade: '四年级', birth_year: 2016, parent_name: '叶妈妈', parent_phone: '13790000016', status: 'normal', campus_id: CAMPUSES[2].id },
  { id: 'c0000017-1717-1717-1717-171717171717', code: 'DMO-0017', legal_name: '罗奕晨', display_name: '奕晨', gender: 'male', grade: '二年级', birth_year: 2018, parent_name: '罗妈妈', parent_phone: '13790000017', status: 'normal', campus_id: CAMPUSES[2].id },
  { id: 'c0000018-1818-1818-1818-181818181818', code: 'DMO-0018', legal_name: '方雨萌', display_name: '萌萌', gender: 'female', grade: '五年级', birth_year: 2015, parent_name: '方妈妈', parent_phone: '13790000018', status: 'normal', campus_id: CAMPUSES[2].id },
  { id: 'c0000019-1919-1919-1919-191919191919', code: 'DMO-0019', legal_name: '裴子墨', display_name: '子墨', gender: 'male', grade: '三年级', birth_year: 2017, parent_name: '裴爸爸', parent_phone: '13790000019', status: 'normal', campus_id: CAMPUSES[2].id },
  { id: 'c0000020-2020-2020-2020-202020202020', code: 'DMO-0020', legal_name: '何心怡', display_name: '心怡', gender: 'female', grade: '一年级', birth_year: 2019, parent_name: '何妈妈', parent_phone: '13790000020', status: 'temporary', campus_id: CAMPUSES[2].id }
];

const SURNAMES = ['王', '李', '张', '刘', '陈', '杨', '黄', '赵', '吴', '周', '徐', '孙', '胡', '朱', '高', '林', '何', '郭', '马', '罗', '梁', '宋', '郑', '谢', '韩', '唐', '冯', '董', '萧', '曹'];
const GIVEN_NAMES = ['星辰', '嘉禾', '沐言', '可乐', '知远', '安宁', '雨萌', '景行', '一诺', '思源', '语桐', '晨曦', '乐然', '子悠', '初夏', '米朵', '奕安', '欣彤', '宥宁', '若溪', '宸宇', '书瑶', '逸凡', '念禾', '清妍', '以晴', '星语', '乐童', '知夏', '梓萌'];
const DISPLAY_PREFIXES = ['小', '米', '乐', '知', '星', '果', '豆', '夏', '安', '可', '桃', '禾', '萌', '言', '景', '雨', '童', '朵', '宁', '初'];
const DISPLAY_SUFFIXES = ['禾', '可', '言', '安', '乐', '辰', '果', '宁', '夏', '米', '航', '景', '悦', '童', '川', '溪', '阳', '月', '朵', '桐'];
const GRADE_OPTIONS = ['中班', '大班', '一年级', '二年级', '三年级', '四年级', '五年级', '六年级'];
const GRADE_BIRTH_YEAR = {
  中班: 2021,
  大班: 2020,
  一年级: 2019,
  二年级: 2018,
  三年级: 2017,
  四年级: 2016,
  五年级: 2015,
  六年级: 2014
};

function loadEnvFiles() {
  ENV_FILES.forEach(function (filename) {
    const filepath = path.join(cwd, filename);
    if (!fs.existsSync(filepath)) {
      return;
    }

    const content = fs.readFileSync(filepath, 'utf8');
    content.split(/\r?\n/).forEach(function (line) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        return;
      }
      const separatorIndex = trimmed.indexOf('=');
      if (separatorIndex === -1) {
        return;
      }
      const key = trimmed.slice(0, separatorIndex).trim();
      let value = trimmed.slice(separatorIndex + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = value;
      }
    });
  });
}

function makeUuid(namespace, index) {
  const prefix = Number(namespace).toString(16).padStart(4, '0');
  const suffix = Number(index).toString(16).padStart(28, '0');
  const raw = `${prefix}${suffix}`.slice(-32);
  return `${raw.slice(0, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}-${raw.slice(16, 20)}-${raw.slice(20)}`;
}

function padStudentCode(index) {
  return `DMO-${String(index).padStart(4, '0')}`;
}

function daysAgo(days, hours = 9) {
  const now = new Date();
  const date = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  date.setUTCHours(hours, 0, 0, 0);
  return date.toISOString();
}

function hoursAgo(hours) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function pick(list, index, offset = 0) {
  return list[(index + offset) % list.length];
}

function buildGeneratedStudent(offsetIndex) {
  const sequence = BASE_STUDENTS.length + offsetIndex + 1;
  const campus = CAMPUSES[(sequence - 1) % CAMPUSES.length];
  const grade = pick(GRADE_OPTIONS, sequence, 2);
  const gender = sequence % 2 === 0 ? 'female' : 'male';
  const legalName = `${pick(SURNAMES, sequence)}${pick(GIVEN_NAMES, sequence)}${pick(['', '', '然', '宁', '希', '宸', '悦', '桐'], sequence)}`;
  const displayName = `${pick(DISPLAY_PREFIXES, sequence)}${pick(DISPLAY_SUFFIXES, sequence, 3)}`;
  const parentName = `${pick(SURNAMES, sequence)}${sequence % 3 === 0 ? '爸爸' : '妈妈'}`;
  const status = sequence % 41 === 0 ? 'temporary' : 'normal';

  return {
    id: makeUuid(0xc001, sequence),
    code: padStudentCode(sequence),
    legal_name: legalName,
    display_name: displayName,
    gender,
    grade,
    birth_year: GRADE_BIRTH_YEAR[grade],
    parent_name: parentName,
    parent_phone: `139700${String(sequence).padStart(5, '0')}`,
    status,
    campus_id: campus.id
  };
}

function assignAvatar(entries, index, salt = 0) {
  return entries[(index + salt) % entries.length].image_path;
}

function buildAGroupStudents() {
  const targetCampuses = [CAMPUSES[0], CAMPUSES[3], CAMPUSES[4]];
  const boyProfiles = [
    ['???', '??'],
    ['???', '??'],
    ['???', '??'],
    ['???', '??'],
    ['???', '??'],
    ['???', '??'],
    ['???', '??'],
    ['???', '??'],
    ['???', '??'],
    ['???', '??']
  ];
  const girlProfiles = [
    ['???', '??'],
    ['???', '??'],
    ['???', '??'],
    ['???', '??'],
    ['???', '??'],
    ['???', '??'],
    ['???', '??'],
    ['???', '??'],
    ['???', '??'],
    ['???', '??']
  ];

  const buildRow = function (profile, index, gender, avatarEntries, namespace) {
    const campus = targetCampuses[index % targetCampuses.length];
    const grade = index % 2 === 0 ? '??' : '??';
    const targetPoints = 30 + ((index * 3 + (gender === 'female' ? 5 : 0)) % 21);
    return {
      id: makeUuid(namespace, index + 1),
      code: `DMO-A${gender === 'male' ? 'B' : 'G'}${String(index + 1).padStart(3, '0')}`,
      legal_name: profile[0],
      display_name: profile[1],
      gender,
      grade,
      birth_year: GRADE_BIRTH_YEAR[grade],
      parent_name: `${profile[0].slice(0, 1)}${gender === 'male' ? '??' : '??'}`,
      parent_phone: `136800${String(namespace + index + 1).padStart(5, '0')}`,
      status: 'normal',
      campus_id: campus.id,
      avatar_url: assignAvatar(avatarEntries, index, namespace % 7),
      target_points: targetPoints,
      notes: `?????${campus.name} A?????`
    };
  };

  return boyProfiles.map(function (profile, index) {
    return buildRow(profile, index, 'male', AVATAR_LIBRARY.A.boy, 0xca01);
  }).concat(girlProfiles.map(function (profile, index) {
    return buildRow(profile, index, 'female', AVATAR_LIBRARY.A.girl, 0xca02);
  }));
}

const A_GROUP_STUDENTS = buildAGroupStudents();

const STUDENTS = BASE_STUDENTS.concat(Array.from({ length: 100 }, function (_, index) {
  return buildGeneratedStudent(index);
}), A_GROUP_STUDENTS).map(function (student) {
  return {
    ...student,
    notes: student.status === 'temporary'
      ? `演示数据：${CAMPUSES.find(function (campus) { return campus.id === student.campus_id; }).name}试听临时学生`
      : `演示数据：${CAMPUSES.find(function (campus) { return campus.id === student.campus_id; }).name}`
  };
});

const CAMPUS_CLASS_MAP = CAMPUSES.reduce(function (map, campus) {
  map.set(campus.id, CLASSES.filter(function (classItem) {
    return classItem.campus_id === campus.id;
  }));
  return map;
}, new Map());

function buildClassMembers() {
  const rows = [];
  let rowIndex = 1;

  STUDENTS.forEach(function (student, index) {
    const campusClasses = CAMPUS_CLASS_MAP.get(student.campus_id) || [];
    const primaryClass = campusClasses[index % campusClasses.length];
    if (!primaryClass) {
      return;
    }

    rows.push({
      id: makeUuid(0xe001, rowIndex++),
      class_id: primaryClass.id,
      student_id: student.id,
      joined_days_ago: 35 - (index % 18)
    });

    if (campusClasses.length > 1 && index % 5 === 0) {
      const secondaryClass = campusClasses[(index + 1) % campusClasses.length];
      if (secondaryClass.id !== primaryClass.id) {
        rows.push({
          id: makeUuid(0xe001, rowIndex++),
          class_id: secondaryClass.id,
          student_id: student.id,
          joined_days_ago: 14 + (index % 10)
        });
      }
    }
  });

  return rows;
}

const CLASS_MEMBERS = buildClassMembers();

function buildDemoLedgers() {
  const classMap = new Map(CLASSES.map(function (item) {
    return [item.id, item];
  }));

  const memberMap = new Map();
  CLASS_MEMBERS.forEach(function (member) {
    if (!memberMap.has(member.student_id)) {
      memberMap.set(member.student_id, []);
    }
    memberMap.get(member.student_id).push(member.class_id);
  });

  const ruleCycle = [
    RULES.classroomSpeak,
    RULES.classroomFocus,
    RULES.homeworkPerfect,
    RULES.homeworkSubmit,
    RULES.projectCreative,
    RULES.projectExcellent,
    RULES.habitsPunctual,
    RULES.habitsHelpful
  ];

  const ledgers = [];
  let ledgerIndex = 1;

  STUDENTS.forEach(function (student, index) {
    const classIds = memberMap.get(student.id) || [];
    const primaryClass = classMap.get(classIds[0]);
    if (!primaryClass) {
      return;
    }

    if (Number(student.target_points || 0) > 0) {
      let remaining = Number(student.target_points || 0);
      let slot = 0;
      const targetRules = [
        RULES.projectExcellent,
        RULES.habitsHelpful,
        RULES.classroomSpeak,
        RULES.classroomFocus
      ];

      while (remaining > 0) {
        const rule = targetRules.find(function (candidate) {
          return candidate.points <= remaining;
        }) || RULES.classroomFocus;
        ledgers.push({
          id: makeUuid(0xf101, ledgerIndex++),
          student_id: student.id,
          class_id: primaryClass.id,
          campus_id: primaryClass.campus_id,
          subject_id: primaryClass.subject_id,
          teacher_id: primaryClass.teacher_id,
          rule_id: rule.id,
          rule_name_snapshot: rule.name,
          category_snapshot: rule.category,
          points_delta: rule.points,
          action_type: 'add',
          remark: '?????A???????',
          created_at: daysAgo(6 - (slot % 5), 9 + (slot % 4) * 2)
        });
        remaining -= rule.points;
        slot += 1;
      }

      return;
    }

    const baseCount = 4 + (index % 2);
    const baseDays = [18 + (index % 5), 11 + (index % 4), 6 + (index % 3), 3 + (index % 2), 1 + (index % 2)];

    for (let entryIndex = 0; entryIndex < baseCount; entryIndex += 1) {
      const rule = ruleCycle[(index + entryIndex * 2) % ruleCycle.length];
      ledgers.push({
        id: makeUuid(0xf001, ledgerIndex++),
        student_id: student.id,
        class_id: primaryClass.id,
        campus_id: primaryClass.campus_id,
        subject_id: primaryClass.subject_id,
        teacher_id: primaryClass.teacher_id,
        rule_id: rule.id,
        rule_name_snapshot: rule.name,
        category_snapshot: rule.category,
        points_delta: rule.points,
        action_type: 'add',
        remark: '演示数据：课堂积分记录',
        created_at: daysAgo(baseDays[entryIndex], 10 + entryIndex * 2)
      });
    }

    if (classIds[1]) {
      const secondClass = classMap.get(classIds[1]);
      const crossRule = ruleCycle[(index + 5) % ruleCycle.length];
      ledgers.push({
        id: makeUuid(0xf001, ledgerIndex++),
        student_id: student.id,
        class_id: secondClass.id,
        campus_id: secondClass.campus_id,
        subject_id: secondClass.subject_id,
        teacher_id: secondClass.teacher_id,
        rule_id: crossRule.id,
        rule_name_snapshot: crossRule.name,
        category_snapshot: crossRule.category,
        points_delta: crossRule.points,
        action_type: 'add',
        remark: '演示数据：跨班亮点记录',
        created_at: daysAgo(2 + (index % 3), 18)
      });
    }

    if (index < 24) {
      const highlightRule = RULES.projectExcellent;
      ledgers.push({
        id: makeUuid(0xf001, ledgerIndex++),
        student_id: student.id,
        class_id: primaryClass.id,
        campus_id: primaryClass.campus_id,
        subject_id: primaryClass.subject_id,
        teacher_id: primaryClass.teacher_id,
        rule_id: highlightRule.id,
        rule_name_snapshot: highlightRule.name,
        category_snapshot: highlightRule.category,
        points_delta: highlightRule.points,
        action_type: 'add',
        remark: '演示数据：本周冲刺加分',
        created_at: hoursAgo(36 + index)
      });
    }
  });

  return ledgers;
}

async function upsertRows(supabase, table, rows, conflict) {
  const query = supabase.from(table).upsert(rows, conflict ? { onConflict: conflict } : undefined);
  const { error } = await query;
  if (error) {
    throw error;
  }
}

async function cleanupTrialArtifacts(supabase) {
  const { data: autoClasses, error: autoClassError } = await supabase
    .from('classes')
    .select('id')
    .or('class_name.ilike.自动点测班-%,class_name.ilike.Codex点测班-%');
  if (autoClassError) {
    throw autoClassError;
  }

  const autoClassIds = (autoClasses || []).map(function (row) { return row.id; });
  if (autoClassIds.length) {
    const { error: deleteAutoLedgerError } = await supabase.from('point_ledger').delete().in('class_id', autoClassIds);
    if (deleteAutoLedgerError) throw deleteAutoLedgerError;
    const { error: deleteAutoMembersError } = await supabase.from('class_students').delete().in('class_id', autoClassIds);
    if (deleteAutoMembersError) throw deleteAutoMembersError;
    const { error: deleteAutoClassesError } = await supabase.from('classes').delete().in('id', autoClassIds);
    if (deleteAutoClassesError) throw deleteAutoClassesError;
  }

  const { data: tempStudents, error: tempStudentError } = await supabase
    .from('students')
    .select('id')
    .or('display_name.ilike.%点测%,legal_name.ilike.%点测%,notes.ilike.%点测%,notes.ilike.%Codex点测%');
  if (tempStudentError) {
    throw tempStudentError;
  }

  const tempStudentIds = (tempStudents || []).map(function (row) { return row.id; });
  if (tempStudentIds.length) {
    const { error: deleteTempLedgerError } = await supabase.from('point_ledger').delete().in('student_id', tempStudentIds);
    if (deleteTempLedgerError) throw deleteTempLedgerError;
    const { error: deleteTempMembersError } = await supabase.from('class_students').delete().in('student_id', tempStudentIds);
    if (deleteTempMembersError) throw deleteTempMembersError;
    const { error: deleteTempStudentsError } = await supabase.from('students').delete().in('id', tempStudentIds);
    if (deleteTempStudentsError) throw deleteTempStudentsError;
  }
}

async function main() {
  loadEnvFiles();
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('缺少 SUPABASE_URL 或可用的 Supabase Key。');
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const studentRows = STUDENTS.map(function (student) {
    return {
      id: student.id,
      student_code: student.code,
      legal_name: student.legal_name,
      display_name: student.display_name,
      gender: student.gender,
      grade: student.grade,
      birth_year: student.birth_year,
      parent_name: student.parent_name,
      parent_phone: student.parent_phone,
      avatar_url: student.avatar_url || null,
      status: student.status,
      created_by_role: 'admin',
      created_by_id: null,
      notes: student.notes
    };
  });

  const teacherRows = TEACHERS.map(function (teacher) {
    return {
      id: teacher.id,
      name: teacher.name,
      display_name: teacher.display_name,
      phone: teacher.phone,
      role: 'teacher',
      campus_id: teacher.campus_id,
      status: 'active'
    };
  });

  const classRows = CLASSES.map(function (classItem) {
    return {
      id: classItem.id,
      class_name: classItem.class_name,
      campus_id: classItem.campus_id,
      subject_id: classItem.subject_id,
      teacher_id: classItem.teacher_id,
      schedule_text: classItem.schedule_text,
      class_type: classItem.class_type,
      status: 'active',
      created_by_id: classItem.teacher_id
    };
  });

  const classStudentRows = CLASS_MEMBERS.map(function (member) {
    const classItem = CLASSES.find(function (item) { return item.id === member.class_id; });
    return {
      id: member.id,
      class_id: member.class_id,
      student_id: member.student_id,
      joined_at: daysAgo(member.joined_days_ago, 8),
      member_status: 'active',
      joined_by_id: classItem.teacher_id,
      notes: '演示数据：班级成员关系'
    };
  });

  const ledgers = buildDemoLedgers();

  const { error: deleteLedgerError } = await supabase
    .from('point_ledger')
    .delete()
    .in('student_id', STUDENTS.map(function (student) { return student.id; }))
    .ilike('remark', '演示数据：%');
  if (deleteLedgerError) {
    throw deleteLedgerError;
  }

  await cleanupTrialArtifacts(supabase);

  await upsertRows(supabase, 'campuses', CAMPUSES.map(function (campus) {
    return { id: campus.id, name: campus.name, code: campus.code, status: 'active' };
  }), 'id');
  await upsertRows(supabase, 'subjects', SUBJECTS.map(function (subject) {
    return { id: subject.id, name: subject.name, code: subject.code, status: 'active' };
  }), 'id');
  await upsertRows(supabase, 'teachers', teacherRows, 'id');
  await upsertRows(supabase, 'students', studentRows, 'id');
  await upsertRows(supabase, 'classes', classRows, 'id');
  await upsertRows(supabase, 'class_students', classStudentRows, 'class_id,student_id');
  await upsertRows(supabase, 'point_ledger', ledgers, 'id');

  const { data: campusData, error: campusError } = await supabase
    .from('campuses')
    .select('id, name')
    .in('id', CAMPUSES.map(function (item) { return item.id; }));
  if (campusError) {
    throw campusError;
  }

  const { data: studentSummary, error: studentError } = await supabase
    .from('student_points_summary')
    .select('student_id, display_name, total_points, progress_7d')
    .in('student_id', STUDENTS.map(function (item) { return item.id; }))
    .order('total_points', { ascending: false });
  if (studentError) {
    throw studentError;
  }

  console.log('演示数据写入完成：');
  console.log(`- 校区：${campusData.length} 个`);
  console.log(`- 老师：${teacherRows.length} 位`);
  console.log(`- 学生：${studentRows.length} 位`);
  console.log(`- 班级：${classRows.length} 个`);
  console.log(`- 班级成员关系：${classStudentRows.length} 条`);
  console.log(`- 积分流水：${ledgers.length} 条`);
  console.log('Top 10 演示学生积分：');
  studentSummary.slice(0, 10).forEach(function (student, index) {
    console.log(`  ${index + 1}. ${student.display_name} - 总分 ${student.total_points} / 近7天 ${student.progress_7d}`);
  });
}

main().catch(function (error) {
  console.error(error);
  process.exitCode = 1;
});



