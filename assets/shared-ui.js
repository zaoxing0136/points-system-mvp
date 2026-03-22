import { DEFAULT_LEVEL_TIERS } from './default-config.js';
import { getLibraryAvatarForStudent } from './avatar-library.js';

export const LEVEL_TIERS = DEFAULT_LEVEL_TIERS.map(function (tier) {
  return { name: tier.level_name, threshold: tier.threshold };
});

export const CATEGORY_META = {
  classroom: { label: '课堂表现', shortLabel: '课堂', tip: '上课就点，反馈最直接' },
  homework: { label: '作业练习', shortLabel: '作业', tip: '课后补分，节奏很快' },
  project: { label: '作品展示', shortLabel: '作品', tip: '作品完成就能立刻鼓励' },
  habits: { label: '习惯评估', shortLabel: '习惯', tip: '把稳定的好习惯记下来' }
};

const LEGACY_AVATAR_PRESETS = [
  { key: 'dog-shiba', icon: '🐶', accent: '✦', background: 'linear-gradient(135deg, #ffbe78 0%, #ff8f61 100%)' },
  { key: 'dog-cocoa', icon: '🐶', accent: '★', background: 'linear-gradient(135deg, #c98a67 0%, #8f5e49 100%)' },
  { key: 'dog-soda', icon: '🐶', accent: '⚡', background: 'linear-gradient(135deg, #7bd3ff 0%, #5a89ff 100%)' },
  { key: 'dog-mint', icon: '🐶', accent: '◆', background: 'linear-gradient(135deg, #8ce6d2 0%, #41bfa9 100%)' },
  { key: 'dog-pop', icon: '🐶', accent: '❤', background: 'linear-gradient(135deg, #ff8db7 0%, #ff6f8f 100%)' },
  { key: 'dog-poodle', icon: '🐩', accent: '✿', background: 'linear-gradient(135deg, #dca7ff 0%, #a979ff 100%)' },
  { key: 'dog-sunny', icon: '🐕', accent: '☀', background: 'linear-gradient(135deg, #ffe07d 0%, #ffb85a 100%)' },
  { key: 'dog-night', icon: '🐕', accent: '✦', background: 'linear-gradient(135deg, #6c7bff 0%, #3947b8 100%)' },

  { key: 'cat-calico', icon: '🐱', accent: '✦', background: 'linear-gradient(135deg, #ffb479 0%, #ff8160 100%)' },
  { key: 'cat-cloud', icon: '🐱', accent: '☁', background: 'linear-gradient(135deg, #8ed7ff 0%, #7c8dff 100%)' },
  { key: 'cat-peach', icon: '🐱', accent: '❤', background: 'linear-gradient(135deg, #ff9cc2 0%, #ff7f98 100%)' },
  { key: 'cat-grape', icon: '🐱', accent: '◆', background: 'linear-gradient(135deg, #9a8cff 0%, #6c63d8 100%)' },
  { key: 'cat-matcha', icon: '🐱', accent: '✿', background: 'linear-gradient(135deg, #9ce48d 0%, #55c282 100%)' },
  { key: 'cat-gold', icon: '🐈', accent: '★', background: 'linear-gradient(135deg, #ffd56f 0%, #ff9e57 100%)' },
  { key: 'cat-midnight', icon: '🐈', accent: '✦', background: 'linear-gradient(135deg, #5960d9 0%, #323b92 100%)' },

  { key: 'bear-honey', icon: '🐻', accent: '★', background: 'linear-gradient(135deg, #ffbe69 0%, #d6854f 100%)' },
  { key: 'bear-berry', icon: '🐻', accent: '❤', background: 'linear-gradient(135deg, #ff92aa 0%, #ff6a7f 100%)' },
  { key: 'bear-forest', icon: '🐻', accent: '✦', background: 'linear-gradient(135deg, #9ee08d 0%, #4db37d 100%)' },
  { key: 'bear-sky', icon: '🐻', accent: '☁', background: 'linear-gradient(135deg, #8cd7ff 0%, #5c9dff 100%)' },
  { key: 'bear-polar', icon: '🐻‍❄️', accent: '❄', background: 'linear-gradient(135deg, #cfe5ff 0%, #8eb9ff 100%)' },
  { key: 'bear-plum', icon: '🐻', accent: '◆', background: 'linear-gradient(135deg, #b19cff 0%, #7757d9 100%)' },

  { key: 'dino-rex', icon: '🦖', accent: '⚡', background: 'linear-gradient(135deg, #97e27f 0%, #41bf6d 100%)' },
  { key: 'dino-coral', icon: '🦖', accent: '✦', background: 'linear-gradient(135deg, #ffb071 0%, #ff7f59 100%)' },
  { key: 'dino-neon', icon: '🦖', accent: '★', background: 'linear-gradient(135deg, #b6f169 0%, #57cb57 100%)' },
  { key: 'dino-sky', icon: '🦕', accent: '☁', background: 'linear-gradient(135deg, #88d7ff 0%, #5f8dff 100%)' },
  { key: 'dino-candy', icon: '🦕', accent: '❤', background: 'linear-gradient(135deg, #ff9ecf 0%, #ff7a8f 100%)' },
  { key: 'dino-meteor', icon: '🦖', accent: '☄', background: 'linear-gradient(135deg, #7f93ff 0%, #4c5dd6 100%)' },

  { key: 'bunny-soft', icon: '🐰', accent: '✿', background: 'linear-gradient(135deg, #ffa0d0 0%, #ffcce2 100%)' },
  { key: 'panda-cool', icon: '🐼', accent: '✦', background: 'linear-gradient(135deg, #8fcfff 0%, #6f85ff 100%)' },
  { key: 'fox-flare', icon: '🦊', accent: '◆', background: 'linear-gradient(135deg, #ffb06a 0%, #ff675d 100%)' },
  { key: 'koala-dream', icon: '🐨', accent: '☁', background: 'linear-gradient(135deg, #9fdfd4 0%, #5fb7bd 100%)' },
  { key: 'frog-bounce', icon: '🐸', accent: '✦', background: 'linear-gradient(135deg, #8fe574 0%, #33b97a 100%)' },
  { key: 'owl-night', icon: '🦉', accent: '★', background: 'linear-gradient(135deg, #a995ff 0%, #6f5ad4 100%)' },
  { key: 'penguin-pop', icon: '🐧', accent: '❄', background: 'linear-gradient(135deg, #8fd7ff 0%, #5070ff 100%)' },
  { key: 'whale-wave', icon: '🐳', accent: '≈', background: 'linear-gradient(135deg, #80dbff 0%, #37b7d9 100%)' },
  { key: 'lion-roar', icon: '🦁', accent: '★', background: 'linear-gradient(135deg, #ffd36f 0%, #ff9754 100%)' },
  { key: 'tiger-glow', icon: '🐯', accent: '⚡', background: 'linear-gradient(135deg, #ffbe73 0%, #ff7f54 100%)' },
  { key: 'monkey-swing', icon: '🐵', accent: '✦', background: 'linear-gradient(135deg, #d79a73 0%, #9b694e 100%)' },
  { key: 'elephant-mist', icon: '🐘', accent: '☁', background: 'linear-gradient(135deg, #b8d6ff 0%, #7ea0df 100%)' },
  { key: 'pig-blush', icon: '🐷', accent: '❤', background: 'linear-gradient(135deg, #ffb1cf 0%, #ff7ea5 100%)' },
  { key: 'sheep-cloud', icon: '🐑', accent: '✿', background: 'linear-gradient(135deg, #fff0c2 0%, #d9b88f 100%)' },
  { key: 'cow-milk', icon: '🐮', accent: '◆', background: 'linear-gradient(135deg, #d9e4ff 0%, #8fa2d8 100%)' },
  { key: 'hamster-honey', icon: '🐹', accent: '★', background: 'linear-gradient(135deg, #ffd08a 0%, #ff9d61 100%)' },
  { key: 'raccoon-night', icon: '🦝', accent: '✦', background: 'linear-gradient(135deg, #9eb2cf 0%, #617399 100%)' },
  { key: 'seal-ice', icon: '🦭', accent: '❄', background: 'linear-gradient(135deg, #b7deff 0%, #75a6e7 100%)' },
  { key: 'otter-river', icon: '🦦', accent: '≈', background: 'linear-gradient(135deg, #d9a77a 0%, #9c6e54 100%)' },
  { key: 'duck-sunny', icon: '🦆', accent: '☀', background: 'linear-gradient(135deg, #ffe77d 0%, #ffb64f 100%)' },
  { key: 'parrot-pop', icon: '🦜', accent: '✦', background: 'linear-gradient(135deg, #8fe77c 0%, #41bf7c 100%)' },

  { key: 'sunflower', icon: '🌻', accent: '☀', background: 'linear-gradient(135deg, #ffd75c 0%, #ff9d46 100%)' },
  { key: 'tulip', icon: '🌷', accent: '✿', background: 'linear-gradient(135deg, #ff8dbe 0%, #ff9b73 100%)' },
  { key: 'clover', icon: '🍀', accent: '✦', background: 'linear-gradient(135deg, #98e07d 0%, #35be7a 100%)' },
  { key: 'sprout', icon: '🌱', accent: '◆', background: 'linear-gradient(135deg, #9af0ac 0%, #4acb95 100%)' },
  { key: 'cactus', icon: '🌵', accent: '✦', background: 'linear-gradient(135deg, #83d97d 0%, #3ba16b 100%)' },

  { key: 'apple-red', icon: '🍎', accent: '❤', background: 'linear-gradient(135deg, #ff8f8f 0%, #ff5d6f 100%)' },
  { key: 'apple-soda', icon: '🍎', accent: '✦', background: 'linear-gradient(135deg, #ff8d8d 0%, #8e7dff 100%)' },
  { key: 'strawberry-pop', icon: '🍓', accent: '★', background: 'linear-gradient(135deg, #ff8ca6 0%, #ff5b76 100%)' },
  { key: 'orange-sun', icon: '🍊', accent: '☀', background: 'linear-gradient(135deg, #ffd16e 0%, #ff9142 100%)' },
  { key: 'watermelon-cool', icon: '🍉', accent: '≈', background: 'linear-gradient(135deg, #ff8fa3 0%, #77d67a 100%)' },
  { key: 'peach-soft', icon: '🍑', accent: '❤', background: 'linear-gradient(135deg, #ffb3a0 0%, #ff7fa1 100%)' },
  { key: 'pineapple-party', icon: '🍍', accent: '✦', background: 'linear-gradient(135deg, #ffe168 0%, #ffb247 100%)' },
  { key: 'lemon-zing', icon: '🍋', accent: '⚡', background: 'linear-gradient(135deg, #fff17a 0%, #ffd04b 100%)' },
  { key: 'cherry-twin', icon: '🍒', accent: '❤', background: 'linear-gradient(135deg, #ff8f9b 0%, #ff5f68 100%)' },
  { key: 'grape-vibe', icon: '🍇', accent: '◆', background: 'linear-gradient(135deg, #b29bff 0%, #7859d8 100%)' },
  { key: 'pear-fresh', icon: '🍐', accent: '✦', background: 'linear-gradient(135deg, #b6ef7a 0%, #6bc65f 100%)' },
  { key: 'kiwi-moss', icon: '🥝', accent: '★', background: 'linear-gradient(135deg, #9bd46f 0%, #5daa63 100%)' },

  { key: 'carrot-hop', icon: '🥕', accent: '✦', background: 'linear-gradient(135deg, #ffbb72 0%, #ff7f49 100%)' },
  { key: 'corn-gold', icon: '🌽', accent: '★', background: 'linear-gradient(135deg, #ffe56b 0%, #ffbd48 100%)' },
  { key: 'broccoli-fresh', icon: '🥦', accent: '◆', background: 'linear-gradient(135deg, #8de07b 0%, #2fb47b 100%)' },
  { key: 'eggplant-night', icon: '🍆', accent: '✦', background: 'linear-gradient(135deg, #a18fff 0%, #685ad7 100%)' },
  { key: 'tomato-pop', icon: '🍅', accent: '❤', background: 'linear-gradient(135deg, #ff9586 0%, #ff5e63 100%)' },
  { key: 'pepper-bright', icon: '🫑', accent: '⚡', background: 'linear-gradient(135deg, #8ae471 0%, #37bf79 100%)' },
  { key: 'mushroom-soft', icon: '🍄', accent: '✿', background: 'linear-gradient(135deg, #ffd0a0 0%, #d99368 100%)' },
  { key: 'lettuce-cool', icon: '🥬', accent: '☁', background: 'linear-gradient(135deg, #a4ec8e 0%, #5ebf7b 100%)' }
];

export function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatDateTime(isoString) {
  const date = new Date(isoString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

export function getStudentDisplayName(student) {
  return student?.display_name || student?.legal_name || student?.nickname || '未命名学生';
}

export function getCampusShortName(campusName) {
  const cleaned = String(campusName || '')
    .replace(/\s+/g, '')
    .replace(/校区$/u, '')
    .trim();
  if (!cleaned) {
    return '';
  }
  return cleaned.length <= 2 ? cleaned : cleaned.slice(0, 2);
}
export function normalizeTierList(rows) {
  if (!Array.isArray(rows) || !rows.length) {
    return LEVEL_TIERS;
  }

  return rows
    .slice()
    .sort(function (left, right) {
      return Number(left.level_no || 0) - Number(right.level_no || 0);
    })
    .map(function (tier, index) {
      return {
        name: String(tier.level_name || `${index + 1}段`).trim(),
        threshold: Number(tier.threshold || 0)
      };
    });
}

export function resolveTier(points, tiers = LEVEL_TIERS) {
  return tiers.reduce(function (current, tier) {
    return points >= Number(tier.threshold || 0) ? tier : current;
  }, tiers[0]);
}

export function getTierProgress(points, tiers = LEVEL_TIERS) {
  const currentTier = resolveTier(points, tiers);
  const nextTier = tiers.find(function (tier) {
    return points < Number(tier.threshold || 0);
  }) || null;
  const currentThreshold = Number(currentTier.threshold || 0);
  const nextThreshold = nextTier ? Number(nextTier.threshold || 0) : currentThreshold;
  const distance = nextTier ? Math.max(0, nextThreshold - points) : 0;

  let progress = 100;
  if (nextTier && nextThreshold > currentThreshold) {
    progress = ((points - currentThreshold) / (nextThreshold - currentThreshold)) * 100;
  }

  return {
    currentTier,
    nextTier,
    distance,
    progress: Math.max(6, Math.min(100, progress))
  };
}

function getAvatarSeed(student) {
  return student?.avatar_url || student?.id || student?.student_id || student?.student_code || getStudentDisplayName(student);
}

function getAvatarHash(seedText) {
  let total = 0;
  for (const char of String(seedText)) {
    total += char.charCodeAt(0);
  }
  return total;
}

function isImageAvatar(avatarUrl) {
  return /^(https?:\/\/|data:image\/|\/)/i.test(String(avatarUrl || '').trim());
}

function getLegacyPresetAvatar(student) {
  const hash = getAvatarHash(getAvatarSeed(student));
  return LEGACY_AVATAR_PRESETS[hash % LEGACY_AVATAR_PRESETS.length];
}

function getAvatarAssignment(student) {
  if (isImageAvatar(student?.avatar_url)) {
    return {
      kind: 'image',
      src: String(student.avatar_url).trim()
    };
  }

  const libraryAvatar = getLibraryAvatarForStudent(student);
  if (libraryAvatar?.image_path) {
    return {
      kind: 'library',
      src: libraryAvatar.image_path,
      key: libraryAvatar.code
    };
  }

  return {
    kind: 'legacy',
    preset: getLegacyPresetAvatar(student)
  };
}

export function getAvatarStyle(student) {
  const assignment = getAvatarAssignment(student);
  if (assignment.kind !== 'legacy') {
    return null;
  }
  return assignment.preset.background;
}

export function createAvatarHtml(student, extraClass = '') {
  const assignment = getAvatarAssignment(student);
  const className = ['avatar-badge', extraClass, assignment.kind === 'legacy' ? 'avatar-badge--preset' : 'avatar-badge--image']
    .filter(Boolean)
    .join(' ');

  if (assignment.kind !== 'legacy') {
    return `
      <span class="${className}">
        <img src="${escapeHtml(encodeURI(assignment.src))}" alt="${escapeHtml(getStudentDisplayName(student))}" loading="lazy" />
      </span>
    `.trim();
  }

  const preset = assignment.preset;
  const accentMarkup = preset.accent
    ? `<span class="avatar-badge__accent" aria-hidden="true">${escapeHtml(preset.accent)}</span>`
    : '';

  return `
    <span class="${className}" style="background:${escapeHtml(preset.background)}" data-avatar-key="${escapeHtml(preset.key)}">
      <span class="avatar-badge__icon" aria-hidden="true">${escapeHtml(preset.icon)}</span>
      ${accentMarkup}
    </span>
  `.trim();
}

export function groupRulesByCategory(rules) {
  return rules.reduce(function (groups, rule) {
    if (!groups[rule.category]) {
      groups[rule.category] = [];
    }
    groups[rule.category].push(rule);
    return groups;
  }, {});
}

export function computeBadgePlaceholder(totalPoints, progress7d) {
  return Math.max(1, Math.min(8, Math.floor((totalPoints + progress7d) / 240) + 1));
}



