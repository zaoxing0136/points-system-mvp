export const DEFAULT_LEVEL_TIERS = [
  { level_no: 1, level_name: '1段', threshold: 50, is_active: true },
  { level_no: 2, level_name: '2段', threshold: 150, is_active: true },
  { level_no: 3, level_name: '3段', threshold: 350, is_active: true },
  { level_no: 4, level_name: '4段', threshold: 700, is_active: true },
  { level_no: 5, level_name: '5段', threshold: 1300, is_active: true },
  { level_no: 6, level_name: '6段', threshold: 2200, is_active: true },
  { level_no: 7, level_name: '7段', threshold: 3600, is_active: true },
  { level_no: 8, level_name: '8段', threshold: 5600, is_active: true },
  { level_no: 9, level_name: '9段', threshold: 10000, is_active: true }
];

export const DEFAULT_POINT_RULES = [
  { id: '81111111-1111-1111-1111-111111111111', category: 'classroom', rule_name: '专注听讲', points: 1, sort_order: 10, is_active: true, is_common: true },
  { id: '81111111-1111-1111-1111-111111111112', category: 'classroom', rule_name: '积极发言', points: 2, sort_order: 20, is_active: true, is_common: true },
  { id: '81111111-1111-1111-1111-111111111113', category: 'classroom', rule_name: '勇敢尝试', points: 1, sort_order: 30, is_active: true, is_common: true },
  { id: '81111111-1111-1111-1111-111111111114', category: 'classroom', rule_name: '主动协作', points: 2, sort_order: 40, is_active: true, is_common: true },
  { id: '81111111-1111-1111-1111-111111111115', category: 'classroom', rule_name: '课堂之星', points: 3, sort_order: 50, is_active: true, is_common: false },
  { id: '82222222-2222-2222-2222-222222222221', category: 'homework', rule_name: '按时完成', points: 2, sort_order: 10, is_active: true, is_common: true },
  { id: '82222222-2222-2222-2222-222222222222', category: 'homework', rule_name: '书写认真', points: 1, sort_order: 20, is_active: true, is_common: true },
  { id: '82222222-2222-2222-2222-222222222223', category: 'homework', rule_name: '订正及时', points: 1, sort_order: 30, is_active: true, is_common: true },
  { id: '82222222-2222-2222-2222-222222222224', category: 'homework', rule_name: '超额练习', points: 2, sort_order: 40, is_active: true, is_common: false },
  { id: '82222222-2222-2222-2222-222222222225', category: 'homework', rule_name: '作业优秀', points: 3, sort_order: 50, is_active: true, is_common: true },
  { id: '83333333-3333-3333-3333-333333333331', category: 'project', rule_name: '作品完成', points: 2, sort_order: 10, is_active: true, is_common: true },
  { id: '83333333-3333-3333-3333-333333333332', category: 'project', rule_name: '创意表达', points: 2, sort_order: 20, is_active: true, is_common: true },
  { id: '83333333-3333-3333-3333-333333333333', category: 'project', rule_name: '展示分享', points: 2, sort_order: 30, is_active: true, is_common: true },
  { id: '83333333-3333-3333-3333-333333333334', category: 'project', rule_name: '动手实践', points: 1, sort_order: 40, is_active: true, is_common: false },
  { id: '83333333-3333-3333-3333-333333333335', category: 'project', rule_name: '作品之星', points: 3, sort_order: 50, is_active: true, is_common: true },
  { id: '84444444-4444-4444-4444-444444444441', category: 'habits', rule_name: '准时到课', points: 1, sort_order: 10, is_active: true, is_common: true },
  { id: '84444444-4444-4444-4444-444444444442', category: 'habits', rule_name: '礼貌表达', points: 1, sort_order: 20, is_active: true, is_common: true },
  { id: '84444444-4444-4444-4444-444444444443', category: 'habits', rule_name: '物品整理', points: 1, sort_order: 30, is_active: true, is_common: false },
  { id: '84444444-4444-4444-4444-444444444444', category: 'habits', rule_name: '持续专注', points: 2, sort_order: 40, is_active: true, is_common: true },
  { id: '84444444-4444-4444-4444-444444444445', category: 'habits', rule_name: '自律榜样', points: 3, sort_order: 50, is_active: true, is_common: true }
];

export const DEFAULT_BADGE_RULES = [
  { id: 'badge-voice-star', badge_name: '发言达人', rule_text: '课堂积极发言累计 20 次', is_active: true, sort_order: 10 },
  { id: 'badge-focus-star', badge_name: '专注之星', rule_text: '专注听讲累计 30 次', is_active: true, sort_order: 20 },
  { id: 'badge-homework-star', badge_name: '作业稳稳星', rule_text: '按时完成作业累计 15 次', is_active: true, sort_order: 30 },
  { id: 'badge-creative-star', badge_name: '创意小能手', rule_text: '创意表达累计 12 次', is_active: true, sort_order: 40 },
  { id: 'badge-habit-star', badge_name: '习惯小标兵', rule_text: '准时到课累计 20 次', is_active: true, sort_order: 50 },
  { id: 'badge-progress-star', badge_name: '进步飞跃星', rule_text: '近 7 天积分增长达到 40 分', is_active: true, sort_order: 60 },
  { id: 'badge-attendance-star', badge_name: '全勤能量星', rule_text: '连续 4 周出勤稳定', is_active: true, sort_order: 70 },
  { id: 'badge-rolemodel-star', badge_name: '班级榜样', rule_text: '总积分达到 1000 分', is_active: true, sort_order: 80 }
];
