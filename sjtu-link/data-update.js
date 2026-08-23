/* 交我导桌面版 · 数据在线更新
 * 功能：启动时自动检查 sjtu-links.pages.dev 的数据版本，发现更新自动应用；
 *       页头「更新数据」按钮可手动检查；更新后的数据缓存到 localStorage，
 *       下次启动优先使用（网页视图无法写磁盘，故用本地存储持久化）。
 * 结构：上半部分为纯逻辑（可在 Node 中 require 测试），下半部分为浏览器装配。
 */
(function () {
  'use strict';

  /* ================= 核心纯逻辑（Node 可直接 require 测试） ================= */

  var REMOTE_BASE = 'https://sjtu-links.pages.dev/';
  var REMOTE_FILES = ['\u4EA4\u6211\u5BFC\u6570\u636E.js', '\u4EA4\u6211\u5BFC\u793E\u56E2\u6570\u636E.js'];
  var CACHE_KEY = 'jiaowodao_remote_v1';
  var LOG_KEY = 'jiaowodao_update_log';
  var LOG_MAX = 30;

  /** 用「字符->拼音」映射表为一个条目生成 py/pyi（与离线 pypinyin 字段同格式） */
  function enrichItemWithMap(item, map) {
    if (!item || typeof item !== 'object') return item;
    if (typeof item.py === 'string' && item.py) return item; // 已有拼音字段
    var text = [item.name, item.cat, item.desc].filter(Boolean).join(' ');
    var py = '';
    var pyi = '';
    var chars = String(text).split('');
    for (var i = 0; i < chars.length; i++) {
      var c = chars[i];
      var p = map ? map[c] : undefined;
      if (p) {
        py += p;
        pyi += p.charAt(0);
      } else if (/[a-z0-9]/i.test(c)) {
        py += c.toLowerCase();
        pyi += c.toLowerCase();
      } else if (/\s/.test(c)) {
        // 空白保留（py/pyi 以空格分隔 name/cat/desc 三部分，供整词前缀匹配）
        py += c;
        pyi += c;
      }
      // 其它字符（标点等）忽略
    }
    item.py = py;
    item.pyi = pyi;
    return item;
  }

  function enrichListWithMap(list, map) {
    if (!Array.isArray(list)) return list;
    for (var i = 0; i < list.length; i++) enrichItemWithMap(list[i], map);
    return list;
  }

  /** 版本比较：'2026-07-13' 之类。remote 比 local 新返回 true。 */
  function isNewerVersion(localDate, remoteDate) {
    if (!localDate) return !!remoteDate;
    if (!remoteDate) return false;
    return String(remoteDate) > String(localDate);
  }

  /** 构造缓存对象（含更新后的日期与已增强数据） */
  function buildCache(dataMeta, clubMeta, data, clubs) {
    return {
      savedAt: new Date().toISOString(),
      dataMeta: dataMeta || { updatedAt: '' },
      clubMeta: clubMeta || {},
      data: data || [],
      clubs: clubs || []
    };
  }

  function loadCache() {
    try {
      var raw = (typeof localStorage !== 'undefined' && localStorage.getItem(CACHE_KEY)) || '';
      var c = JSON.parse(raw);
      if (c && Array.isArray(c.data) && c.data.length && Array.isArray(c.clubs)) return c;
      return null;
    } catch (e) {
      return null;
    }
  }

  function saveCache(cache) {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  /* ---------- 更新日志 ---------- */

  function makeLogEntry(t, version, before, after, source) {
    return { t: t, version: version, before: before, after: after, source: source };
  }

  function appendLogEntry(entry, existing) {
    var arr = (Array.isArray(existing) ? existing : []).slice();
    if (entry) arr.push(entry);
    return arr.slice(-LOG_MAX);
  }

  function readUpdateLog() {
    try {
      var raw = (typeof localStorage !== 'undefined' && localStorage.getItem(LOG_KEY)) || '';
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function writeUpdateLog(arr) {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(LOG_KEY, JSON.stringify(arr));
      }
    } catch (e) { /* ignore */ }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      REMOTE_BASE: REMOTE_BASE,
      REMOTE_FILES: REMOTE_FILES,
      CACHE_KEY: CACHE_KEY,
      LOG_KEY: LOG_KEY,
      enrichItemWithMap: enrichItemWithMap,
      enrichListWithMap: enrichListWithMap,
      isNewerVersion: isNewerVersion,
      buildCache: buildCache,
      loadCache: loadCache,
      saveCache: saveCache,
      makeLogEntry: makeLogEntry,
      appendLogEntry: appendLogEntry,
      readUpdateLog: readUpdateLog,
      writeUpdateLog: writeUpdateLog
    };
  }
  if (typeof document === 'undefined') return;
  /* ================= 核心纯逻辑结束 ================= */

  /* ---------- 浏览器端装配 ---------- */
  var pinyinMap = (typeof window !== 'undefined' && window.JIAOWODAO_PINYIN) || {};

  var updateBtn = document.getElementById('update-btn');
  var updateWrap = document.getElementById('update-wrap');
  var checking = false;

  function setButtonText(text) {
    if (updateBtn) updateBtn.textContent = text;
  }

  /** 注入远程数据脚本（经典 script 无跨域限制，无需 CORS） */
  function loadRemoteScripts(onDone) {
    // 防御：远端文件列表为空时不会触发任何 script 回调，
    // 若不提前结束，会令 checkUpdate 的 checking 永久为 true（更新功能卡死）。
    if (!REMOTE_FILES.length) { onDone(null); return; }
    var saved = {
      data: window.JIAOWODAO_DATA,
      meta: window.JIAOWODAO_META,
      clubs: window.JIAOWODAO_CLUB_DATA,
      clubMeta: window.JIAOWODAO_CLUB_META
    };
    var remaining = REMOTE_FILES.length;
    var failed = false;

    function finish() {
      var remote = {
        data: window.JIAOWODAO_DATA,
        meta: window.JIAOWODAO_META,
        clubs: window.JIAOWODAO_CLUB_DATA,
        clubMeta: window.JIAOWODAO_CLUB_META
      };
      // 无论结果如何，先恢复本地数据（是否采用 remote 由调用方决定）
      window.JIAOWODAO_DATA = saved.data;
      window.JIAOWODAO_META = saved.meta;
      window.JIAOWODAO_CLUB_DATA = saved.clubs;
      window.JIAOWODAO_CLUB_META = saved.clubMeta;
      onDone(failed ? null : remote);
    }

    REMOTE_FILES.forEach(function (fname) {
      var s = document.createElement('script');
      s.src = REMOTE_BASE + encodeURIComponent(fname) + '?t=' + Date.now();
      s.async = false;
      s.onload = function () {
        if (--remaining === 0) finish();
      };
      s.onerror = function () {
        failed = true;
        if (--remaining === 0) finish();
      };
      document.head.appendChild(s);
    });
  }

  /** 应用更新：增强拼音 -> 更新全局 -> 缓存 -> 更新日志 -> 重渲染 */
  function applyUpdate(remote, opts) {
    var manual = opts && opts.manual;
    var beforeCount = items.length;
    enrichListWithMap(remote.data, pinyinMap);
    enrichListWithMap(remote.clubs, pinyinMap);

    window.JIAOWODAO_META = remote.meta || { updatedAt: '' };
    window.JIAOWODAO_CLUB_META = remote.clubMeta || {};
    window.JIAOWODAO_DATA = remote.data;
    window.JIAOWODAO_CLUB_DATA = remote.clubs;

    // items 是 const 数组，原地重建
    items.length = 0;
    for (var i = 0; i < remote.data.length; i++) items.push(remote.data[i]);
    for (var j = 0; j < remote.clubs.length; j++) items.push(remote.clubs[j]);
    // baseItems/clubItems 同步（供其它引用）
    baseItems.length = 0;
    clubItems.length = 0;
    for (var k = 0; k < remote.data.length; k++) baseItems.push(remote.data[k]);
    for (var m = 0; m < remote.clubs.length; m++) clubItems.push(remote.clubs[m]);

    // 保存缓存；若 localStorage 写入失败（如配额已满），新数据仅驻留内存，
    // 下次启动会回退到旧缓存。显式提示用户，避免"看似已更新实则未持久化"。
    var cacheSaved = saveCache(buildCache(window.JIAOWODAO_META, window.JIAOWODAO_CLUB_META,
                         remote.data, remote.clubs));
    if (!cacheSaved) showToast(t('updateCacheFail'));

    // 记录更新日志（日期/版本/条数变化/来源）
    writeUpdateLog(appendLogEntry(
      makeLogEntry(new Date().toISOString(),
                   window.JIAOWODAO_META.updatedAt || '',
                   beforeCount, items.length,
                   manual ? 'manual' : 'auto'),
      readUpdateLog()));

    renderChips();
    renderGrid();
    updateCountDisplay();
    updateClubSourceNote();
    var updatedAtEl = document.getElementById('updated-at');
    if (updatedAtEl) {
      updatedAtEl.textContent = window.JIAOWODAO_META.updatedAt || '未标注';
    }

    var date = window.JIAOWODAO_META.updatedAt || '';
    var total = items.length;
    showToast(manual ? t('updateDone', { date: date, count: total })
                     : t('updateAutoDone', { date: date, count: total }));
    document.documentElement.setAttribute('data-update-state', 'updated');
    // 通知个人化模块（收藏条/自定义链接/倒计时）重新挂载
    try {
      document.dispatchEvent(new CustomEvent('jiaowodao:data-updated'));
    } catch (e) { /* ignore */ }
  }

  /** 检查更新入口。manual=true 时给出明确反馈。 */
  function checkUpdate(manual) {
    if (checking) return;
    checking = true;
    if (manual) setButtonText(t('updateChecking'));

    loadRemoteScripts(function (remote) {
      checking = false;
      if (manual) setButtonText(t('updateBtn'));

      if (!remote || !Array.isArray(remote.data) || !remote.data.length) {
        document.documentElement.setAttribute('data-update-state', 'failed');
        if (manual) showToast(t('updateFailed'));
        return;
      }

      var localDate = (window.JIAOWODAO_META && window.JIAOWODAO_META.updatedAt) || '';
      var remoteDate = (remote.meta && remote.meta.updatedAt) || '';
      if (isNewerVersion(localDate, remoteDate)) {
        applyUpdate(remote, { manual: manual });
      } else {
        document.documentElement.setAttribute('data-update-state', 'current');
        if (manual) {
          showToast(localDate ? t('updateCurrent', { date: localDate })
                              : t('updateLocalNewer'));
        }
      }
    });
  }

  if (updateBtn) {
    updateBtn.addEventListener('click', function () { checkUpdate(true); });
    updateBtn.textContent = t('updateBtn');
    if (updateWrap) {
      updateWrap.title = t('updateBtn');
      // 整个边框盒子可点击（点击图标/空白处同样生效，点按钮本身不重复触发）
      updateWrap.addEventListener('click', function (e) {
        if (e.target !== updateBtn) checkUpdate(true);
      });
    }
  }

  // 启动后延迟执行自动检查（等页面入场动画结束）
  setTimeout(function () {
    try {
      checkUpdate(false);
    } catch (e) {
      document.documentElement.setAttribute('data-update-state', 'failed');
    }
  }, 1200);
})();
