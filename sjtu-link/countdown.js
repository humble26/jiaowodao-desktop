/* 交我导桌面版 · 日程倒计时（考试周 / 假期等）
 * 功能：页面顶部横幅显示距下一个日程的天数；内置公共假期与参考寒暑假，
 *       可在设置中增删（如考试周）；点击横幅打开设置面板。
 * 结构：上半部分为纯逻辑（可在 Node 中 require 测试），下半部分为浏览器装配。
 */
(function () {
  'use strict';

  /* ================= 核心纯逻辑 ================= */
  var EVENTS_KEY = 'jiaowodao_events';
  var LOOKAHEAD_DAYS = 120;

  // 默认日程（公共假期按 2026/2027 农历；寒暑假为参考值，以学校通知为准）
  var DEFAULT_EVENTS = [
    { name: '\u5143\u65e6', date: '2026-01-01' },                 // 元旦
    { name: '\u6625\u8282', date: '2026-02-17' },                 // 春节
    { name: '\u53c2\u8003\u5bd2\u5047', date: '2026-01-26' },     // 参考寒假
    { name: '\u6e05\u660e\u8282', date: '2026-04-05' },           // 清明节
    { name: '\u52b3\u52a8\u8282', date: '2026-05-01' },           // 劳动节
    { name: '\u7aef\u5348\u8282', date: '2026-06-19' },           // 端午节
    { name: '\u53c2\u8003\u6691\u5047', date: '2026-07-06' },     // 参考暑假
    { name: '\u4e2d\u79cb\u8282', date: '2026-09-25' },           // 中秋节
    { name: '\u56fd\u5e86\u8282', date: '2026-10-01' },           // 国庆节
    { name: '\u53c2\u8003\u5bd2\u5047', date: '2027-01-25' },     // 2027 参考寒假
    { name: '\u6625\u8282', date: '2027-02-06' },                 // 2027 春节
    { name: '\u6e05\u660e\u8282', date: '2027-04-05' },           // 2027 清明
    { name: '\u52b3\u52a8\u8282', date: '2027-05-01' },           // 2027 劳动节
    { name: '\u7aef\u5348\u8282', date: '2027-06-09' },           // 2027 端午
    { name: '\u53c2\u8003\u6691\u5047', date: '2027-07-05' },     // 2027 参考暑假
    { name: '\u4e2d\u79cb\u8282', date: '2027-09-15' },           // 2027 中秋
    { name: '\u56fd\u5e86\u8282', date: '2027-10-01' }            // 2027 国庆
  ];

  function daysUntil(dateStr, today) {
    // 用 UTC 归一化计算整日差，避免本地时区/夏令时在跨午夜附近产生 ±1 天偏差
    var parts = String(dateStr || '').split('-').map(Number);
    if (parts.length < 3 || parts.some(isNaN)) return null;
    var y = parts[0], m = parts[1] - 1, d = parts[2];
    var target = Date.UTC(y, m, d);
    // 组件回读校验：Date.UTC 对非法日期（如 2026-99-99 / 2月30日）会静默进位，
    // 回读不一致时按无效日期处理，避免算出一个错误的倒计时天数
    var chk = new Date(target);
    if (chk.getUTCFullYear() !== y || chk.getUTCMonth() !== m || chk.getUTCDate() !== d) return null;
    var t = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
    return Math.round((target - t) / 86400000);
  }

  function nextEvent(events, today, lookahead) {
    var best = null;
    var limit = lookahead || LOOKAHEAD_DAYS;
    for (var i = 0; i < events.length; i++) {
      var days = daysUntil(events[i].date, today);
      if (days === null) continue;
      if (days < 0) continue; // 只考虑今天及未来的日程
      if (days > limit) continue;
      if (best === null || days < best.days) {
        best = { event: events[i], days: days };
      }
    }
    return best;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      EVENTS_KEY: EVENTS_KEY,
      DEFAULT_EVENTS: DEFAULT_EVENTS,
      daysUntil: daysUntil,
      nextEvent: nextEvent
    };
  }
  if (typeof document === 'undefined') return;
  /* ================= 核心纯逻辑结束 ================= */

  var listeners = [];
  var bannerEl = null;

  function emitChanged() {
    for (var i = 0; i < listeners.length; i++) {
      try { listeners[i](); } catch (e) { /* ignore */ }
    }
  }

  function loadEvents() {
    try {
      var raw = (typeof localStorage !== 'undefined' && localStorage.getItem(EVENTS_KEY)) || '';
      if (!raw) {
        // 首次：写入默认日程
        saveEvents(DEFAULT_EVENTS.slice());
        return DEFAULT_EVENTS.slice();
      }
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : DEFAULT_EVENTS.slice();
    } catch (e) {
      return DEFAULT_EVENTS.slice();
    }
  }

  function saveEvents(arr) {
    try { if (typeof localStorage !== 'undefined') localStorage.setItem(EVENTS_KEY, JSON.stringify(arr)); } catch (e) { /* ignore */ }
  }

  function addEvent(name, date) {
    var n = String(name || '').trim();
    var d = String(date || '').trim();
    if (!n || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return { ok: false, error: 'invalid' };
    var arr = loadEvents();
    arr.push({ name: n, date: d });
    saveEvents(arr);
    renderBanner();
    emitChanged();
    return { ok: true };
  }

  function removeEvent(date, name) {
    var arr = loadEvents().filter(function (e) {
      return !(e.date === date && e.name === name);
    });
    saveEvents(arr);
    renderBanner();
    emitChanged();
  }

  function resetEvents() {
    saveEvents(DEFAULT_EVENTS.slice());
    renderBanner();
    emitChanged();
  }

  function escHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function renderBanner() {
    if (!bannerEl) return;
    var found = nextEvent(loadEvents(), new Date());
    if (!found) {
      bannerEl.style.display = 'none';
      return;
    }
    bannerEl.style.display = '';
    var text;
    if (found.days === 0) {
      text = t('countdownToday', { name: found.event.name });
    } else {
      text = t('countdownNext', {
        name: found.event.name, date: found.event.date, days: found.days
      });
    }
    bannerEl.innerHTML =
      '<span class="cd-icon">\uD83D\uDCC5</span>' +
      '<span class="cd-text">' + escHtml(text) + '</span>' +
      '<span class="cd-hint">' + escHtml(t('countdownClick')) + '</span>';
  }

  function ensureBanner() {
    if (bannerEl) return bannerEl;
    bannerEl = document.createElement('div');
    bannerEl.className = 'countdown-banner';
    bannerEl.id = 'countdown-banner';
    var tabs = document.querySelector('.type-tabs');
    if (tabs && tabs.parentNode) {
      tabs.parentNode.insertBefore(bannerEl, tabs);
    } else {
      document.body.appendChild(bannerEl);
    }
    bannerEl.addEventListener('click', function () {
      try {
        document.dispatchEvent(new CustomEvent('jiaowodao:open-settings'));
      } catch (e) { /* ignore */ }
    });
    return bannerEl;
  }

  document.addEventListener('jiaowodao:data-updated', renderBanner);

  // 语言切换时刷新横幅文案
  var langSel = document.getElementById('lang-select');
  if (langSel) {
    langSel.addEventListener('change', renderBanner);
  }

  window.JWD_COUNTDOWN = {
    getEvents: loadEvents,
    addEvent: addEvent,
    removeEvent: removeEvent,
    resetEvents: resetEvents,
    onChanged: function (cb) { listeners.push(cb); }
  };

  ensureBanner();
  renderBanner();
})();
