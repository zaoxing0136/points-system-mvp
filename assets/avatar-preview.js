import { AVATAR_CATEGORIES, AVATAR_LIBRARY_LIST, resolveAvatarAssetUrl } from './avatar-library.js';

const CATEGORY_LABELS = {
  animals: '动物伙伴',
  plant_sprites: '花灵与植物',
  produce_pals: '蔬果伙伴',
  sky_friends: '云月星元素',
  little_guardians: '小守护者'
};

function createCard(entry) {
  return `
    <article class="card">
      <img src="${encodeURI(resolveAvatarAssetUrl(entry.image_path))}" alt="${entry.name}" loading="lazy" />
      <strong>${entry.name}</strong>
      <small>${entry.code}</small>
    </article>
  `;
}

const meta = document.getElementById('previewMeta');
const root = document.getElementById('previewRoot');

meta.innerHTML = [
  '<span>实现方式：程序化 SVG</span>',
  `<span>角色总数：${AVATAR_LIBRARY_LIST.length}</span>`,
  `<span>分类数：${Object.keys(AVATAR_CATEGORIES).length}</span>`
].join('');

root.innerHTML = Object.entries(AVATAR_CATEGORIES).map(function ([categoryKey, entries]) {
  return `
    <section class="section">
      <div class="section-head">
        <h2>${CATEGORY_LABELS[categoryKey] || categoryKey}</h2>
        <span>${entries.length} 个角色</span>
      </div>
      <div class="grid">
        ${entries.map(createCard).join('')}
      </div>
    </section>
  `;
}).join('');
