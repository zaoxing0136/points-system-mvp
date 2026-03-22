import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const avatarRoot = path.join(projectRoot, 'assets', 'avatars');
const publicAvatarRoot = path.join(projectRoot, 'public', 'assets', 'avatars');
const manifestPath = path.join(avatarRoot, 'avatar-library.manifest.json');
const manifestJsPath = path.join(avatarRoot, 'avatar-library.manifest.js');
const publicManifestPath = path.join(publicAvatarRoot, 'avatar-library.manifest.json');
const publicManifestJsPath = path.join(publicAvatarRoot, 'avatar-library.manifest.js');
const manifestGlobalPath = path.join(avatarRoot, 'avatar-library.manifest.global.js');
const publicManifestGlobalPath = path.join(publicAvatarRoot, 'avatar-library.manifest.global.js');

const CATEGORY_META = {
  animals: '动物伙伴',
  plant_sprites: '花灵与植物',
  produce_pals: '蔬果伙伴',
  sky_friends: '云月星元素',
  little_guardians: '小守护者'
};

function ensureDir(targetPath) {
  fs.mkdirSync(targetPath, { recursive: true });
}

function clearDirectory(targetPath) {
  fs.rmSync(targetPath, { recursive: true, force: true });
}

function copyDirContents(sourceDir, targetDir) {
  ensureDir(targetDir);
  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);
    if (entry.isDirectory()) {
      copyDirContents(sourcePath, targetPath);
      continue;
    }
    fs.writeFileSync(targetPath, fs.readFileSync(sourcePath));
  }
}

function escapeXml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function palette(bgFrom, bgTo, glow, primary, secondary, accent, body, extra = {}) {
  return {
    bgFrom,
    bgTo,
    glow,
    primary,
    secondary,
    accent,
    body,
    line: '#31495C',
    skin: '#F7D8BF',
    hair: '#6D4E41',
    ...extra
  };
}

function avatar(code, name, family, motif, colors, extra = {}) {
  return {
    code,
    name,
    family,
    motif,
    palette: colors,
    expression: extra.expression || 'smile',
    ...extra
  };
}

const CATEGORY_ENTRIES = {
  animals: [
    avatar('animal-cocoa-bear', '可可小熊', 'animal', 'bear', palette('#FFF1DE', '#FFB889', '#FFF8ED', '#C88B63', '#FFF3E7', '#F17354', '#E7A17F')),
    avatar('animal-sun-lion', '晴晴小狮', 'animal', 'lion', palette('#FFF5C9', '#FFC86B', '#FFF9E9', '#D99542', '#FFF0C8', '#FF8D48', '#F3C06D'), { expression: 'grin' }),
    avatar('animal-mint-bunny', '薄荷小兔', 'animal', 'bunny', palette('#F0FFE4', '#A8E6B8', '#FCFFF4', '#77C697', '#FFF3F6', '#FF9CB8', '#9ADEB6')),
    avatar('animal-coral-fox', '珊瑚小狐', 'animal', 'fox', palette('#FFF1E4', '#FFBE9C', '#FFF8EF', '#E89066', '#FFF2E7', '#F56D5A', '#F2A27F'), { expression: 'wink' }),
    avatar('animal-cloud-panda', '云朵熊猫', 'animal', 'panda', palette('#EEF7FF', '#A2D5FF', '#F9FCFF', '#EEF4FB', '#FFFFFF', '#6D8EFF', '#B9CFEA')),
    avatar('animal-ocean-whale', '泡泡小鲸', 'animal', 'whale', palette('#E7FEFF', '#8DE0E8', '#F8FFFF', '#5CB8C4', '#ECFCFF', '#4D98D8', '#7ACCD3')),
    avatar('animal-plum-owl', '暮暮小鸮', 'animal', 'owl', palette('#F2ECFF', '#C7B2FF', '#FBF8FF', '#8A78D9', '#FFF3FA', '#FF93BF', '#AB93E9')),
    avatar('animal-hazel-squirrel', '榛榛松鼠', 'animal', 'squirrel', palette('#FFF2E0', '#D9AE87', '#FFF9EF', '#B77F57', '#FFF1E5', '#F2A65A', '#D39871')),
    avatar('animal-moss-turtle', '苔苔小龟', 'animal', 'turtle', palette('#F1FDDD', '#B8E08A', '#FBFFF1', '#78B965', '#FFF8E4', '#F2A556', '#9DCA7B')),
    avatar('animal-snow-seal', '雪团海豹', 'animal', 'seal', palette('#F5FAFF', '#C6E2FF', '#FCFEFF', '#9EB7D5', '#FFFFFF', '#8194F0', '#B6CCE9')),
    avatar('animal-amber-tiger', '琥珀小虎', 'animal', 'tiger', palette('#FFF0D8', '#FFBA7D', '#FFF8EA', '#DA8E4E', '#FFF1E2', '#FF6D4E', '#E89C69')),
    avatar('animal-dusk-cat', '暮色小猫', 'animal', 'cat', palette('#F4EEFF', '#C6B6FF', '#FCF9FF', '#7B78D2', '#FFF4F8', '#FF90BA', '#A39BEA'))
  ],
  plant_sprites: [
    avatar('plant-peach-blossom', '桃桃花灵', 'plant', 'blossom', palette('#FFF0F3', '#FFC9D8', '#FFF8FA', '#F4A7BC', '#FFF4E9', '#F786A6', '#FFD6E0')),
    avatar('plant-tulip-sprite', '郁香花灵', 'plant', 'tulip', palette('#FFF1EA', '#FFB9A1', '#FFF8F1', '#F1888C', '#FFF5EC', '#FF8F62', '#F9C2A2')),
    avatar('plant-sunflower-sprite', '向阳花灵', 'plant', 'sunflower', palette('#FFF5C9', '#FFD567', '#FFFBEA', '#F1C04E', '#FFF1D8', '#F39B4D', '#FFD983')),
    avatar('plant-clover-sprite', '四叶草灵', 'plant', 'clover', palette('#F0FEDA', '#B3E486', '#FBFFF1', '#7ABF6A', '#F6FFE9', '#47B982', '#A8DA7D')),
    avatar('plant-mushroom-elf', '蘑菇茸茸', 'plant', 'mushroom', palette('#FFF3E2', '#FFCAA0', '#FFF9F1', '#E59C78', '#FFF3EA', '#F2876E', '#F4B58C')),
    avatar('plant-lily-guardian', '铃兰守护', 'plant', 'lily', palette('#F4F0FF', '#D7CBFF', '#FBF9FF', '#B79BE8', '#FFF7F2', '#8BCB8F', '#E4DDFE')),
    avatar('plant-lotus-dream', '莲莲梦灵', 'plant', 'lotus', palette('#FFF1FA', '#E4C7FF', '#FFF8FD', '#D29AE7', '#FFF3F7', '#87C7D8', '#F0D8FF')),
    avatar('plant-sprout-sprite', '小芽灵灵', 'plant', 'sprout', palette('#F0FFE1', '#BEEB9A', '#FBFFF3', '#81C770', '#FFF8E8', '#F2A65A', '#B4E08B'))
  ],
  produce_pals: [
    avatar('produce-apple-buddy', '苹果咚咚', 'produce', 'apple', palette('#FFF0E4', '#FFB09C', '#FFF8F0', '#EA6E62', '#FFF5E9', '#69B95A', '#F58E80')),
    avatar('produce-strawberry-buddy', '草莓泡泡', 'produce', 'strawberry', palette('#FFF1F4', '#FFB2C5', '#FFF9FB', '#EF6E88', '#FFF3EA', '#7CC96F', '#F99AB1')),
    avatar('produce-peach-buddy', '蜜桃软软', 'produce', 'peach', palette('#FFF0E8', '#FFC1AA', '#FFF9F4', '#F3A38F', '#FFF5EC', '#FF7FA3', '#F7C0AB')),
    avatar('produce-pear-buddy', '雪梨青青', 'produce', 'pear', palette('#F2FFD9', '#CBEA7A', '#FBFFF2', '#A7CA5C', '#FFF8E2', '#6DBF72', '#DAED95')),
    avatar('produce-carrot-buddy', '胡萝卜跳跳', 'produce', 'carrot', palette('#FFF2DE', '#FFC384', '#FFF9EE', '#F28A4D', '#FFF4E8', '#65BD70', '#F7A96D')),
    avatar('produce-pumpkin-buddy', '南瓜圆圆', 'produce', 'pumpkin', palette('#FFF1D9', '#FFBE70', '#FFF9EA', '#E98F44', '#FFF2E4', '#7FBE6A', '#F5A859')),
    avatar('produce-corn-buddy', '玉米闪闪', 'produce', 'corn', palette('#FFF6C9', '#FFE06B', '#FFFBE8', '#F2C94C', '#FFF3D8', '#77BE6C', '#FFE58E')),
    avatar('produce-broccoli-buddy', '西兰花森森', 'produce', 'broccoli', palette('#ECFFD8', '#A9E287', '#FBFFF2', '#61B86E', '#FFF5E1', '#3EBA7B', '#8CD17A'))
  ],
  sky_friends: [
    avatar('sky-cloud-friend', '云朵绵绵', 'sky', 'cloud', palette('#F6F7FF', '#D9E6FF', '#FFFFFF', '#FFFFFF', '#F2F7FF', '#8DA6FF', '#C8D8F5')),
    avatar('sky-moon-friend', '月亮柔柔', 'sky', 'moon', palette('#F2EEFF', '#D6CEFF', '#FBF9FF', '#FFE8A6', '#FFF7DE', '#9A92F2', '#E5DBFF')),
    avatar('sky-star-friend', '星星闪闪', 'sky', 'star', palette('#FFF7CF', '#FFE07A', '#FFFCE9', '#FFD45B', '#FFF3D4', '#8B8BFF', '#FFE89A')),
    avatar('sky-rainbow-friend', '彩虹弯弯', 'sky', 'rainbow', palette('#F3F4FF', '#D5E6FF', '#FCFDFF', '#FFFFFF', '#FDF6FF', '#FF8BB8', '#DCE9FF')),
    avatar('sky-raindrop-friend', '雨滴叮咚', 'sky', 'raindrop', palette('#EEF8FF', '#A8D8FF', '#FBFEFF', '#72B7F2', '#F1FAFF', '#5A93E2', '#A6CCF7')),
    avatar('sky-sun-friend', '晴空暖暖', 'sky', 'sun', palette('#FFF5C9', '#FFD66C', '#FFFBEA', '#FFD15B', '#FFF1D4', '#FF9852', '#FFE38E')),
    avatar('sky-snow-friend', '雪花晶晶', 'sky', 'snow', palette('#F7FBFF', '#D3E7FF', '#FFFFFF', '#E7F1FF', '#FFFFFF', '#8CA5F4', '#D9E8FF')),
    avatar('sky-comet-friend', '彗星飞飞', 'sky', 'comet', palette('#F1EEFF', '#C9C0FF', '#FBFAFF', '#FFE48E', '#FFF6DE', '#7B89F2', '#E3DCFF'))
  ],
  little_guardians: [
    avatar('guard-scarf-guardian', '围巾守护者', 'guardian', 'scarf', palette('#FFF0E3', '#FFC19C', '#FFF9F1', '#F29C6B', '#FEE1CB', '#F06C56', '#F5B08A', { skin: '#F7D6BE', hair: '#6D4E41' })),
    avatar('guard-lantern-guardian', '灯灯守护者', 'guardian', 'lantern', palette('#FFF4D4', '#FFD17D', '#FFFBEA', '#D99E4B', '#FEE8C6', '#FF8B4A', '#F4C274', { skin: '#F7D8C0', hair: '#6C503F' })),
    avatar('guard-leaf-ranger', '叶子小巡游', 'guardian', 'leaf-ranger', palette('#F0FFE0', '#B8E28A', '#FBFFF3', '#7BC06A', '#DDF1C4', '#3DB77E', '#A1D983', { skin: '#F5D1B6', hair: '#6A4F36' })),
    avatar('guard-star-ranger', '星光小巡游', 'guardian', 'star-ranger', palette('#F3EEFF', '#D2C2FF', '#FBF9FF', '#9A83E6', '#E7DCFF', '#FF92B6', '#B39EF1', { skin: '#F7D3BB', hair: '#5D4A58' })),
    avatar('guard-shell-explorer', '贝壳探险家', 'guardian', 'shell-explorer', palette('#EEF8FF', '#B4DBFF', '#FBFEFF', '#71A9DA', '#DCEEFE', '#F5A46A', '#9BC8EF', { skin: '#F4D2B8', hair: '#6B5545' })),
    avatar('guard-compass-explorer', '罗盘探险家', 'guardian', 'compass-explorer', palette('#FFF2DE', '#E5C18E', '#FFF9EF', '#B88755', '#F7E3C4', '#57A6D9', '#D8A97A', { skin: '#F7D5BD', hair: '#604B3D' })),
    avatar('guard-cape-guardian', '披风守护者', 'guardian', 'cape', palette('#F2F0FF', '#CFC7FF', '#FBFAFF', '#8479D6', '#DED9FF', '#F36D7F', '#A69BEA', { skin: '#F3D0B7', hair: '#5D4861' })),
    avatar('guard-ribbon-elf', '丝带小精灵', 'guardian', 'ribbon-elf', palette('#FFF1F5', '#FFC6D7', '#FFF9FB', '#F59AB4', '#FEE0EB', '#7BC39F', '#F7B3C8', { skin: '#F8D8C1', hair: '#7A4F56' })),
    avatar('guard-acorn-elf', '松果小精灵', 'guardian', 'acorn-elf', palette('#FFF1E2', '#D9B089', '#FFF9F1', '#A96F49', '#F5DDC4', '#78BC74', '#CCA07B', { skin: '#F2CEB4', hair: '#5A4539' })),
    avatar('guard-snow-elf', '雪绒小精灵', 'guardian', 'snow-elf', palette('#F7FBFF', '#D7E9FF', '#FFFFFF', '#A9C4E7', '#ECF5FF', '#93A4F8', '#C4D9F3', { skin: '#F5D6BF', hair: '#586B7D' })),
    avatar('guard-moon-elf', '月芽小精灵', 'guardian', 'moon-elf', palette('#F4F0FF', '#D7CCFF', '#FCFAFF', '#A08BE8', '#E7DEFF', '#7AC2D3', '#BAAEF2', { skin: '#F6D7C0', hair: '#625176' })),
    avatar('guard-dawn-explorer', '晨光探险家', 'guardian', 'dawn-explorer', palette('#FFF1DE', '#FFC796', '#FFF9F0', '#F0A161', '#FDE2C8', '#5FA8E2', '#F7B47D', { skin: '#F5D3BA', hair: '#6B4F3D' }))
  ]
};

const AVATAR_ENTRIES = Object.entries(CATEGORY_ENTRIES).flatMap(function ([categoryKey, entries]) {
  return entries.map(function (entry, index) {
    return {
      ...entry,
      category_key: categoryKey,
      category_name: CATEGORY_META[categoryKey],
      sort_order: index + 1,
      image_path: `/assets/avatars/main/${categoryKey}/${entry.code}.svg`
    };
  });
});
function round(value) {
  return Number(value.toFixed(1));
}

function buildPetalRing(cx, cy, petalCount, rx, ry, distance, fill, rotationStart = 0, opacity = 1) {
  return Array.from({ length: petalCount }, function (_, index) {
    const angle = ((rotationStart + (360 / petalCount) * index) * Math.PI) / 180;
    const x = round(cx + Math.cos(angle) * distance);
    const y = round(cy + Math.sin(angle) * distance);
    const rotate = round(rotationStart + (360 / petalCount) * index + 90);
    return `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}" opacity="${opacity}" transform="rotate(${rotate} ${x} ${y})" />`;
  }).join('');
}

function buildStarPath(cx, cy, outerRadius, innerRadius, points = 5) {
  const pointList = [];
  for (let index = 0; index < points * 2; index += 1) {
    const radius = index % 2 === 0 ? outerRadius : innerRadius;
    const angle = (-90 + (180 / points) * index) * (Math.PI / 180);
    pointList.push([round(cx + Math.cos(angle) * radius), round(cy + Math.sin(angle) * radius)]);
  }
  return pointList.map(function (point, index) {
    const prefix = index === 0 ? 'M' : 'L';
    return `${prefix} ${point[0]} ${point[1]}`;
  }).join(' ') + ' Z';
}

function renderBackdrop(entry, gradientId) {
  const p = entry.palette;
  return `
  <defs>
    <linearGradient id="${gradientId}-bg" x1="24" y1="12" x2="222" y2="244" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${escapeXml(p.bgFrom)}" />
      <stop offset="1" stop-color="${escapeXml(p.bgTo)}" />
    </linearGradient>
    <radialGradient id="${gradientId}-halo" cx="46%" cy="34%" r="72%">
      <stop offset="0" stop-color="${escapeXml(p.glow)}" stop-opacity="0.95" />
      <stop offset="1" stop-color="${escapeXml(p.glow)}" stop-opacity="0" />
    </radialGradient>
  </defs>
  <rect x="10" y="10" width="236" height="236" rx="68" fill="url(#${gradientId}-bg)" />
  <rect x="10" y="10" width="236" height="236" rx="68" fill="#ffffff" fill-opacity="0.10" />
  <circle cx="70" cy="54" r="28" fill="#ffffff" fill-opacity="0.26" />
  <circle cx="196" cy="58" r="18" fill="#ffffff" fill-opacity="0.16" />
  <circle cx="208" cy="190" r="22" fill="${escapeXml(p.accent)}" fill-opacity="0.10" />
  <circle cx="46" cy="168" r="10" fill="${escapeXml(p.accent)}" fill-opacity="0.14" />
  <path d="M32 188 C58 166 100 168 126 186 C150 202 188 206 224 188 L224 232 L32 232 Z" fill="#ffffff" fill-opacity="0.14" />
  <circle cx="128" cy="106" r="74" fill="url(#${gradientId}-halo)" />
  <ellipse cx="128" cy="210" rx="58" ry="14" fill="#102030" fill-opacity="0.10" />`;
}

function renderFaceDetails(options = {}) {
  const cx = options.cx ?? 128;
  const cy = options.cy ?? 112;
  const eyeGap = options.eyeGap ?? 18;
  const eyeY = options.eyeY ?? (cy - 2);
  const mouthY = options.mouthY ?? (cy + 18);
  const eyeColor = options.eyeColor || '#31495C';
  const blushColor = options.blushColor || '#F7A5B2';
  const expression = options.expression || 'smile';
  const eyeSize = options.eyeSize ?? 4.6;
  const blushOffset = options.blushOffset ?? 28;
  const leftX = cx - eyeGap;
  const rightX = cx + eyeGap;

  let eyesMarkup = `
    <circle cx="${leftX}" cy="${eyeY}" r="${eyeSize}" fill="${eyeColor}" />
    <circle cx="${rightX}" cy="${eyeY}" r="${eyeSize}" fill="${eyeColor}" />`;
  let mouthMarkup = `<path d="M ${cx - 14} ${mouthY} C ${cx - 6} ${mouthY + 8}, ${cx + 6} ${mouthY + 8}, ${cx + 14} ${mouthY}" fill="none" stroke="${eyeColor}" stroke-width="4" stroke-linecap="round" />`;

  if (expression === 'wink') {
    eyesMarkup = `
      <circle cx="${leftX}" cy="${eyeY}" r="${eyeSize}" fill="${eyeColor}" />
      <path d="M ${rightX - 7} ${eyeY + 1} C ${rightX - 3} ${eyeY - 3}, ${rightX + 3} ${eyeY - 3}, ${rightX + 7} ${eyeY + 1}" fill="none" stroke="${eyeColor}" stroke-width="4" stroke-linecap="round" />`;
  }

  if (expression === 'grin') {
    mouthMarkup = `
      <path d="M ${cx - 17} ${mouthY - 1} C ${cx - 7} ${mouthY + 10}, ${cx + 7} ${mouthY + 10}, ${cx + 17} ${mouthY - 1}" fill="#ffffff" stroke="${eyeColor}" stroke-width="4" stroke-linejoin="round" />
      <path d="M ${cx} ${mouthY + 1} L ${cx} ${mouthY + 8}" stroke="${eyeColor}" stroke-width="3" stroke-linecap="round" />`;
  }

  if (expression === 'wonder') {
    eyesMarkup = `
      <circle cx="${leftX}" cy="${eyeY}" r="${eyeSize + 1.2}" fill="${eyeColor}" />
      <circle cx="${rightX}" cy="${eyeY}" r="${eyeSize + 1.2}" fill="${eyeColor}" />`;
    mouthMarkup = `<circle cx="${cx}" cy="${mouthY + 2}" r="5.8" fill="none" stroke="${eyeColor}" stroke-width="3.6" />`;
  }

  return `
    <circle cx="${cx - blushOffset}" cy="${cy + 16}" r="9" fill="${blushColor}" fill-opacity="0.26" />
    <circle cx="${cx + blushOffset}" cy="${cy + 16}" r="9" fill="${blushColor}" fill-opacity="0.26" />
    ${eyesMarkup}
    <ellipse cx="${cx}" cy="${cy + 9}" rx="3.6" ry="2.8" fill="${eyeColor}" fill-opacity="0.52" />
    ${mouthMarkup}`;
}

function renderAnimalEars(motif, p) {
  if (motif === 'bunny') {
    return `
      <ellipse cx="97" cy="60" rx="15" ry="38" fill="${p.primary}" transform="rotate(-10 97 60)" />
      <ellipse cx="97" cy="64" rx="7" ry="24" fill="${p.secondary}" transform="rotate(-10 97 64)" />
      <ellipse cx="159" cy="60" rx="15" ry="38" fill="${p.primary}" transform="rotate(10 159 60)" />
      <ellipse cx="159" cy="64" rx="7" ry="24" fill="${p.secondary}" transform="rotate(10 159 64)" />`;
  }

  if (motif === 'fox' || motif === 'cat' || motif === 'tiger') {
    return `
      <path d="M 82 94 L 96 54 L 118 86 Z" fill="${p.primary}" />
      <path d="M 97 83 L 101 65 L 111 82 Z" fill="${p.secondary}" />
      <path d="M 174 94 L 160 54 L 138 86 Z" fill="${p.primary}" />
      <path d="M 159 83 L 155 65 L 145 82 Z" fill="${p.secondary}" />`;
  }

  if (motif === 'owl') {
    return `
      <path d="M 94 96 L 100 62 L 118 84 Z" fill="${p.primary}" />
      <path d="M 162 96 L 156 62 L 138 84 Z" fill="${p.primary}" />`;
  }

  if (motif === 'seal') {
    return `
      <circle cx="96" cy="78" r="10" fill="${p.primary}" />
      <circle cx="160" cy="78" r="10" fill="${p.primary}" />`;
  }

  if (motif === 'lion') {
    return `
      <circle cx="92" cy="76" r="15" fill="${p.primary}" />
      <circle cx="164" cy="76" r="15" fill="${p.primary}" />
      <circle cx="92" cy="76" r="7" fill="${p.secondary}" />
      <circle cx="164" cy="76" r="7" fill="${p.secondary}" />`;
  }

  if (motif === 'whale' || motif === 'turtle') {
    return '';
  }

  return `
    <circle cx="92" cy="72" r="18" fill="${p.primary}" />
    <circle cx="92" cy="72" r="8" fill="${p.secondary}" />
    <circle cx="164" cy="72" r="18" fill="${p.primary}" />
    <circle cx="164" cy="72" r="8" fill="${p.secondary}" />`;
}

function renderAnimalBackFeatures(motif, p) {
  if (motif === 'lion') {
    return buildPetalRing(128, 106, 10, 16, 30, 54, p.body, 0, 0.95);
  }

  if (motif === 'squirrel') {
    return `
      <path d="M 176 164 C 208 144, 212 108, 190 92 C 176 82, 154 86, 150 104 C 148 116, 154 126, 166 130 C 150 130, 138 140, 138 158 C 138 170, 146 182, 160 188 Z" fill="${p.accent}" fill-opacity="0.78" />`;
  }

  if (motif === 'whale') {
    return `
      <path d="M 124 50 C 128 28, 138 24, 142 48" fill="none" stroke="${p.accent}" stroke-width="7" stroke-linecap="round" />
      <circle cx="118" cy="42" r="5" fill="${p.accent}" fill-opacity="0.65" />
      <circle cx="148" cy="38" r="4" fill="${p.accent}" fill-opacity="0.52" />`;
  }

  return '';
}

function renderAnimalBody(motif, p) {
  if (motif === 'whale') {
    return `
      <ellipse cx="128" cy="178" rx="62" ry="34" fill="${p.body}" />
      <path d="M 78 176 C 64 166, 60 160, 62 148 C 76 150, 88 160, 90 172 Z" fill="${p.body}" />
      <path d="M 178 176 C 192 166, 196 160, 194 148 C 180 150, 168 160, 166 172 Z" fill="${p.body}" />
      <path d="M 112 192 C 120 178, 136 178, 144 192" fill="none" stroke="${p.accent}" stroke-width="7" stroke-linecap="round" />`;
  }

  if (motif === 'turtle') {
    return `
      <ellipse cx="128" cy="178" rx="56" ry="36" fill="${p.body}" />
      <ellipse cx="128" cy="178" rx="40" ry="26" fill="${p.accent}" fill-opacity="0.28" />
      <circle cx="96" cy="178" r="8" fill="${p.secondary}" fill-opacity="0.55" />
      <circle cx="128" cy="164" r="8" fill="${p.secondary}" fill-opacity="0.55" />
      <circle cx="160" cy="178" r="8" fill="${p.secondary}" fill-opacity="0.55" />
      <circle cx="108" cy="196" r="8" fill="${p.secondary}" fill-opacity="0.55" />
      <circle cx="148" cy="196" r="8" fill="${p.secondary}" fill-opacity="0.55" />`;
  }

  if (motif === 'seal') {
    return `
      <path d="M 84 214 C 86 170, 102 146, 128 146 C 154 146, 170 170, 172 214 Z" fill="${p.body}" />
      <path d="M 94 192 C 80 194, 70 188, 68 176 C 80 176, 90 182, 94 192 Z" fill="${p.body}" />
      <path d="M 162 192 C 176 194, 186 188, 188 176 C 176 176, 166 182, 162 192 Z" fill="${p.body}" />`;
  }

  if (motif === 'owl') {
    return `
      <path d="M 84 214 C 86 170, 102 146, 128 146 C 154 146, 170 170, 172 214 Z" fill="${p.body}" />
      <ellipse cx="90" cy="176" rx="14" ry="26" fill="${p.primary}" fill-opacity="0.88" />
      <ellipse cx="166" cy="176" rx="14" ry="26" fill="${p.primary}" fill-opacity="0.88" />`;
  }

  return `
    <path d="M 76 214 C 78 174, 98 148, 128 148 C 158 148, 178 174, 180 214 Z" fill="${p.body}" />
    <path d="M 92 160 C 110 150, 146 150, 164 160 L 158 180 C 144 174, 112 174, 98 180 Z" fill="${p.accent}" fill-opacity="0.95" />`;
}

function renderAnimalMarkings(motif, p) {
  if (motif === 'panda') {
    return `
      <ellipse cx="108" cy="112" rx="13" ry="16" fill="#344C60" fill-opacity="0.72" />
      <ellipse cx="148" cy="112" rx="13" ry="16" fill="#344C60" fill-opacity="0.72" />
      <ellipse cx="128" cy="134" rx="26" ry="20" fill="${p.secondary}" />`;
  }

  if (motif === 'fox' || motif === 'cat') {
    return `
      <path d="M 92 126 C 104 144, 152 144, 164 126 C 160 150, 146 164, 128 164 C 110 164, 96 150, 92 126 Z" fill="${p.secondary}" />`;
  }

  if (motif === 'tiger') {
    return `
      <path d="M 128 80 L 121 94 L 128 92 L 135 94 Z" fill="${p.accent}" />
      <path d="M 106 88 L 100 98 L 110 96 Z" fill="${p.accent}" fill-opacity="0.82" />
      <path d="M 150 88 L 156 98 L 146 96 Z" fill="${p.accent}" fill-opacity="0.82" />
      <ellipse cx="128" cy="134" rx="26" ry="19" fill="${p.secondary}" />`;
  }

  if (motif === 'owl') {
    return `
      <circle cx="108" cy="112" r="16" fill="${p.secondary}" />
      <circle cx="148" cy="112" r="16" fill="${p.secondary}" />
      <path d="M 128 126 L 120 134 L 136 134 Z" fill="${p.accent}" />`;
  }

  if (motif === 'seal') {
    return `<ellipse cx="128" cy="136" rx="28" ry="18" fill="${p.secondary}" />`;
  }

  if (motif === 'whale') {
    return `<ellipse cx="128" cy="132" rx="30" ry="18" fill="${p.secondary}" />`;
  }

  return `<ellipse cx="128" cy="134" rx="24" ry="18" fill="${p.secondary}" />`;
}

function renderAnimalFrontFeatures(motif, p) {
  if (motif === 'seal' || motif === 'cat' || motif === 'fox') {
    return `
      <path d="M 100 138 H 82" stroke="${p.line}" stroke-width="3" stroke-linecap="round" opacity="0.52" />
      <path d="M 100 144 H 84" stroke="${p.line}" stroke-width="3" stroke-linecap="round" opacity="0.52" />
      <path d="M 156 138 H 174" stroke="${p.line}" stroke-width="3" stroke-linecap="round" opacity="0.52" />
      <path d="M 156 144 H 172" stroke="${p.line}" stroke-width="3" stroke-linecap="round" opacity="0.52" />`;
  }

  return '';
}

function renderAnimal(entry) {
  const p = entry.palette;
  return `
    <g>
      ${renderAnimalBackFeatures(entry.motif, p)}
      ${renderAnimalBody(entry.motif, p)}
      ${renderAnimalEars(entry.motif, p)}
      <circle cx="128" cy="112" r="48" fill="${p.primary}" />
      ${renderAnimalMarkings(entry.motif, p)}
      ${renderFaceDetails({ cx: 128, cy: 114, eyeColor: p.line, expression: entry.expression })}
      ${renderAnimalFrontFeatures(entry.motif, p)}
    </g>`;
}

function renderPlant(entry) {
  const p = entry.palette;
  let bodyMarkup = '';

  if (entry.motif === 'blossom') {
    bodyMarkup = `
      ${buildPetalRing(128, 110, 8, 15, 30, 54, p.primary, 0, 0.96)}
      <circle cx="128" cy="114" r="40" fill="${p.secondary}" />
      <path d="M 82 210 C 86 176, 104 154, 128 154 C 152 154, 170 176, 174 210 Z" fill="${p.body}" />
      <path d="M 98 170 C 110 154, 118 152, 128 164 C 138 152, 146 154, 158 170" fill="none" stroke="${p.accent}" stroke-width="8" stroke-linecap="round" />`;
  }

  if (entry.motif === 'tulip') {
    bodyMarkup = `
      <path d="M 128 64 C 108 80, 102 110, 108 132 C 120 124, 126 116, 128 104 C 130 116, 136 124, 148 132 C 154 110, 148 80, 128 64 Z" fill="${p.primary}" />
      <path d="M 102 88 C 84 94, 74 110, 78 134 C 92 128, 102 116, 108 100 Z" fill="${p.primary}" fill-opacity="0.82" />
      <path d="M 154 88 C 172 94, 182 110, 178 134 C 164 128, 154 116, 148 100 Z" fill="${p.primary}" fill-opacity="0.82" />
      <circle cx="128" cy="122" r="34" fill="${p.secondary}" />
      <path d="M 84 210 C 88 178, 104 156, 128 156 C 152 156, 168 178, 172 210 Z" fill="${p.body}" />
      <path d="M 92 174 C 106 160, 116 160, 128 172 C 140 160, 150 160, 164 174" fill="none" stroke="${p.accent}" stroke-width="8" stroke-linecap="round" />`;
  }

  if (entry.motif === 'sunflower') {
    bodyMarkup = `
      ${buildPetalRing(128, 110, 14, 10, 24, 52, p.primary, 0, 0.96)}
      <circle cx="128" cy="116" r="38" fill="#A97345" fill-opacity="0.92" />
      <circle cx="128" cy="116" r="31" fill="${p.secondary}" />
      <path d="M 84 210 C 88 180, 104 158, 128 158 C 152 158, 168 180, 172 210 Z" fill="${p.body}" />
      <path d="M 92 178 C 104 160, 118 156, 128 168 C 138 156, 152 160, 164 178" fill="none" stroke="${p.accent}" stroke-width="8" stroke-linecap="round" />`;
  }

  if (entry.motif === 'clover') {
    bodyMarkup = `
      <circle cx="108" cy="94" r="24" fill="${p.primary}" />
      <circle cx="148" cy="94" r="24" fill="${p.primary}" />
      <circle cx="108" cy="134" r="24" fill="${p.primary}" />
      <circle cx="148" cy="134" r="24" fill="${p.primary}" />
      <circle cx="128" cy="114" r="34" fill="${p.secondary}" />
      <path d="M 126 142 C 126 156, 120 170, 112 178" fill="none" stroke="${p.accent}" stroke-width="7" stroke-linecap="round" />
      <path d="M 84 210 C 88 178, 104 156, 128 156 C 152 156, 168 178, 172 210 Z" fill="${p.body}" />`;
  }

  if (entry.motif === 'mushroom') {
    bodyMarkup = `
      <path d="M 78 122 C 82 84, 102 62, 128 62 C 154 62, 174 84, 178 122 Z" fill="${p.primary}" />
      <circle cx="102" cy="100" r="8" fill="${p.secondary}" fill-opacity="0.82" />
      <circle cx="154" cy="94" r="7" fill="${p.secondary}" fill-opacity="0.82" />
      <circle cx="128" cy="86" r="6" fill="${p.secondary}" fill-opacity="0.82" />
      <rect x="94" y="118" width="68" height="60" rx="26" fill="${p.secondary}" />
      <path d="M 84 210 C 88 182, 104 160, 128 160 C 152 160, 168 182, 172 210 Z" fill="${p.body}" />`;
  }

  if (entry.motif === 'lily') {
    bodyMarkup = `
      ${buildPetalRing(128, 106, 6, 14, 34, 50, p.primary, 30, 0.92)}
      <circle cx="128" cy="116" r="37" fill="${p.secondary}" />
      <path d="M 84 210 C 88 178, 104 156, 128 156 C 152 156, 168 178, 172 210 Z" fill="${p.body}" />
      <path d="M 98 182 C 106 164, 118 156, 128 168 C 138 156, 150 164, 158 182" fill="none" stroke="${p.accent}" stroke-width="8" stroke-linecap="round" />`;
  }

  if (entry.motif === 'lotus') {
    bodyMarkup = `
      ${buildPetalRing(128, 122, 8, 12, 26, 42, p.primary, 0, 0.88)}
      <path d="M 84 142 C 96 114, 108 100, 128 100 C 148 100, 160 114, 172 142 C 154 138, 142 134, 128 126 C 114 134, 102 138, 84 142 Z" fill="${p.primary}" />
      <circle cx="128" cy="118" r="34" fill="${p.secondary}" />
      <path d="M 84 210 C 88 182, 104 160, 128 160 C 152 160, 168 182, 172 210 Z" fill="${p.body}" />`;
  }

  if (entry.motif === 'sprout') {
    bodyMarkup = `
      <path d="M 120 92 C 108 80, 106 62, 116 52 C 130 56, 136 72, 132 86 Z" fill="${p.primary}" />
      <path d="M 136 92 C 148 80, 150 62, 140 52 C 126 56, 120 72, 124 86 Z" fill="${p.primary}" />
      <ellipse cx="128" cy="124" rx="36" ry="42" fill="${p.secondary}" />
      <path d="M 84 210 C 88 182, 104 160, 128 160 C 152 160, 168 182, 172 210 Z" fill="${p.body}" />
      <path d="M 100 182 C 108 166, 118 160, 128 170 C 138 160, 148 166, 156 182" fill="none" stroke="${p.accent}" stroke-width="8" stroke-linecap="round" />`;
  }

  return `
    <g>
      ${bodyMarkup}
      ${renderFaceDetails({ cx: 128, cy: 120, eyeColor: p.line, expression: entry.expression || 'smile' })}
    </g>`;
}

function renderProduce(entry) {
  const p = entry.palette;
  let shapeMarkup = '';
  let faceY = 124;

  if (entry.motif === 'apple') {
    shapeMarkup = `
      <path d="M 92 88 C 90 68, 108 58, 122 70 C 126 74, 128 78, 128 78 C 128 78, 130 74, 134 70 C 148 58, 166 68, 164 88 C 184 94, 194 112, 194 136 C 194 170, 168 198, 128 198 C 88 198, 62 170, 62 136 C 62 112, 72 94, 92 88 Z" fill="${p.primary}" />
      <path d="M 126 56 C 118 46, 116 34, 122 28 C 132 30, 136 40, 134 52 Z" fill="${p.accent}" fill-opacity="0.5" />
      <path d="M 132 60 C 142 50, 156 48, 166 54 C 162 66, 150 72, 138 70 Z" fill="#79C86D" />`;
      faceY = 128;
  }

  if (entry.motif === 'strawberry') {
    shapeMarkup = `
      <path d="M 128 64 C 156 64, 186 86, 186 118 C 186 164, 154 198, 128 198 C 102 198, 70 164, 70 118 C 70 86, 100 64, 128 64 Z" fill="${p.primary}" />
      <path d="M 104 64 C 112 46, 124 40, 128 52 C 132 40, 144 46, 152 64" fill="#78C86E" stroke="#78C86E" stroke-width="6" stroke-linecap="round" />
      <circle cx="104" cy="112" r="3" fill="#FFF6D8" />
      <circle cx="126" cy="100" r="3" fill="#FFF6D8" />
      <circle cx="148" cy="112" r="3" fill="#FFF6D8" />
      <circle cx="116" cy="136" r="3" fill="#FFF6D8" />
      <circle cx="140" cy="136" r="3" fill="#FFF6D8" />
      <circle cx="128" cy="156" r="3" fill="#FFF6D8" />`;
      faceY = 126;
  }

  if (entry.motif === 'peach') {
    shapeMarkup = `
      <path d="M 128 72 C 154 58, 182 86, 182 126 C 182 168, 152 196, 128 196 C 104 196, 74 168, 74 126 C 74 86, 102 58, 128 72 Z" fill="${p.primary}" />
      <path d="M 128 70 C 114 92, 112 128, 118 184" fill="none" stroke="${p.accent}" stroke-width="5" stroke-linecap="round" fill-opacity="0.4" />
      <path d="M 126 66 C 136 52, 150 48, 160 54 C 156 66, 144 72, 132 72 Z" fill="#82CC71" />`;
      faceY = 126;
  }

  if (entry.motif === 'pear') {
    shapeMarkup = `
      <path d="M 128 68 C 112 68, 98 82, 98 98 C 98 110, 106 118, 110 124 C 88 136, 76 154, 76 174 C 76 196, 96 212, 128 212 C 160 212, 180 196, 180 174 C 180 154, 168 136, 146 124 C 150 118, 158 110, 158 98 C 158 82, 144 68, 128 68 Z" fill="${p.primary}" />
      <path d="M 130 54 C 130 42, 136 34, 146 30" fill="none" stroke="#8B6B4C" stroke-width="6" stroke-linecap="round" />
      <path d="M 132 58 C 142 48, 154 46, 164 52 C 160 64, 148 68, 138 66 Z" fill="#71C66C" />`;
      faceY = 132;
  }

  if (entry.motif === 'carrot') {
    shapeMarkup = `
      <path d="M 128 78 C 156 78, 180 102, 174 126 L 150 202 C 146 214, 110 214, 106 202 L 82 126 C 76 102, 100 78, 128 78 Z" fill="${p.primary}" />
      <path d="M 114 74 C 108 56, 116 44, 126 40" fill="none" stroke="#6FC76B" stroke-width="7" stroke-linecap="round" />
      <path d="M 128 72 C 128 54, 136 42, 146 38" fill="none" stroke="#6FC76B" stroke-width="7" stroke-linecap="round" />
      <path d="M 142 74 C 148 56, 158 48, 170 46" fill="none" stroke="#6FC76B" stroke-width="7" stroke-linecap="round" />`;
      faceY = 128;
  }

  if (entry.motif === 'pumpkin') {
    shapeMarkup = `
      <ellipse cx="128" cy="134" rx="58" ry="54" fill="${p.primary}" />
      <ellipse cx="108" cy="134" rx="24" ry="50" fill="${p.body}" fill-opacity="0.52" />
      <ellipse cx="148" cy="134" rx="24" ry="50" fill="${p.body}" fill-opacity="0.52" />
      <path d="M 128 72 C 126 54, 136 46, 148 48" fill="none" stroke="#7CB96A" stroke-width="7" stroke-linecap="round" />`;
      faceY = 134;
  }

  if (entry.motif === 'corn') {
    shapeMarkup = `
      <rect x="98" y="72" width="60" height="124" rx="30" fill="${p.primary}" />
      <path d="M 98 96 C 82 110, 76 132, 80 168 C 94 166, 104 154, 110 138 Z" fill="#78C46F" />
      <path d="M 158 96 C 174 110, 180 132, 176 168 C 162 166, 152 154, 146 138 Z" fill="#78C46F" />
      <circle cx="116" cy="100" r="4" fill="#FFF5C8" />
      <circle cx="128" cy="100" r="4" fill="#FFF5C8" />
      <circle cx="140" cy="100" r="4" fill="#FFF5C8" />
      <circle cx="116" cy="116" r="4" fill="#FFF5C8" />
      <circle cx="128" cy="116" r="4" fill="#FFF5C8" />
      <circle cx="140" cy="116" r="4" fill="#FFF5C8" />`;
      faceY = 134;
  }

  if (entry.motif === 'broccoli') {
    shapeMarkup = `
      <circle cx="102" cy="104" r="24" fill="${p.primary}" />
      <circle cx="128" cy="90" r="30" fill="${p.primary}" />
      <circle cx="154" cy="104" r="24" fill="${p.primary}" />
      <circle cx="128" cy="118" r="28" fill="${p.primary}" />
      <rect x="112" y="126" width="32" height="64" rx="16" fill="${p.secondary}" />`;
      faceY = 136;
  }

  return `
    <g>
      ${shapeMarkup}
      ${renderFaceDetails({ cx: 128, cy: faceY, eyeColor: p.line, expression: entry.expression || 'smile' })}
    </g>`;
}

function renderSky(entry) {
  const p = entry.palette;
  let shapeMarkup = '';
  let faceOptions = { cx: 128, cy: 122, eyeColor: p.line, expression: entry.expression || 'smile' };

  if (entry.motif === 'cloud') {
    shapeMarkup = `
      <circle cx="98" cy="122" r="28" fill="${p.primary}" />
      <circle cx="128" cy="108" r="34" fill="${p.primary}" />
      <circle cx="158" cy="122" r="28" fill="${p.primary}" />
      <rect x="82" y="122" width="92" height="42" rx="21" fill="${p.primary}" />`;
      faceOptions.cy = 126;
  }

  if (entry.motif === 'moon') {
    shapeMarkup = `
      <circle cx="122" cy="114" r="46" fill="${p.primary}" />
      <circle cx="144" cy="102" r="38" fill="${p.glow}" />
      <circle cx="170" cy="82" r="6" fill="${p.secondary}" fill-opacity="0.92" />
      <circle cx="184" cy="98" r="4" fill="${p.secondary}" fill-opacity="0.82" />`;
      faceOptions = { cx: 112, cy: 122, eyeColor: p.line, expression: 'smile' };
  }

  if (entry.motif === 'star') {
    shapeMarkup = `<path d="${buildStarPath(128, 120, 52, 24)}" fill="${p.primary}" />`;
      faceOptions.cy = 126;
  }

  if (entry.motif === 'rainbow') {
    shapeMarkup = `
      <path d="M 74 144 C 82 96, 102 72, 128 72 C 154 72, 174 96, 182 144" fill="none" stroke="#FF8FA1" stroke-width="12" stroke-linecap="round" />
      <path d="M 86 144 C 92 108, 108 90, 128 90 C 148 90, 164 108, 170 144" fill="none" stroke="#FFD96D" stroke-width="12" stroke-linecap="round" />
      <path d="M 98 144 C 102 120, 114 108, 128 108 C 142 108, 154 120, 158 144" fill="none" stroke="#84D58B" stroke-width="12" stroke-linecap="round" />
      <circle cx="102" cy="150" r="22" fill="${p.primary}" />
      <circle cx="128" cy="146" r="28" fill="${p.primary}" />
      <circle cx="154" cy="150" r="22" fill="${p.primary}" />
      <rect x="92" y="150" width="72" height="26" rx="13" fill="${p.primary}" />`;
      faceOptions.cy = 146;
  }

  if (entry.motif === 'raindrop') {
    shapeMarkup = `
      <path d="M 128 64 C 156 100, 176 126, 176 152 C 176 182, 154 202, 128 202 C 102 202, 80 182, 80 152 C 80 126, 100 100, 128 64 Z" fill="${p.primary}" />
      <path d="M 106 176 C 114 184, 128 188, 144 180" fill="none" stroke="#ffffff" stroke-width="7" stroke-linecap="round" opacity="0.38" />`;
      faceOptions.cy = 136;
  }

  if (entry.motif === 'sun') {
    shapeMarkup = `
      ${buildPetalRing(128, 116, 10, 8, 20, 54, p.accent, 0, 0.9)}
      <circle cx="128" cy="116" r="42" fill="${p.primary}" />`;
      faceOptions.cy = 118;
  }

  if (entry.motif === 'snow') {
    shapeMarkup = `
      <circle cx="128" cy="120" r="42" fill="${p.primary}" />
      <path d="M 128 72 V 96 M 128 144 V 168 M 92 104 L 112 116 M 144 124 L 164 136 M 92 136 L 112 124 M 144 116 L 164 104" stroke="#ffffff" stroke-width="6" stroke-linecap="round" opacity="0.72" />`;
      faceOptions.cy = 124;
  }

  if (entry.motif === 'comet') {
    shapeMarkup = `
      <path d="M 86 154 C 116 132, 146 112, 176 78" fill="none" stroke="${p.accent}" stroke-width="18" stroke-linecap="round" opacity="0.24" />
      <path d="M 98 156 C 120 138, 146 118, 172 88" fill="none" stroke="#ffffff" stroke-width="10" stroke-linecap="round" opacity="0.28" />
      <path d="${buildStarPath(148, 110, 34, 16)}" fill="${p.primary}" />`;
      faceOptions = { cx: 148, cy: 116, eyeColor: p.line, expression: 'wonder', eyeGap: 14, blushOffset: 22 };
  }

  return `
    <g>
      ${shapeMarkup}
      ${renderFaceDetails(faceOptions)}
    </g>`;
}

function renderGuardianHeadwear(motif, p) {
  if (motif === 'scarf' || motif === 'lantern' || motif === 'cape') {
    return `<path d="M 84 118 C 84 78, 102 54, 128 54 C 154 54, 172 78, 172 118 L 160 118 C 160 86, 148 70, 128 70 C 108 70, 96 86, 96 118 Z" fill="${p.primary}" />`;
  }

  if (motif === 'leaf-ranger') {
    return `
      <path d="M 84 112 C 88 84, 106 66, 128 66 C 150 66, 168 84, 172 112 Z" fill="${p.primary}" />
      <path d="M 126 70 C 140 54, 154 48, 166 54 C 160 68, 146 74, 132 76 Z" fill="${p.accent}" />`;
  }

  if (motif === 'star-ranger') {
    return `
      <path d="M 86 96 H 170" stroke="${p.primary}" stroke-width="14" stroke-linecap="round" />
      <path d="${buildStarPath(128, 80, 16, 8)}" fill="${p.accent}" />`;
  }

  if (motif === 'shell-explorer' || motif === 'compass-explorer' || motif === 'dawn-explorer') {
    return `
      <path d="M 82 112 C 84 86, 102 68, 128 68 C 154 68, 172 86, 174 112 L 166 120 C 154 114, 102 114, 90 120 Z" fill="${p.primary}" />
      <path d="M 84 110 C 102 116, 154 116, 172 110" fill="none" stroke="${p.body}" stroke-width="10" stroke-linecap="round" />`;
  }

  if (motif === 'ribbon-elf') {
    return `
      <path d="M 100 74 C 92 60, 88 52, 90 40 C 102 44, 112 54, 116 66 Z" fill="${p.primary}" />
      <path d="M 156 74 C 164 60, 168 52, 166 40 C 154 44, 144 54, 140 66 Z" fill="${p.primary}" />
      <circle cx="128" cy="76" r="12" fill="${p.accent}" />`;
  }

  if (motif === 'acorn-elf') {
    return `
      <ellipse cx="128" cy="82" rx="38" ry="26" fill="${p.primary}" />
      <path d="M 96 76 C 110 58, 146 58, 160 76" fill="none" stroke="${p.accent}" stroke-width="8" stroke-linecap="round" />`;
  }

  if (motif === 'snow-elf') {
    return `
      <path d="M 86 118 C 86 82, 104 58, 128 58 C 152 58, 170 82, 170 118" fill="none" stroke="${p.primary}" stroke-width="18" stroke-linecap="round" />
      <circle cx="92" cy="88" r="10" fill="${p.primary}" />
      <circle cx="164" cy="88" r="10" fill="${p.primary}" />`;
  }

  if (motif === 'moon-elf') {
    return `
      <path d="M 84 110 C 90 82, 108 64, 130 64 C 152 64, 166 78, 172 102 L 166 110 C 154 100, 102 100, 92 110 Z" fill="${p.primary}" />
      <circle cx="154" cy="64" r="10" fill="${p.accent}" />
      <circle cx="158" cy="60" r="8" fill="${p.glow}" />`;
  }

  return '';
}

function renderGuardianAccessory(motif, p) {
  if (motif === 'lantern') {
    return `
      <path d="M 164 128 V 150" stroke="${p.accent}" stroke-width="4" stroke-linecap="round" />
      <rect x="156" y="150" width="16" height="20" rx="5" fill="${p.accent}" />`;
  }

  if (motif === 'shell-explorer') {
    return `<path d="M 152 160 C 160 146, 176 146, 184 160 C 174 164, 162 166, 152 160 Z" fill="${p.accent}" fill-opacity="0.72" />`;
  }

  if (motif === 'compass-explorer') {
    return `
      <circle cx="156" cy="158" r="12" fill="${p.accent}" fill-opacity="0.78" />
      <path d="M 156 150 L 160 160 L 152 160 Z" fill="#ffffff" />`;
  }

  if (motif === 'leaf-ranger') {
    return `<path d="M 152 160 C 160 148, 172 144, 182 150 C 176 164, 164 168, 154 166 Z" fill="${p.accent}" fill-opacity="0.78" />`;
  }

  if (motif === 'star-ranger') {
    return `<path d="${buildStarPath(156, 158, 12, 6)}" fill="${p.accent}" />`;
  }

  if (motif === 'ribbon-elf') {
    return `<path d="M 152 160 C 162 146, 174 146, 184 160 C 172 168, 164 168, 152 160 Z" fill="${p.accent}" fill-opacity="0.72" />`;
  }

  if (motif === 'acorn-elf') {
    return `<ellipse cx="158" cy="160" rx="12" ry="14" fill="${p.accent}" fill-opacity="0.78" />`;
  }

  if (motif === 'dawn-explorer') {
    return `
      <path d="M 148 160 C 156 152, 168 152, 176 160" fill="none" stroke="${p.accent}" stroke-width="6" stroke-linecap="round" />
      <circle cx="162" cy="154" r="6" fill="${p.accent}" />`;
  }

  return '';
}

function renderGuardian(entry) {
  const p = entry.palette;
  return `
    <g>
      <path d="M 74 214 C 78 174, 98 146, 128 146 C 158 146, 178 174, 182 214 Z" fill="${p.body}" />
      <path d="M 92 156 C 106 148, 150 148, 164 156 L 156 176 C 144 172, 112 172, 100 176 Z" fill="${p.accent}" fill-opacity="0.92" />
      ${renderGuardianHeadwear(entry.motif, p)}
      <circle cx="128" cy="112" r="38" fill="${p.skin}" />
      <path d="M 96 108 C 96 84, 110 72, 128 72 C 146 72, 160 84, 160 108 L 160 92 C 154 84, 144 80, 128 80 C 112 80, 102 84, 96 92 Z" fill="${p.hair}" />
      ${renderFaceDetails({ cx: 128, cy: 114, eyeColor: p.line, expression: entry.expression || 'smile', blushColor: '#F7B0B7' })}
      ${renderGuardianAccessory(entry.motif, p)}
    </g>`;
}

function renderEntry(entry, gradientId) {
  if (entry.family === 'animal') {
    return renderAnimal(entry, gradientId);
  }
  if (entry.family === 'plant') {
    return renderPlant(entry, gradientId);
  }
  if (entry.family === 'produce') {
    return renderProduce(entry, gradientId);
  }
  if (entry.family === 'sky') {
    return renderSky(entry, gradientId);
  }
  return renderGuardian(entry, gradientId);
}

function buildSvg(entry) {
  const gradientId = entry.code.replace(/[^a-z0-9]+/giu, '-');
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="256" height="256" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="${gradientId}-title">
  <title id="${gradientId}-title">${escapeXml(entry.name)}</title>
  ${renderBackdrop(entry, gradientId)}
  ${renderEntry(entry, gradientId)}
</svg>
`;
}
function toManifestEntry(entry) {
  return {
    code: entry.code,
    name: entry.name,
    family: entry.family,
    motif: entry.motif,
    category_key: entry.category_key,
    category_name: entry.category_name,
    image_path: entry.image_path,
    sort_order: entry.sort_order
  };
}

function buildManifest() {
  const list = AVATAR_ENTRIES.map(toManifestEntry);
  const categories = Object.keys(CATEGORY_ENTRIES).reduce(function (result, categoryKey) {
    result[categoryKey] = list.filter(function (entry) {
      return entry.category_key === categoryKey;
    });
    return result;
  }, {});

  return {
    version: 2,
    implementation: 'svg',
    collection: 'child-education-avatars-2026-spring',
    generated_at: new Date().toISOString(),
    count: list.length,
    categories,
    list
  };
}

function writeAvatarFiles(entries) {
  entries.forEach(function (entry) {
    const outputPath = path.join(projectRoot, entry.image_path.replace(/^\//u, '').replace(/\//gu, path.sep));
    ensureDir(path.dirname(outputPath));
    fs.writeFileSync(outputPath, buildSvg(entry), 'utf8');
  });
}

function writeManifestFiles(jsonPath, jsPath, manifest) {
  const manifestJson = JSON.stringify(manifest, null, 2);
  fs.writeFileSync(jsonPath, manifestJson, 'utf8');
  fs.writeFileSync(jsPath, `export default ${manifestJson};\n`, 'utf8');
}

function writeGlobalManifestFile(globalPath, manifest) {
  const manifestJson = JSON.stringify(manifest, null, 2);
  fs.writeFileSync(globalPath, `window.__AVATAR_MANIFEST__ = ${manifestJson};\n`, 'utf8');
}

function cleanGeneratedAvatarDirs(rootDir) {
  ['A', 'B', 'C', 'D', 'main'].forEach(function (name) {
    clearDirectory(path.join(rootDir, name));
  });
}

function main() {
  ensureDir(avatarRoot);
  ensureDir(publicAvatarRoot);

  cleanGeneratedAvatarDirs(avatarRoot);
  cleanGeneratedAvatarDirs(publicAvatarRoot);

  const manifest = buildManifest();
  writeManifestFiles(manifestPath, manifestJsPath, manifest);
  writeGlobalManifestFile(manifestGlobalPath, manifest);
  writeAvatarFiles(AVATAR_ENTRIES);

  writeManifestFiles(publicManifestPath, publicManifestJsPath, manifest);
  writeGlobalManifestFile(publicManifestGlobalPath, manifest);
  copyDirContents(path.join(avatarRoot, 'main'), path.join(publicAvatarRoot, 'main'));

  const categorySummary = Object.entries(manifest.categories).map(function ([categoryKey, entries]) {
    return `${categoryKey}:${entries.length}`;
  }).join(', ');

  console.log(`generated ${manifest.count} avatars`);
  console.log(categorySummary);
  console.log(manifestPath);
}

main();





