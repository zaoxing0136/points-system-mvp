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
  { id: '81111111-1111-1111-1111-111111111111', category: 'classroom', rule_name: '专注听课', points: 1, sort_order: 10, is_active: true, is_common: true },
  { id: '81111111-1111-1111-1111-111111111112', category: 'classroom', rule_name: '积极表达', points: 2, sort_order: 20, is_active: true, is_common: true },
  { id: '81111111-1111-1111-1111-111111111113', category: 'classroom', rule_name: '勇敢尝试', points: 1, sort_order: 30, is_active: true, is_common: true },
  { id: '81111111-1111-1111-1111-111111111114', category: 'classroom', rule_name: '主动协作', points: 2, sort_order: 40, is_active: true, is_common: true },
  { id: '81111111-1111-1111-1111-111111111115', category: 'classroom', rule_name: '课堂之星', points: 3, sort_order: 50, is_active: true, is_common: false },
  { id: '81111111-1111-1111-1111-111111111116', category: 'classroom', rule_name: '准时到课', points: 1, sort_order: 60, is_active: true, is_common: true },
  { id: '81111111-1111-1111-1111-111111111191', category: 'classroom', rule_name: '课上提醒', points: -1, sort_order: 110, is_active: true, is_common: false },
  { id: '81111111-1111-1111-1111-111111111192', category: 'classroom', rule_name: '影响秩序', points: -2, sort_order: 120, is_active: true, is_common: false },
  { id: '81111111-1111-1111-1111-111111111193', category: 'classroom', rule_name: '未按要求完成', points: -1, sort_order: 130, is_active: true, is_common: false },
  { id: '81111111-1111-1111-1111-111111111194', category: 'classroom', rule_name: '需要再次提醒', points: -1, sort_order: 140, is_active: true, is_common: false },
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
  { id: '84444444-4444-4444-4444-444444444442', category: 'habits', rule_name: '礼貌表达', points: 1, sort_order: 10, is_active: true, is_common: true },
  { id: '84444444-4444-4444-4444-444444444443', category: 'habits', rule_name: '物品整理', points: 1, sort_order: 20, is_active: true, is_common: false },
  { id: '84444444-4444-4444-4444-444444444444', category: 'habits', rule_name: '持续专注', points: 2, sort_order: 30, is_active: true, is_common: true },
  { id: '84444444-4444-4444-4444-444444444445', category: 'habits', rule_name: '自律榜样', points: 3, sort_order: 40, is_active: true, is_common: true }
];

export const DEFAULT_BADGE_DEFINITIONS = [
  {
    code: 'focus_star',
    name: '专注星',
    description: '专注听课累计达到阈值后解锁。',
    event_label: '专注听课',
    icon_token: '⭐',
    threshold: 10,
    is_active: true,
    sort_order: 10
  },
  {
    code: 'expression_star',
    name: '表达星',
    description: '积极表达累计达到阈值后解锁。',
    event_label: '积极表达',
    icon_token: '🗣️',
    threshold: 10,
    is_active: true,
    sort_order: 20
  },
  {
    code: 'cooperation_star',
    name: '协作星',
    description: '帮助同学或合作良好累计达到阈值后解锁。',
    event_label: '主动帮助',
    icon_token: '🤝',
    threshold: 10,
    is_active: true,
    sort_order: 30
  },
  {
    code: 'persistence_star',
    name: '坚持星',
    description: '准时到课累计达到阈值后解锁。',
    event_label: '准时到课',
    icon_token: '🏁',
    threshold: 10,
    is_active: true,
    sort_order: 40
  }
];

export const DEFAULT_BADGE_RULES = DEFAULT_BADGE_DEFINITIONS;
export const OFFICIAL_CAMPUSES = [
  { id: 'a5555555-5555-5555-5555-555555555555', code: 'DONGXIN', name: '东新' },
  { id: 'c1111111-1111-1111-1111-111111111111', code: 'CHENGBEI', name: '城北' },
  { id: 'a6666666-6666-6666-6666-666666666666', code: 'JIANGWAN', name: '江湾' },
  { id: 'a4444444-4444-4444-4444-444444444444', code: 'SANDUN', name: '三墩' },
  { id: 'c2222222-2222-2222-2222-222222222222', code: 'GUANCHENG', name: '观成' },
  { id: 'c3333333-3333-3333-3333-333333333333', code: 'WENSAN', name: '文三' },
  { id: 'c4444444-4444-4444-4444-444444444444', code: 'JIEFANGLU', name: '解放路' }
];

export const OFFICIAL_CAMPUS_NAMES = OFFICIAL_CAMPUSES.map(function (campus) {
  return campus.name;
});
