import avatarData from './avatars/avatar-library.manifest.js';

const EMPTY_LIBRARY = {};
const FILE_PROTOCOL = 'file:';

export const AVATAR_CATEGORIES = avatarData?.categories || EMPTY_LIBRARY;
export const AVATAR_LIBRARY = AVATAR_CATEGORIES;
export const AVATAR_LIBRARY_LIST = avatarData?.list || [];
export const AVATAR_CATEGORY_KEYS = Object.keys(AVATAR_CATEGORIES);

function normalizeText(value) {
  return String(value || '').trim();
}

function normalizeImagePath(pathname) {
  const value = normalizeText(pathname).replace(/\\/g, '/');
  if (!value) {
    return '';
  }

  if (/^(https?:\/\/|data:image\/|blob:|file:\/\/)/iu.test(value)) {
    const fileModeMatch = value.match(/\/assets\/avatars\/.+$/iu);
    return fileModeMatch ? fileModeMatch[0] : value;
  }

  if (/^\.\.?\/assets\//iu.test(value)) {
    return `/${value.replace(/^\.\.?\//u, '')}`;
  }

  if (/^assets\//iu.test(value)) {
    return `/${value}`;
  }

  return value.startsWith('/') ? value : `/${value.replace(/^\/+/, '')}`;
}

export function resolveAvatarAssetUrl(pathname) {
  const normalized = normalizeImagePath(pathname);
  if (!normalized) {
    return '';
  }
  if (!normalized.startsWith('/')) {
    return normalized;
  }
  if (typeof window !== 'undefined' && window.location?.protocol === FILE_PROTOCOL) {
    return `.${normalized}`;
  }
  return normalized;
}

function hashText(text) {
  return Array.from(String(text || '')).reduce(function (total, character) {
    return total * 33 + character.charCodeAt(0);
  }, 5381);
}

export function buildAvatarSeed(student) {
  const seed = [
    student?.avatar_seed,
    student?.avatar_code,
    student?.student_code,
    student?.id,
    student?.student_id,
    student?.parent_phone,
    student?.display_name,
    student?.legal_name,
    student?.parent_name,
    student?.grade
  ].map(normalizeText).filter(Boolean).join('|');

  return seed || 'student-avatar';
}

export function getAvatarEntryByCode(code) {
  const target = normalizeText(code);
  if (!target) {
    return null;
  }

  return AVATAR_LIBRARY_LIST.find(function (entry) {
    return entry.code === target;
  }) || null;
}

export function getAvatarEntryByPath(pathname) {
  const target = normalizeImagePath(pathname);
  if (!target) {
    return null;
  }

  return AVATAR_LIBRARY_LIST.find(function (entry) {
    return normalizeImagePath(entry.image_path) === target;
  }) || null;
}

export function isManagedAvatarUrl(pathname) {
  return /^\/assets\/avatars\//iu.test(normalizeImagePath(pathname));
}

function getCategoryEntries(categoryKey) {
  return AVATAR_CATEGORIES[categoryKey] || [];
}

function getCategoryOrder(seed) {
  if (!AVATAR_CATEGORY_KEYS.length) {
    return [];
  }

  const startIndex = Math.abs(hashText(`category:${seed}`)) % AVATAR_CATEGORY_KEYS.length;
  return AVATAR_CATEGORY_KEYS.map(function (_, offset) {
    return AVATAR_CATEGORY_KEYS[(startIndex + offset) % AVATAR_CATEGORY_KEYS.length];
  });
}

export function getLibraryAvatarForStudent(student) {
  if (student?.avatar_code) {
    const explicitEntry = getAvatarEntryByCode(student.avatar_code);
    if (explicitEntry) {
      return explicitEntry;
    }
  }

  const managedAvatarEntry = getAvatarEntryByPath(student?.avatar_url);
  if (managedAvatarEntry) {
    return managedAvatarEntry;
  }

  if (!AVATAR_LIBRARY_LIST.length) {
    return null;
  }

  const seed = buildAvatarSeed(student);
  const libraryIndex = Math.abs(hashText(`library:${seed}`)) % AVATAR_LIBRARY_LIST.length;
  return AVATAR_LIBRARY_LIST[libraryIndex] || null;
}
