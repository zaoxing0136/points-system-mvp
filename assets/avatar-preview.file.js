(function () {
  if (window.location.protocol !== 'file:' || !window.FileAvatarPreview) {
    return;
  }

  const CATEGORY_LABELS = {
    animals: '动物伙伴',
    plant_sprites: '花灵与植物',
    produce_pals: '蔬果伙伴',
    sky_friends: '云月星元素',
    little_guardians: '小守护者'
  };

  const manifest = window.FileAvatarPreview.manifest || { categories: {}, list: [] };
  const resolveAvatarAssetUrl = window.FileAvatarPreview.resolveAvatarAssetUrl;
  const meta = document.getElementById('previewMeta');
  const root = document.getElementById('previewRoot');

  if (!meta || !root) {
    return;
  }

  meta.innerHTML = [
    '<span>实现方式：程序化 SVG</span>',
    '<span>角色总数：' + manifest.list.length + '</span>',
    '<span>分类数：' + Object.keys(manifest.categories || {}).length + '</span>',
    '<span>当前模式：本地双击预览</span>'
  ].join('');

  root.innerHTML = Object.keys(manifest.categories || {}).map(function (categoryKey) {
    const entries = manifest.categories[categoryKey] || [];
    return '\n    <section class="section">\n      <div class="section-head">\n        <h2>' + (CATEGORY_LABELS[categoryKey] || categoryKey) + '</h2>\n        <span>' + entries.length + ' 个角色</span>\n      </div>\n      <div class="grid">' + entries.map(function (entry) {
      return '\n        <article class="card">\n          <img src="' + encodeURI(resolveAvatarAssetUrl(entry.image_path)) + '" alt="' + entry.name + '" loading="lazy" />\n          <strong>' + entry.name + '</strong>\n          <small>' + entry.code + '</small>\n        </article>\n      ';
    }).join('') + '</div>\n    </section>\n  ';
  }).join('');
})();
