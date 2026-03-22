import avatarData from './avatars/avatar-library.manifest.json';

const EMPTY_LIBRARY = {
  A: { boy: [], girl: [] },
  B: { boy: [], girl: [] },
  C: { boy: [], girl: [] }
};

export const AVATAR_LIBRARY = avatarData?.library || EMPTY_LIBRARY;
export const AVATAR_LIBRARY_LIST = avatarData?.list || [];

const GRADE_GROUP_RULES = [
  { group: 'A', pattern: /(中班|大班|一年级|二年级)/u },
  { group: 'B', pattern: /(三年级|四年级)/u },
  { group: 'C', pattern: /(五年级|六年级|初一|初二|初三)/u }
];

const GENDER_MAP = {
  male: 'boy',
  boy: 'boy',
  '男': 'boy',
  '男生': 'boy',
  female: 'girl',
  girl: 'girl',
  '女': 'girl',
  '女生': 'girl'
};

function hashText(text) {
  return Array.from(String(text || '')).reduce(function (total, character) {
    return total + character.charCodeAt(0);
  }, 0);
}

export function getAvatarEntryByCode(code) {
  return AVATAR_LIBRARY_LIST.find(function (entry) {
    return entry.code === code;
  }) || null;
}

export function getStudentAgeGroup(student) {
  const explicit = String(student?.avatar_age_group || '').trim().toUpperCase();
  if (explicit && AVATAR_LIBRARY[explicit]) {
    return explicit;
  }

  const grade = String(student?.grade || '').trim();
  const matchedRule = GRADE_GROUP_RULES.find(function (rule) {
    return rule.pattern.test(grade);
  });

  return matchedRule ? matchedRule.group : null;
}

export function getStudentGenderGroup(student) {
  const explicit = String(student?.avatar_gender_group || '').trim().toLowerCase();
  if (explicit === 'boy' || explicit === 'girl') {
    return explicit;
  }

  return GENDER_MAP[String(student?.gender || '').trim().toLowerCase()] || null;
}

function getLibraryCandidates(student) {
  const ageGroup = getStudentAgeGroup(student);
  const genderGroup = getStudentGenderGroup(student);

  if (ageGroup && genderGroup && AVATAR_LIBRARY[ageGroup]?.[genderGroup]?.length) {
    return AVATAR_LIBRARY[ageGroup][genderGroup];
  }

  if (ageGroup) {
    const merged = [
      ...(AVATAR_LIBRARY[ageGroup]?.boy || []),
      ...(AVATAR_LIBRARY[ageGroup]?.girl || [])
    ];
    if (merged.length) {
      return merged;
    }
  }

  return [];
}

export function getLibraryAvatarForStudent(student) {
  if (student?.avatar_code) {
    const explicitEntry = getAvatarEntryByCode(student.avatar_code);
    if (explicitEntry) {
      return explicitEntry;
    }
  }

  const candidates = getLibraryCandidates(student);
  if (!candidates.length) {
    return null;
  }

  const seed = student?.avatar_seed || student?.id || student?.student_id || student?.student_code || student?.display_name || student?.legal_name || 'avatar';
  return candidates[hashText(seed) % candidates.length];
}
