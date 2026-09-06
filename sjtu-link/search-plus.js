/* 交我导桌面版 · 搜索增强
 * 功能：热门直达预选栏 / 输入联想下拉 / 搜索历史 / URL 直达 / Ctrl+K、/ 快捷键
 * 结构：上半部分为纯逻辑（可在 Node 中 require 测试），下半部分为浏览器 UI 装配。
 */
(function () {
  'use strict';

  /* ================= 核心纯逻辑（Node 可直接 require 测试） ================= */

  var SEARCH_PRESETS = [
    { zh: '选课', en: 'Course', q: '选课' },
    { zh: '成绩', en: 'Grades', q: '成绩' },
    { zh: 'jAccount', en: 'jAccount', q: 'jaccount' },
    { zh: '图书馆', en: 'Library', q: '图书馆' },
    { zh: 'VPN', en: 'VPN', q: 'vpn' },
    { zh: '交大邮箱', en: 'Email', q: '邮箱' },
    { zh: '校园地图', en: 'Campus Map', q: '地图' },
    { zh: '后勤服务', en: 'Logistics', q: '后勤' },
    { zh: '就业', en: 'Careers', q: '就业' },
    { zh: '招生', en: 'Admissions', q: '招生' }
  ];

  var HISTORY_KEY = 'jiaowodao_search_history';
  var HISTORY_MAX = 10;
  var SUGGEST_LIMIT = 8;

  /** 英文单词首字母缩写："SJTU Official Website" -> "sjtuow" */
  function enInitials(text) {
    var words = String(text || '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
    var out = '';
    for (var i = 0; i < words.length; i++) out += words[i][0];
    return out;
  }

  /** 参与搜索的文本：中文名 / 英文名 / 分类 / 说明 / 公众号名 / QQ / 拼音 / 拼音首字母 / 英文缩写 */
  function searchItemText(item) {
    var parts = [
      item.name, item.name_en, item.cat, item.cat_en, item.desc, item.desc_en,
      item.wechatName,
      Array.isArray(item.qqGroups) ? item.qqGroups.join(' ') : '',
      item.py, item.pyi,
      enInitials(item.name_en)
    ];
    return parts.filter(Boolean).join(' ').toLowerCase();
  }

  /** 条目搜索索引缓存：字段不可变，首次计算后复用，显著加快逐键打分 */
  function getItemIndex(item) {
    if (item && item._idx) return item._idx;
    var idx = {
      name: String(item.name || '').toLowerCase(),
      nameEn: String(item.name_en || '').toLowerCase(),
      wechat: String(item.wechatName || '').toLowerCase(),
      py: String(item.py || '').toLowerCase(),
      pyi: String(item.pyi || '').toLowerCase(),
      cat: (String(item.cat || '') + ' ' + String(item.cat_en || '')).toLowerCase(),
      desc: (String(item.desc || '') + ' ' + String(item.desc_en || '')).toLowerCase(),
      qq: (Array.isArray(item.qqGroups) ? item.qqGroups.join(' ') : '').toLowerCase(),
      enInit: enInitials(item.name_en)
    };
    if (item && typeof item === 'object') item._idx = idx;
    return idx;
  }

  /** 查询与条目的匹配得分；0 表示不匹配。数值越大越靠前。 */
  function scoreItem(item, q) {
    var idx = getItemIndex(item);
    var name = idx.name;
    var nameEn = idx.nameEn;
    var wechat = idx.wechat;
    var py = idx.py;
    var pyi = idx.pyi;
    var cat = idx.cat;
    var desc = idx.desc;
    var qq = idx.qq;
    var enInit = idx.enInit;

    // 拼音按"词"切分（py/pyi 中空格分隔 name/cat/desc 三部分）：
    // 查询是某个词拼音（或首字母）的前缀时给高分，如 jwc、tsg、xk
    var pyWords = py.split(/\s+/).filter(Boolean);
    var pyiWords = pyi.split(/\s+/).filter(Boolean);
    var pyWordPrefix = false;
    var pyiWordPrefix = false;
    for (var i = 0; i < pyWords.length; i++) {
      if (pyWords[i].indexOf(q) === 0) { pyWordPrefix = true; break; }
    }
    for (var j = 0; j < pyiWords.length; j++) {
      if (pyiWords[j].indexOf(q) === 0) { pyiWordPrefix = true; break; }
    }

    var s = 0;
    if (name === q) s = 60;
    else if (name.indexOf(q) === 0) s = 50;
    else if (name.indexOf(q) > 0) s = 42;
    if (!s && nameEn === q) s = 34;
    else if (!s && nameEn.indexOf(q) === 0) s = 52; // 拉丁查询：英文名前缀优先
    else if (!s && nameEn.indexOf(q) > 0) s = 26;
    if (!s && pyWordPrefix) s = 32;
    if (!s && pyiWordPrefix) s = 28;
    if (!s && py === q) s = 36;
    else if (!s && py.indexOf(q) === 0) s = 32;
    else if (!s && py.indexOf(q) > 0) s = 26;
    if (!s && pyi.indexOf(q) === 0) s = 28;
    else if (!s && pyi.indexOf(q) > 0) s = 20;
    if (!s && enInit.indexOf(q) === 0) s = 22;
    else if (!s && enInit.indexOf(q) > 0) s = 16;
    if (!s && wechat.indexOf(q) >= 0) s = 14;
    if (!s && qq.indexOf(q) >= 0) s = 10;
    if (!s && cat.indexOf(q) >= 0) s = 8;
    if (!s && desc.indexOf(q) >= 0) s = 5;
    // 同分时保持数据原始顺序（数据即作者精心排序的目录）
    return s;
  }

  /** 返回前 limit 条建议，按得分降序。 */
  function getSuggestions(allItems, q, limit) {
    var ql = String(q || '').trim().toLowerCase();
    if (!ql) return [];
    var scored = [];
    for (var i = 0; i < allItems.length; i++) {
      var s = scoreItem(allItems[i], ql);
      if (s > 0) scored.push({ item: allItems[i], score: s });
    }
    scored.sort(function (a, b) { return b.score - a.score; });
    return scored.slice(0, limit || SUGGEST_LIMIT);
  }

  /** 输入看起来像网址（含域名）时给出"在浏览器打开"直达项 */
  function isUrlLike(q) {
    var t = String(q || '').trim();
    if (/^https?:\/\/\S+$/i.test(t)) return true;
    return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+(\/\S*)?$/i.test(t) && t.indexOf('.') >= 0;
  }

  function normalizeUrl(q) {
    var t = String(q || '').trim();
    return /^https?:\/\//i.test(t) ? t : 'https://' + t;
  }

  function loadHistory() {
    try {
      var raw = (typeof localStorage !== 'undefined' && localStorage.getItem(HISTORY_KEY)) || '';
      var arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return [];
      return arr.filter(function (x) { return typeof x === 'string' && x; });
    } catch (e) { return []; }
  }

  function saveHistory(q) {
    var t = String(q || '').trim();
    if (!t) return;
    try {
      var arr = loadHistory().filter(function (x) { return x !== t; });
      arr.unshift(t);
      arr = arr.slice(0, HISTORY_MAX);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(arr));
      }
    } catch (e) { /* ignore */ }
  }

  function clearHistory() {
    try {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(HISTORY_KEY);
    } catch (e) { /* ignore */ }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      SEARCH_PRESETS: SEARCH_PRESETS,
      enInitials: enInitials,
      searchItemText: searchItemText,
      scoreItem: scoreItem,
      getSuggestions: getSuggestions,
      isUrlLike: isUrlLike,
      normalizeUrl: normalizeUrl,
      loadHistory: loadHistory,
      saveHistory: saveHistory,
      clearHistory: clearHistory
    };
  }
  if (typeof document === 'undefined') return;
  /* ================= 核心纯逻辑结束 ================= */

  /* ---------- 浏览器端 UI 装配 ---------- */
  var input = document.getElementById('search');
  var clearBtn = document.getElementById('clear-search');
  var suggestEl = document.getElementById('suggest');
  var presetLabelEl = document.getElementById('preset-label');
  var presetChipsEl = document.getElementById('preset-chips');

  var suggestItems = [];
  var activeIdx = -1;

  function escHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function openBrowser(url) {
    try {
      if (window.pywebview && window.pywebview.api && window.pywebview.api.open_url) {
        window.pywebview.api.open_url(url);
      } else {
        window.open(url, '_blank');
      }
    } catch (e) {
      window.open(url, '_blank');
    }
  }

  function closeSuggest() {
    suggestEl.hidden = true;
    suggestEl.innerHTML = '';
    suggestItems = [];
    activeIdx = -1;
  }

  function highlightName(item, q) {
    var name = currentLang === 'en' && item.name_en ? item.name_en : item.name;
    var low = String(name).toLowerCase();
    var i = low.indexOf(q);
    if (i >= 0) {
      return escHtml(name.slice(0, i)) + '<b class="hl">' +
        escHtml(name.slice(i, i + q.length)) + '</b>' + escHtml(name.slice(i + q.length));
    }
    return escHtml(name);
  }

  function badgeFor(item) {
    if (item.type === 'wechat') return '<span class="badge wechat">' + escHtml(t('tabs')[2]) + '</span>';
    if (item.type === 'club') return '<span class="badge club">' + escHtml(t('tabs')[3]) + '</span>';
    return '<span class="badge">' + escHtml(t('tabs')[1]) + '</span>';
  }

  function itemCatLabel(item) {
    return currentLang === 'en' && item.cat_en ? item.cat_en : item.cat;
  }

  function buildSuggest() {
    var q = input.value.trim();
    suggestItems = [];
    activeIdx = -1;
    var html = '';

    if (!q) {
      var hist = loadHistory();
      if (hist.length) {
        html += '<div class="suggest-sec"><span>' + escHtml(t('histTitle')) + '</span>' +
          '<button type="button" class="suggest-clear" id="suggest-clear-history">' +
          escHtml(t('histClear')) + '</button></div>';
        hist.forEach(function (h, idx) {
          html += '<div class="suggest-item" role="option" data-idx="' + idx + '">' +
            '<span class="suggest-icon">\uD83D\uDD58</span>' +
            '<span class="suggest-name">' + escHtml(h) + '</span>' +
            '<span class="suggest-cat">' + escHtml(t('histTitle')) + '</span></div>';
          suggestItems.push({ kind: 'history', q: h });
        });
      } else {
        html += '<div class="suggest-empty">' + escHtml(t('histEmpty')) + '</div>' +
          '<div class="suggest-empty suggest-hint">' + escHtml(t('keyHint')) + '</div>';
      }
      openSuggest(html);
      return;
    }

    var ql = q.toLowerCase();
    if (isUrlLike(q)) {
      var url = normalizeUrl(q);
      html += '<div class="suggest-sec"><span>' + escHtml(t('urlOpen')) + '</span></div>' +
        '<div class="suggest-item" role="option" data-idx="' + suggestItems.length + '">' +
        '<span class="suggest-icon">\uD83C\uDF10</span>' +
        '<span class="suggest-url">' + escHtml(url) + '</span></div>';
      suggestItems.push({ kind: 'url', url: url });
    }

    var matches = getSuggestions(items, ql, SUGGEST_LIMIT);
    if (matches.length) {
      html += '<div class="suggest-sec"><span>' + escHtml(t('suggTitle')) + '</span></div>';
      matches.forEach(function (m) {
        var it = m.item;
        var idx = suggestItems.length;
        html += '<div class="suggest-item" role="option" data-idx="' + idx + '">' +
          '<span class="suggest-name">' + highlightName(it, ql) + '</span>' +
          badgeFor(it) +
          '<span class="suggest-cat">' + escHtml(itemCatLabel(it)) + '</span></div>';
        suggestItems.push({ kind: 'item', item: it });
      });
    }

    if (!suggestItems.length) {
      html += '<div class="suggest-empty">' + escHtml(t('empty')) + '</div>';
    }
    openSuggest(html);
  }

  function openSuggest(html) {
    suggestEl.innerHTML = html;
    suggestEl.hidden = false;
    var els = suggestEl.querySelectorAll('.suggest-item');
    if (els.length) {
      activeIdx = 0;
      els[0].classList.add('active');
    }
    var clearHist = document.getElementById('suggest-clear-history');
    if (clearHist) {
      clearHist.addEventListener('click', function (e) {
        e.stopPropagation();
        clearHistory();
        buildSuggest();
      });
    }
  }

  function moveActive(delta) {
    var els = suggestEl.querySelectorAll('.suggest-item');
    if (!els.length) return;
    if (activeIdx < 0) activeIdx = 0;
    activeIdx = (activeIdx + delta + els.length) % els.length;
    for (var i = 0; i < els.length; i++) els[i].classList.toggle('active', i === activeIdx);
    els[activeIdx].scrollIntoView({ block: 'nearest' });
  }

  function activateActive() {
    var it = suggestItems[activeIdx];
    if (!it) return;
    if (it.kind === 'url') {
      openBrowser(it.url);
      closeSuggest();
    } else if (it.kind === 'history') {
      commitQuery(it.q);
    } else if (it.kind === 'item') {
      commitQuery(getItemName(it.item));
    }
  }

  function commitQuery(q) {
    var t = String(q || '').trim();
    input.value = t;
    query = t.toLowerCase();
    clearBtn.hidden = !query;
    visibleCount = 0;
    renderGrid();
    updateCountDisplay();
    saveHistory(t);
    closeSuggest();
  }

  function renderPresets() {
    if (!presetLabelEl || !presetChipsEl) return;
    presetLabelEl.textContent = t('presetLabel');
    presetChipsEl.innerHTML = '';
    SEARCH_PRESETS.forEach(function (p) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'preset-chip';
      btn.textContent = currentLang === 'en' ? p.en : p.zh;
      btn.title = p.q;
      btn.addEventListener('click', function () {
        commitQuery(p.q);
        input.focus();
      });
      presetChipsEl.appendChild(btn);
    });
  }

  function renderSearchUI() {
    renderPresets();
    closeSuggest();
  }
  window.renderSearchUI = renderSearchUI;

  /* ---------- 事件 ---------- */
  input.addEventListener('input', buildSuggest);
  input.addEventListener('focus', buildSuggest);
  // 清空按钮：程序化清空不会触发 input 事件，需手动关闭残留下拉
  if (clearBtn) {
    clearBtn.addEventListener('click', function () {
      closeSuggest();
    });
  }

  input.addEventListener('keydown', function (e) {
    var open = !suggestEl.hidden;
    if (open && e.key === 'ArrowDown') { e.preventDefault(); moveActive(1); }
    else if (open && e.key === 'ArrowUp') { e.preventDefault(); moveActive(-1); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (open && suggestItems.length) {
        activateActive();
      } else if (input.value.trim()) {
        commitQuery(input.value.trim());
      }
    } else if (open && e.key === 'Escape') {
      closeSuggest();
    }
  });

  suggestEl.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('.suggest-item') : null;
    if (!el) return;
    var idx = parseInt(el.getAttribute('data-idx'), 10);
    if (!isNaN(idx) && suggestItems[idx]) {
      activeIdx = idx;
      activateActive();
    }
  });

  document.addEventListener('click', function (e) {
    if (suggestEl.hidden) return;
    if (suggestEl.contains(e.target) || e.target === input ||
        (clearBtn && clearBtn.contains(e.target))) return;
    closeSuggest();
  });

  document.addEventListener('keydown', function (e) {
    var k = String(e.key || '');
    if ((e.ctrlKey || e.metaKey) && k.toLowerCase() === 'k') {
      e.preventDefault();
      input.focus();
      input.select();
      return;
    }
    var tag = (e.target && e.target.tagName) || '';
    var editable = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' ||
      (e.target && e.target.isContentEditable);
    if (k === '/' && !editable) {
      e.preventDefault();
      input.focus();
      input.select();
    }
  });

  renderPresets();
})();
