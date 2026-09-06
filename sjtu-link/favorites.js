/* 交我导桌面版 · 个人化模块：收藏夹（星标）/ 自定义链接 / 使用统计 / 常用排序
 * 结构：上半部分为纯逻辑（可在 Node 中 require 测试），下半部分为浏览器装配。
 */
(function () {
  'use strict';

  /* ================= 核心纯逻辑 ================= */
  var FAVS_KEY = 'jiaowodao_favs';
  var STATS_KEY = 'jiaowodao_use_stats';
  var CUSTOM_KEY = 'jiaowodao_custom_links';
  var SORT_KEY = 'jiaowodao_sort_enabled';
  var CUSTOM_CAT = { zh: '\u81ea\u5b9a\u4e49', en: 'Custom' }; // 自定义 / Custom

  function identityOf(item) {
    return item && item.name ? String(item.name) : '';
  }

  function toggleFavPure(list, key) {
    var arr = (Array.isArray(list) ? list : []).slice();
    var i = arr.indexOf(key);
    if (i >= 0) arr.splice(i, 1);
    else arr.push(key);
    return arr;
  }

  function bumpStatPure(stats, key) {
    var s = {};
    for (var k in stats) { if (Object.prototype.hasOwnProperty.call(stats, k)) s[k] = stats[k]; }
    s[key] = (s[key] || 0) + 1;
    return s;
  }

  function sortByStatsPure(items, stats) {
    // 同分时以名称做 tiebreaker，保证排序稳定性，
    // 避免未进快照的自定义链接比较器违反传递性导致顺序不定。
    return (items || []).slice().sort(function (a, b) {
      var d = ((stats && stats[b.name]) || 0) - ((stats && stats[a.name]) || 0);
      if (d !== 0) return d;
      return (a.name < b.name ? -1 : (a.name > b.name ? 1 : 0));
    });
  }

  function normalizeCustomUrl(url) {
    var t = String(url || '').trim();
    if (!t) return '';
    if (!/^https?:\/\//i.test(t)) t = 'https://' + t;
    if (!/^https?:\/\/[^\s]+\.[^\s]+/i.test(t)) return '';
    return t;
  }

  function customItem(name, url) {
    return {
      name: name, url: url,
      cat: CUSTOM_CAT.zh, cat_en: CUSTOM_CAT.en,
      type: 'website', desc: '', desc_en: '',
      custom: true, py: '', pyi: ''
    };
  }

  function enrichWithMap(item, map) {
    if (!item || typeof item !== 'object') return item;
    if (typeof item.py === 'string' && item.py) return item;
    var text = [item.name, item.cat, item.desc].filter(Boolean).join(' ');
    var py = '';
    var pyi = '';
    var chars = String(text).split('');
    for (var i = 0; i < chars.length; i++) {
      var c = chars[i];
      var p = map ? map[c] : undefined;
      if (p) { py += p; pyi += p.charAt(0); }
      else if (/[a-z0-9]/i.test(c)) { py += c.toLowerCase(); pyi += c.toLowerCase(); }
      else if (/\s/.test(c)) { py += c; pyi += c; }
    }
    item.py = py;
    item.pyi = pyi;
    return item;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      FAVS_KEY: FAVS_KEY, STATS_KEY: STATS_KEY, CUSTOM_KEY: CUSTOM_KEY, SORT_KEY: SORT_KEY,
      identityOf: identityOf,
      toggleFavPure: toggleFavPure,
      bumpStatPure: bumpStatPure,
      sortByStatsPure: sortByStatsPure,
      normalizeCustomUrl: normalizeCustomUrl,
      customItem: customItem,
      enrichWithMap: enrichWithMap
    };
  }
  if (typeof document === 'undefined') return;
  /* ================= 核心纯逻辑结束 ================= */

  var pinyinMap = (typeof window !== 'undefined' && window.JIAOWODAO_PINYIN) || {};
  var listeners = [];
  var sideEl = null;
  var customRefs = []; // 已并入 items 的自定义条目引用

  function emitChanged() {
    for (var i = 0; i < listeners.length; i++) {
      try { listeners[i](); } catch (e) { /* ignore */ }
    }
  }

  function loadFavs() {
    try {
      var arr = JSON.parse((typeof localStorage !== 'undefined' && localStorage.getItem(FAVS_KEY)) || '[]');
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }

  function saveFavs(arr) {
    try { if (typeof localStorage !== 'undefined') localStorage.setItem(FAVS_KEY, JSON.stringify(arr)); } catch (e) { /* ignore */ }
  }

  function loadStats() {
    try {
      var s = JSON.parse((typeof localStorage !== 'undefined' && localStorage.getItem(STATS_KEY)) || '{}');
      return s && typeof s === 'object' ? s : {};
    } catch (e) { return {}; }
  }

  function saveStats(s) {
    try { if (typeof localStorage !== 'undefined') localStorage.setItem(STATS_KEY, JSON.stringify(s)); } catch (e) { /* ignore */ }
  }

  function loadCustom() {
    try {
      var arr = JSON.parse((typeof localStorage !== 'undefined' && localStorage.getItem(CUSTOM_KEY)) || '[]');
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }

  function saveCustom(arr) {
    try { if (typeof localStorage !== 'undefined') localStorage.setItem(CUSTOM_KEY, JSON.stringify(arr)); } catch (e) { /* ignore */ }
  }

  function getSortEnabled() {
    try {
      return (typeof localStorage !== 'undefined' && localStorage.getItem(SORT_KEY)) === '1';
    } catch (e) { return false; }
  }

  function setSortEnabled(on) {
    try { if (typeof localStorage !== 'undefined') localStorage.setItem(SORT_KEY, on ? '1' : '0'); } catch (e) { /* ignore */ }
    applySort();
    renderGrid(); // 排序后立即重绘网格
    emitChanged();
  }

  /* ---------- 排序 ---------- */
  var baseOrder = null;

  function snapshotOrder() {
    baseOrder = [];
    for (var i = 0; i < items.length; i++) baseOrder.push(items[i].name);
  }

  function applySort() {
    if (getSortEnabled()) {
      var stats = loadStats();
      var sorted = sortByStatsPure(items, stats);
      items.length = 0;
      for (var i = 0; i < sorted.length; i++) items.push(sorted[i]);
    } else if (baseOrder) {
      var order = {};
      for (var j = 0; j < baseOrder.length; j++) {
        if (!(baseOrder[j] in order)) order[baseOrder[j]] = j;
      }
      items.sort(function (a, b) {
        var ia = order[a.name];
        var ib = order[b.name];
        if (ia === undefined && ib === undefined) {
          // 均未进快照（通常是自定义链接）：退回名称比较，保证稳定
          return (a.name < b.name ? -1 : (a.name > b.name ? 1 : 0));
        }
        if (ia === undefined) return 1;
        if (ib === undefined) return -1;
        return ia - ib;
      });
    }
  }

  /* ---------- 自定义链接 ---------- */
  function syncCustom() {
    // 移除旧的并入项
    for (var i = 0; i < customRefs.length; i++) {
      var idx = items.indexOf(customRefs[i]);
      if (idx >= 0) items.splice(idx, 1);
    }
    customRefs = [];
    var list = loadCustom();
    for (var j = 0; j < list.length; j++) {
      var it = enrichWithMap(customItem(list[j].name, list[j].url), pinyinMap);
      customRefs.push(it);
      items.push(it);
    }
    applySort();
  }

  function addCustom(name, url) {
    var n = String(name || '').trim();
    var u = normalizeCustomUrl(url);
    if (!n || !u) return { ok: false, error: 'invalid' };
    var list = loadCustom();
    list.push({ name: n, url: u, addedAt: new Date().toISOString() });
    saveCustom(list);
    syncCustom();
    renderGrid(); // 走包装后的 renderGrid（含装饰）
    emitChanged();
    return { ok: true };
  }

  function removeCustom(name) {
    var list = loadCustom().filter(function (c) { return c.name !== name; });
    saveCustom(list);
    syncCustom();
    renderGrid();
    emitChanged();
  }

  /* ---------- 收藏 ---------- */
  /** 判断 name 是否已收藏 */
  function isFav(name) {
    return loadFavs().indexOf(name) >= 0;
  }

  /** 切换 name 的收藏状态：更新焦点列表、重绘星标与侧栏并通知模块变化 */
  function toggleFav(name) {
    if (!name) return;
    var arr = toggleFavPure(loadFavs(), name);
    saveFavs(arr);
    updateStars();
    renderSide();
    emitChanged();
    showToast(isFav(name) ? t('favAdded', { name: name }) : t('favRemoved', { name: name }));
  }

  /* ---------- 统计 ---------- */
  /** 为 name 的使用次数 +1（供「常用优先」排序使用） */
  function bumpStat(name) {
    if (!name) return;
    saveStats(bumpStatPure(loadStats(), name));
  }

  /* ---------- 卡片星标装饰 ---------- */
  /** 为尚未装饰的卡片注入星标按钮，并同步收藏状态 */
  function decorateGrid() {
    var cards = document.querySelectorAll('#grid .card');
    for (var i = 0; i < cards.length; i++) {
      var card = cards[i];
      if (card.querySelector('.card-star')) continue;
      // 优先用卡片 data-name（中文原名）作为收藏键，避免界面语言切换后失配
      var name = card.getAttribute('data-name');
      if (!name) {
        var nameEl = card.querySelector('.name');
        name = nameEl ? nameEl.textContent : '';
      }
      // 网站卡片本身是 <a>，内部嵌 <button> 属无效 HTML，故用 span[role=button]
      var star = document.createElement('span');
      star.className = 'card-star';
      star.setAttribute('role', 'button');
      star.setAttribute('tabindex', '0');
      star.title = t('favAdd');
      star.setAttribute('aria-label', t('favAdd'));
      star.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.6l2.5 5.1 5.6.8-4 4 .9 5.6-5-2.7-5 2.7.9-5.6-4-4 5.6-.8L12 3.6Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" fill="none"/></svg>';
      star.setAttribute('data-name', name);
      star.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        toggleFav(this.getAttribute('data-name'));
      });
      star.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          toggleFav(this.getAttribute('data-name'));
        }
      });
      var top = card.querySelector('.top');
      if (top) top.appendChild(star);
      else card.appendChild(star);
    }
    updateStars();
  }

  /** 依据收藏列表统一刷新所有卡片的星标高亮与提示文案 */
  function updateStars() {
    var favs = loadFavs();
    var stars = document.querySelectorAll('#grid .card-star');
    for (var i = 0; i < stars.length; i++) {
      var on = favs.indexOf(stars[i].getAttribute('data-name')) >= 0;
      stars[i].classList.toggle('on', on);
      stars[i].title = t(on ? 'favRemove' : 'favAdd');
    }
  }

  /* ---------- 收藏侧边栏 ---------- */

  /** 侧栏默认展开；用户收起后存 localStorage 以便下次保持 */
  function sideOpen() {
    try {
      return (typeof localStorage !== 'undefined' && localStorage.getItem('jiaowodao_fav_side_open')) !== '0';
    } catch (e) {
      return true;
    }
  }

  /** 展开/收起侧栏并写入本地偏好 */
  function setSideOpen(open) {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('jiaowodao_fav_side_open', open ? '1' : '0');
      }
    } catch (e) { /* ignore */ }
    if (sideEl) sideEl.classList.toggle('open', open);
  }

  /** 惰性创建侧栏 DOM 并绑定展开/收起按钮；返回侧栏节点 */
  function ensureSide() {
    if (sideEl) return sideEl;
    sideEl = document.createElement('aside');
    sideEl.className = 'fav-side';
    sideEl.id = 'fav-side';
    sideEl.innerHTML =
      '<button type="button" class="fav-tab" id="fav-tab" title="' + escHtml(t('favExpand')) + '">' +
      '<span class="star">\u2605</span><span class="fav-tab-text"></span></button>' +
      '<div class="fav-panel" id="fav-panel">' +
      '<div class="fav-head">' +
      '<span class="fav-head-title"><span class="star">\u2605</span><span id="fav-title"></span></span>' +
      '<span class="fav-count" id="fav-count">0</span>' +
      '<button type="button" class="fav-collapse" id="fav-collapse" title="' + escHtml(t('favCollapse')) + '">\u203A</button>' +
      '</div>' +
      '<div class="fav-list" id="fav-list"></div>' +
      '<div class="fav-empty" id="fav-empty" hidden></div>' +
      '</div>';
    document.body.appendChild(sideEl);
    document.getElementById('fav-tab').addEventListener('click', function () { setSideOpen(true); });
    document.getElementById('fav-collapse').addEventListener('click', function () { setSideOpen(false); });
    var tabText = sideEl.querySelector('.fav-tab-text');
    if (tabText) tabText.textContent = t('favStripTitle');
    document.getElementById('fav-title').textContent = t('favStripTitle');
    sideEl.classList.toggle('open', sideOpen());
    return sideEl;
  }

  function copyText(text, label) {
    try {
      var input = document.createElement('textarea');
      input.value = text;
      input.style.position = 'fixed';
      input.style.opacity = '0';
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      input.remove();
    } catch (e) { /* ignore */ }
    showToast(t('toastCopied', { name: label || text }));
  }

  function renderSide() {
    var el = ensureSide();
    var favs = loadFavs();
    var listEl = document.getElementById('fav-list');
    var emptyEl = document.getElementById('fav-empty');
    document.getElementById('fav-count').textContent = String(favs.length);
    if (!favs.length) {
      listEl.innerHTML = '';
      emptyEl.hidden = false;
      emptyEl.innerHTML = '<span class="star">\u2606</span>' + escHtml(t('favSideEmpty'));
      return;
    }
    emptyEl.hidden = true;
    // 一次性建立名称索引，避免逐项线性查找
    var byName = {};
    for (var n = 0; n < items.length; n++) byName[items[n].name] = items[n];
    var html = '';
    for (var i = 0; i < favs.length; i++) {
      var it = byName[favs[i]];
      if (!it) continue;
      var badge = it.type === 'wechat' ? t('tabs')[2] : it.type === 'club' ? t('tabs')[3] : t('tabs')[1];
      var avatarBg = it.type === 'wechat' ? '#267843' : it.type === 'club' ? '#d8b66a' : (it.custom ? '#6f0922' : '#9d1233');
      var avatarColor = it.type === 'club' ? '#5a3d06' : '#ffffff';
      // 键为中文原名，显示名随界面语言
      var displayName = (typeof getItemName === 'function') ? getItemName(it) : it.name;
      var first = (String(displayName).trim().charAt(0) || '?').toUpperCase();
      var inner =
        '<span class="fav-avatar" style="background:' + avatarBg + ';color:' + avatarColor + '">' + escHtml(first) + '</span>' +
        '<span class="fav-name">' + escHtml(displayName) + '</span>' +
        '<span class="badge' + (it.type === 'wechat' ? ' wechat' : it.type === 'club' ? ' club' : '') + '">' + escHtml(badge) + '</span>';
      // 交互元素不允许互相嵌套（<a> 内不可放 <button>），
      // 故外层为容器 div，内部分别为「直达链接/标题」与「删除按钮」两个兄弟节点。
      var linkAttr = it.url
        ? '<a class="fav-link" href="' + escHtml(it.url) + '" target="_blank" rel="noopener noreferrer">' + inner + '</a>'
        : '<span class="fav-link" title="' + escHtml(t('favCopyHint')) + '">' + inner + '</span>';
      html += '<div class="fav-item" data-name="' + escHtml(it.name) + '">' +
        linkAttr +
        '<button type="button" class="fav-del" title="' + escHtml(t('favRemove')) + '">&times;</button></div>';
    }
    listEl.innerHTML = html;
    var byName2 = byName;
    var itemEls = listEl.querySelectorAll('.fav-item');
    for (var k = 0; k < itemEls.length; k++) {
      (function (itemEl) {
        itemEl.addEventListener('click', function (e) {
          if (e.target.classList.contains('fav-del')) return;
          var found = byName2[itemEl.getAttribute('data-name')];
          if (!found) return;
          if (found.url) {
            bumpStat(found.name); // 侧边栏打开同样计入使用统计
            // 若点击落在容器空白处（非链接本身），代为触发内部直达链接
            var link = itemEl.querySelector('.fav-link');
            if (link && link.tagName === 'A' && e.target !== link && !link.contains(e.target)) {
              link.click();
            }
          } else {
            e.preventDefault();
            copyText(found.name, found.name);
          }
        });
        var del = itemEl.querySelector('.fav-del');
        if (del) {
          del.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            toggleFav(itemEl.getAttribute('data-name'));
          });
        }
      })(itemEls[k]);
    }
  }

  function escHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---------- 统计点击 ---------- */
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href^="http"]') : null;
    if (!a) return;
    var card = a.closest ? a.closest('.card') : null;
    if (!card) return;
    // 以 data-name（中文原名）计数，避免界面语言切换导致统计分裂
    var name = card.getAttribute('data-name');
    if (!name) {
      var nameEl = card.querySelector('.name');
      name = nameEl ? nameEl.textContent : '';
    }
    if (name) bumpStat(name);
  });

  /* ---------- 包装 renderGrid 实现装饰钩子 ---------- */
  var origRenderGrid = window.renderGrid;
  window.renderGrid = function () {
    if (typeof origRenderGrid === 'function') origRenderGrid();
    decorateGrid();
  };

  /* ---------- 语言切换：刷新侧边栏与星标提示 ---------- */
  var langSel = document.getElementById('lang-select');
  if (langSel) {
    langSel.addEventListener('change', function () {
      renderSide();
      updateStars();
    });
  }

  /* ---------- 数据更新后重挂载 ---------- */
  document.addEventListener('jiaowodao:data-updated', function () {
    syncCustom();
    snapshotOrder();
    renderGrid();
    renderSide();
  });

  /* ---------- 对外 API（设置面板使用） ---------- */
  window.JWD_PERSONAL = {
    getFavs: loadFavs,
    isFav: isFav,
    toggleFav: toggleFav,
    getCustom: loadCustom,
    addCustom: addCustom,
    removeCustom: removeCustom,
    getStats: loadStats,
    bumpStat: bumpStat,
    getSortEnabled: getSortEnabled,
    setSortEnabled: setSortEnabled,
    onChanged: function (cb) { listeners.push(cb); }
  };

  /* ---------- 旧数据迁移 ---------- */
  // 历史版本曾以「界面语言显示名」作为收藏/统计键（英文界面下写入 name_en），
  // 现统一为中文原名 item.name；此处把已存储的英文键归一并合并重复项。
  function buildNameLookup() {
    var lookup = {};
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (it && it.name && it.name_en && it.name_en !== it.name) lookup[it.name_en] = it.name;
    }
    return lookup;
  }

  function migrateStoredKeys() {
    try {
      var lookup = buildNameLookup();
      var favs = loadFavs(), favsChanged = false;
      for (var i = 0; i < favs.length; i++) {
        var c = lookup[favs[i]];
        if (c && c !== favs[i]) { favs[i] = c; favsChanged = true; }
      }
      if (favsChanged) {
        var uniq = [];
        for (var j = 0; j < favs.length; j++) {
          if (uniq.indexOf(favs[j]) < 0) uniq.push(favs[j]);
        }
        saveFavs(uniq);
      }
      var stats = loadStats(), merged = {}, statsChanged = false;
      for (var k in stats) {
        if (!Object.prototype.hasOwnProperty.call(stats, k)) continue;
        var ck = lookup[k] || k;
        merged[ck] = (merged[ck] || 0) + (stats[k] || 0);
        if (ck !== k) statsChanged = true;
      }
      if (statsChanged) saveStats(merged);
    } catch (e) { /* ignore */ }
  }

  /* ---------- 初始化 ---------- */
  migrateStoredKeys();
  snapshotOrder();
  syncCustom();
  renderGrid(); // 走包装（装饰星标）
  renderSide();
})();
