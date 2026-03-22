import { AVATAR_LIBRARY_LIST } from './avatar-library.js';

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

function normalizeIndex(index) {
  return Math.abs(Number(index) || 0);
}

export function buildPreviewStudents(count = 12, offset = 0) {
  const avatarCount = Math.max(1, AVATAR_LIBRARY_LIST.length);

  return Array.from({ length: count }, function (_item, position) {
    const index = normalizeIndex(offset + position);
    const avatar = AVATAR_LIBRARY_LIST[index % avatarCount] || {};
    const totalPoints = 108 + (index * 17) % 220;
    const progress = 6 + (index * 9) % 36;
    const badgeCount = Math.max(1, Math.round(totalPoints / 48) + (index % 3));
    const createdDate = new Date(Date.UTC(2026, 2, 1 + (index % 20), 8 + (index % 5), 10 + (index % 40), 0));

    return {
      id: `preview-student-${index + 1}`,
      student_id: `preview-student-${index + 1}`,
      student_code: `PV${String(index + 1).padStart(4, '0')}`,
      legal_name: LEGAL_NAMES[index % LEGAL_NAMES.length],
      display_name: DISPLAY_NAMES[index % DISPLAY_NAMES.length],
      grade: GRADES[index % GRADES.length],
      parent_name: PARENTS[index % PARENTS.length],
      parent_phone: `1390000${String(1200 + index).padStart(4, '0')}`,
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
