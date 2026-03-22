import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const avatarRoot = path.join(projectRoot, 'assets', 'avatars');
const publicAvatarRoot = path.join(projectRoot, 'public', 'assets', 'avatars');
const manifestPath = path.join(avatarRoot, 'avatar-library.manifest.json');

function decodeText(source) {
  return JSON.parse('"' + source + '"');
}

function emoji(codePoint) {
  return String.fromCodePoint(codePoint);
}

function ensureDir(targetPath) {
  fs.mkdirSync(targetPath, { recursive: true });
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

function createEntry(code, name, ageGroup, genderGroup, imagePath, visualType, symbol, accent, palette) {
  return {
    code: decodeText(code),
    name: decodeText(name),
    age_group: ageGroup,
    gender_group: genderGroup,
    image_path: decodeText(imagePath),
    visual_type: decodeText(visualType),
    symbol,
    accent_symbol: accent,
    palette
  };
}

const library = {
  A: {
    boy: [
      createEntry('A_boy_001_\u5c0f\u718a\u56e2\u5b50', '\u5c0f\u718a\u56e2\u5b50', 'A', 'boy', '/assets/avatars/A/boy/A_boy_001_\u5c0f\u718a\u56e2\u5b50.svg', '\u52a8\u7269', emoji(0x1F43B), emoji(0x1F36A), ['#fff1de', '#ffd5b2', '#ffb58d']),
      createEntry('A_boy_002_\u5c0f\u72ee\u5e03\u5e03', '\u5c0f\u72ee\u5e03\u5e03', 'A', 'boy', '/assets/avatars/A/boy/A_boy_002_\u5c0f\u72ee\u5e03\u5e03.svg', '\u52a8\u7269', emoji(0x1F981), '\u2600\uFE0F', ['#fff0bf', '#ffd68d', '#ffb45f']),
      createEntry('A_boy_003_\u5c0f\u9f99\u679c\u679c', '\u5c0f\u9f99\u679c\u679c', 'A', 'boy', '/assets/avatars/A/boy/A_boy_003_\u5c0f\u9f99\u679c\u679c.svg', '\u52a8\u7269', emoji(0x1F996), '\u2728', ['#ecffbf', '#b6f08a', '#84d97a']),
      createEntry('A_boy_004_\u5c0f\u72d0\u8df3\u8df3', '\u5c0f\u72d0\u8df3\u8df3', 'A', 'boy', '/assets/avatars/A/boy/A_boy_004_\u5c0f\u72d0\u8df3\u8df3.svg', '\u52a8\u7269', emoji(0x1F98A), emoji(0x1F343), ['#fff0dc', '#ffc593', '#ff9b6b']),
      createEntry('A_boy_005_\u5c0f\u7f8a\u7ef5\u7ef5', '\u5c0f\u7f8a\u7ef5\u7ef5', 'A', 'boy', '/assets/avatars/A/boy/A_boy_005_\u5c0f\u7f8a\u7ef5\u7ef5.svg', '\u52a8\u7269', emoji(0x1F411), '\u2601\uFE0F', ['#fff9ea', '#ffe3c8', '#ffd1b3']),
      createEntry('A_boy_006_\u5c0f\u72d7\u8c46\u8c46', '\u5c0f\u72d7\u8c46\u8c46', 'A', 'boy', '/assets/avatars/A/boy/A_boy_006_\u5c0f\u72d7\u8c46\u8c46.svg', '\u52a8\u7269', emoji(0x1F436), emoji(0x1F9B4), ['#fff0dd', '#ffd4b3', '#ffb38d']),
      createEntry('A_boy_007_\u82f9\u679c\u78b0\u78b0', '\u82f9\u679c\u78b0\u78b0', 'A', 'boy', '/assets/avatars/A/boy/A_boy_007_\u82f9\u679c\u78b0\u78b0.svg', '\u6c34\u679c', emoji(0x1F34E), emoji(0x1F343), ['#ffe7dc', '#ffb59f', '#ff8c78']),
      createEntry('A_boy_008_\u7389\u7c73\u58ee\u58ee', '\u7389\u7c73\u58ee\u58ee', 'A', 'boy', '/assets/avatars/A/boy/A_boy_008_\u7389\u7c73\u58ee\u58ee.svg', '\u852c\u83dc', emoji(0x1F33D), emoji(0x1F33F), ['#fff3c9', '#ffe17f', '#ffcb57']),
      createEntry('A_boy_009_\u5357\u74dc\u7403\u7403', '\u5357\u74dc\u7403\u7403', 'A', 'boy', '/assets/avatars/A/boy/A_boy_009_\u5357\u74dc\u7403\u7403.svg', '\u852c\u83dc', emoji(0x1F383), emoji(0x1F342), ['#ffe7cc', '#ffc67c', '#ff9d56']),
      createEntry('A_boy_010_\u5c0f\u82bd\u82bd', '\u5c0f\u82bd\u82bd', 'A', 'boy', '/assets/avatars/A/boy/A_boy_010_\u5c0f\u82bd\u82bd.svg', '\u690d\u7269', emoji(0x1F331), '\u2728', ['#f0ffd6', '#c8f29e', '#8fdc87']),
      createEntry('A_boy_011_\u4e91\u56e2\u56e2', '\u4e91\u56e2\u56e2', 'A', 'boy', '/assets/avatars/A/boy/A_boy_011_\u4e91\u56e2\u56e2.svg', '\u5929\u6c14', '\u2601\uFE0F', emoji(0x1F4AB), ['#f4f4ff', '#d8e6ff', '#bdd2ff']),
      createEntry('A_boy_012_\u661f\u661f\u95ea\u95ea', '\u661f\u661f\u95ea\u95ea', 'A', 'boy', '/assets/avatars/A/boy/A_boy_012_\u661f\u661f\u95ea\u95ea.svg', '\u661f\u661f', '\u2B50', emoji(0x1F451), ['#fff9c8', '#ffe886', '#ffd35e'])
    ],
    girl: [
      createEntry('A_girl_001_\u5c0f\u5154\u8393\u8393', '\u5c0f\u5154\u8393\u8393', 'A', 'girl', '/assets/avatars/A/girl/A_girl_001_\u5c0f\u5154\u8393\u8393.svg', '\u52a8\u7269', emoji(0x1F430), emoji(0x1F353), ['#fff5e7', '#ffd8f0', '#ffc5d7']),
      createEntry('A_girl_002_\u5c0f\u9e7f\u7cd6\u7cd6', '\u5c0f\u9e7f\u7cd6\u7cd6', 'A', 'girl', '/assets/avatars/A/girl/A_girl_002_\u5c0f\u9e7f\u7cd6\u7cd6.svg', '\u52a8\u7269', emoji(0x1F98C), emoji(0x1F33C), ['#fff1de', '#ffd9be', '#ffc2a7']),
      createEntry('A_girl_003_\u5c0f\u6843\u6ce1\u6ce1', '\u5c0f\u6843\u6ce1\u6ce1', 'A', 'girl', '/assets/avatars/A/girl/A_girl_003_\u5c0f\u6843\u6ce1\u6ce1.svg', '\u6c34\u679c', emoji(0x1F351), '\u2728', ['#ffeef1', '#ffd2db', '#ffb9c9']),
      createEntry('A_girl_004_\u8349\u8393\u751c\u751c', '\u8349\u8393\u751c\u751c', 'A', 'girl', '/assets/avatars/A/girl/A_girl_004_\u8349\u8393\u751c\u751c.svg', '\u6c34\u679c', emoji(0x1F353), '\uD83C\uDF38', ['#fff0f3', '#ffcddd', '#ffb2c7']),
      createEntry('A_girl_005_\u5c0f\u732b\u871c\u871c', '\u5c0f\u732b\u871c\u871c', 'A', 'girl', '/assets/avatars/A/girl/A_girl_005_\u5c0f\u732b\u871c\u871c.svg', '\u52a8\u7269', emoji(0x1F431), emoji(0x1F337), ['#fff7ef', '#ffe0cf', '#ffd2c2']),
      createEntry('A_girl_006_\u82b1\u82b1\u7075\u7075', '\u82b1\u82b1\u7075\u7075', 'A', 'girl', '/assets/avatars/A/girl/A_girl_006_\u82b1\u82b1\u7075\u7075.svg', '\u7cbe\u7075', emoji(0x1F9DA), '\uD83C\uDF38', ['#fff3ff', '#e6d8ff', '#cfe9af']),
      createEntry('A_girl_007_\u5c0f\u8611\u83c7\u6735\u6735', '\u5c0f\u8611\u83c7\u6735\u6735', 'A', 'girl', '/assets/avatars/A/girl/A_girl_007_\u5c0f\u8611\u83c7\u6735\u6735.svg', '\u690d\u7269', emoji(0x1F344), '\u2728', ['#fff4df', '#ffd1d4', '#dff4c8']),
      createEntry('A_girl_008_\u6a31\u6843\u5575\u5575', '\u6a31\u6843\u5575\u5575', 'A', 'girl', '/assets/avatars/A/girl/A_girl_008_\u6a31\u6843\u5575\u5575.svg', '\u6c34\u679c', emoji(0x1F352), emoji(0x1F496), ['#fff8d7', '#ffd7df', '#ffc1ca']),
      createEntry('A_girl_009_\u5c0f\u6708\u4eae\u67d4\u67d4', '\u5c0f\u6708\u4eae\u67d4\u67d4', 'A', 'girl', '/assets/avatars/A/girl/A_girl_009_\u5c0f\u6708\u4eae\u67d4\u67d4.svg', '\u5929\u6c14', emoji(0x1F319), '\u2B50', ['#f0ebff', '#d9d1ff', '#bed8ff']),
      createEntry('A_girl_010_\u5c0f\u4e91\u6735\u68c9\u68c9', '\u5c0f\u4e91\u6735\u68c9\u68c9', 'A', 'girl', '/assets/avatars/A/girl/A_girl_010_\u5c0f\u4e91\u6735\u68c9\u68c9.svg', '\u5929\u6c14', '\u2601\uFE0F', emoji(0x1F308), ['#f6f4ff', '#dff3ff', '#d5ddff']),
      createEntry('A_girl_011_\u82b1\u9e7f\u9732\u9732', '\u82b1\u9e7f\u9732\u9732', 'A', 'girl', '/assets/avatars/A/girl/A_girl_011_\u82b1\u9e7f\u9732\u9732.svg', '\u52a8\u7269', emoji(0x1F98C), emoji(0x1F337), ['#fff7df', '#ffe4b8', '#ffd0c2']),
      createEntry('A_girl_012_\u8461\u8404\u557e\u557e', '\u8461\u8404\u557e\u557e', 'A', 'girl', '/assets/avatars/A/girl/A_girl_012_\u8461\u8404\u557e\u557e.svg', '\u6c34\u679c', emoji(0x1F347), '\u2728', ['#f5ebff', '#e1d0ff', '#d0b7ff'])
    ]
  },
  B: { boy: [], girl: [] },
  C: { boy: [], girl: [] }
};

const list = Object.values(library).flatMap((group) => Object.values(group).flatMap((entries) => entries));

function getPrimaryLabel(entry) {
  const cleaned = String(entry.name || '').replace(/^小/u, '').trim();
  return cleaned.charAt(0) || '星';
}

function getAccentLabel(entry) {
  const cleaned = String(entry.name || '').replace(/^小/u, '').trim();
  return cleaned.charAt(1) || String(entry.visual_type || '').trim().charAt(0) || 'A';
}

function buildSvg(entry) {
  const [colorA, colorB, colorC] = entry.palette;
  const primaryLabel = escapeXml(getPrimaryLabel(entry));
  const accentLabel = escapeXml(getAccentLabel(entry));
  const typeLabel = escapeXml(String(entry.visual_type || '').trim().slice(0, 2) || '成长');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="256" height="256" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="20" y1="16" x2="228" y2="240" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${escapeXml(colorA)}" />
      <stop offset="0.56" stop-color="${escapeXml(colorB)}" />
      <stop offset="1" stop-color="${escapeXml(colorC)}" />
    </linearGradient>
  </defs>
  <rect x="10" y="10" width="236" height="236" rx="68" fill="url(#bg)" />
  <rect x="10" y="10" width="236" height="236" rx="68" fill="#ffffff" fill-opacity="0.12" />
  <circle cx="76" cy="60" r="28" fill="#ffffff" fill-opacity="0.26" />
  <circle cx="196" cy="52" r="18" fill="#ffffff" fill-opacity="0.20" />
  <circle cx="206" cy="194" r="44" fill="#ffffff" fill-opacity="0.22" />
  <ellipse cx="122" cy="142" rx="78" ry="74" fill="#ffffff" fill-opacity="0.30" />
  <ellipse cx="122" cy="142" rx="60" ry="56" fill="#ffffff" fill-opacity="0.46" />
  <text x="122" y="164" text-anchor="middle" font-size="88" font-weight="700" fill="#24314d" font-family="'Microsoft YaHei', 'PingFang SC', 'Noto Sans SC', sans-serif">${primaryLabel}</text>
  <g transform="translate(180 180)">
    <circle cx="28" cy="28" r="28" fill="#ffffff" fill-opacity="0.92" />
    <circle cx="28" cy="28" r="21" fill="#ffffff" fill-opacity="0.66" />
    <text x="28" y="35" text-anchor="middle" font-size="24" font-weight="700" fill="#24314d" font-family="'Microsoft YaHei', 'PingFang SC', 'Noto Sans SC', sans-serif">${accentLabel}</text>
  </g>
  <g transform="translate(28 190)">
    <rect x="0" y="0" width="66" height="28" rx="14" fill="#ffffff" fill-opacity="0.74" />
    <text x="33" y="19" text-anchor="middle" font-size="13" font-weight="700" fill="#3a4967" font-family="'Microsoft YaHei', 'PingFang SC', 'Noto Sans SC', sans-serif">${typeLabel}</text>
  </g>
</svg>
`;
}for (const ageGroup of Object.keys(library)) {
  for (const genderGroup of Object.keys(library[ageGroup])) {
    ensureDir(path.join(avatarRoot, ageGroup, genderGroup));
  }
}

for (const entry of list) {
  const outputPath = path.join(projectRoot, entry.image_path.replace(/^\//u, '').replace(/\//gu, path.sep));
  ensureDir(path.dirname(outputPath));
  fs.writeFileSync(outputPath, buildSvg(entry), 'utf8');
}

fs.writeFileSync(manifestPath, JSON.stringify({ library, list }, null, 2), 'utf8');
fs.rmSync(publicAvatarRoot, { recursive: true, force: true });
copyDirContents(avatarRoot, publicAvatarRoot);
console.log('generated', list.length, 'avatars');
console.log(manifestPath);





