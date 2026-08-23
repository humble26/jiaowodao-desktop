/* 交我导桌面版 · 免责声明弹窗
 * 功能：进入软件时弹出免责声明（醒目样式）；弹窗内自带「中文 / EN」语言切换，
 *       默认中文（每次打开重置为中文，与应用整体语言互不影响）；
 *       可勾选「下次启动不再显示」（本地存储）；
 *       页头「更新数据」旁有常驻「免责声明」按钮，页脚亦有入口，随时重开；
 *       「退出应用」按钮桥接桌面壳关闭窗口。
 * 结构：上半部分为纯逻辑（可在 Node 中 require 测试），下半部分为浏览器装配。
 */
(function () {
  'use strict';

  /* ================= 核心纯逻辑 ================= */
  var STORAGE_KEY = 'jiaowodao_disclaimer';

  /** stored === '1' 表示已勾选"不再显示" */
  function shouldShow(stored) {
    return stored !== '1';
  }

  function getStored() {
    try {
      return (typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY)) || '';
    } catch (e) {
      return '';
    }
  }

  function setStored(showNextTime) {
    try {
      if (typeof localStorage !== 'undefined') {
        if (showNextTime) localStorage.removeItem(STORAGE_KEY);
        else localStorage.setItem(STORAGE_KEY, '1');
      }
    } catch (e) { /* ignore */ }
  }

  /** 免责声明文案解析：lang 为 'zh'|'en'，缺失时回退中文 */
  function resolveText(lang, key, dict) {
    var d = dict && (dict[lang] || dict.zh);
    if (d && d[key]) return d[key];
    if (dict && dict.zh && dict.zh[key]) return dict.zh[key];
    return key;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      STORAGE_KEY: STORAGE_KEY,
      shouldShow: shouldShow,
      getStored: getStored,
      setStored: setStored,
      resolveText: resolveText
    };
  }
  if (typeof document === 'undefined') return;
  /* ================= 核心纯逻辑结束 ================= */

  var mask = null;
  var dLang = 'zh'; // 免责声明语言：默认中文

  function dlText(key) {
    return resolveText(dLang, key, typeof i18n !== 'undefined' ? i18n : null);
  }

  /** 富文本渲染安全化：先 HTML 转义，再仅放行白名单标签 <br> 与 <b>/</b>。 */
  function safeRichText(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
      .replace(/&lt;br&gt;/g, '<br>')
      .replace(/&lt;b&gt;/g, '<b>').replace(/&lt;\/b&gt;/g, '</b>');
  }

  function buildModal() {
    mask = document.createElement('div');
    mask.className = 'disclaimer-mask';
    mask.innerHTML =
      '<div class="disclaimer-box" role="dialog" aria-modal="true" aria-labelledby="disclaimer-title">' +
      '<div class="disclaimer-head">' +
      '<h3>' +
      '<svg class="disclaimer-head-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
      '<path d="M12 3 2.8 20h18.4L12 3Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"></path>' +
      '<path d="M12 9.5v4.8" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>' +
      '<circle cx="12" cy="17" r="1.1" fill="currentColor"></circle></svg>' +
      '<span id="disclaimer-title"></span></h3>' +
      '<div class="disclaimer-head-right">' +
      '<div class="dl-langs" role="group" aria-label="Language">' +
      '<button type="button" class="dl-lang" id="dl-lang-zh">\u4E2D\u6587</button>' +
      '<button type="button" class="dl-lang" id="dl-lang-en">EN</button>' +
      '</div>' +
      '<span class="dl-tag" id="disclaimer-tag"></span>' +
      '</div>' +
      '</div>' +
      '<div class="disclaimer-body">' +
      '<div class="disclaimer-alert" id="disclaimer-alert"></div>' +
      '<div id="disclaimer-body-text"></div>' +
      '</div>' +
      '<label class="disclaimer-never">' +
      '<input type="checkbox" id="disclaimer-check">' +
      '<span id="disclaimer-never-label"></span></label>' +
      '<div class="disclaimer-actions">' +
      '<button type="button" class="disclaimer-btn ghost" id="disclaimer-exit"></button>' +
      '<button type="button" class="disclaimer-btn primary" id="disclaimer-agree"></button>' +
      '</div></div>';
    document.body.appendChild(mask);

    document.getElementById('dl-lang-zh').addEventListener('click', function () {
      dLang = 'zh';
      renderModalTexts();
    });
    document.getElementById('dl-lang-en').addEventListener('click', function () {
      dLang = 'en';
      renderModalTexts();
    });

    var checkbox = document.getElementById('disclaimer-check');
    document.getElementById('disclaimer-agree').addEventListener('click', function () {
      setStored(!checkbox.checked); // 勾选 = 下次不再显示
      hide();
    });
    document.getElementById('disclaimer-exit').addEventListener('click', quitApp);

    renderModalTexts();
  }

  function renderModalTexts() {
    if (!mask) return;
    document.getElementById('disclaimer-title').textContent = dlText('disclaimerTitle');
    document.getElementById('disclaimer-tag').textContent = dlText('disclaimerTag');
    document.getElementById('disclaimer-alert').textContent = dlText('disclaimerAlert');
    // 正文先整体转义再仅放行白名单标签（<br> / <b> / </b>），
    // 既保留排版，又杜绝文案注入为 XSS。
    document.getElementById('disclaimer-body-text').innerHTML = safeRichText(dlText('disclaimerBody'));
    document.getElementById('disclaimer-never-label').textContent = dlText('disclaimerNever');
    document.getElementById('disclaimer-exit').textContent = dlText('disclaimerExit');
    document.getElementById('disclaimer-agree').textContent = dlText('disclaimerAgree');
    var zh = document.getElementById('dl-lang-zh');
    var en = document.getElementById('dl-lang-en');
    if (zh) {
      zh.classList.toggle('active', dLang === 'zh');
      zh.setAttribute('aria-pressed', dLang === 'zh' ? 'true' : 'false');
    }
    if (en) {
      en.classList.toggle('active', dLang === 'en');
      en.setAttribute('aria-pressed', dLang === 'en' ? 'true' : 'false');
    }
  }

  function show() {
    if (!mask) buildModal();
    dLang = 'zh'; // 每次打开默认中文
    renderModalTexts();
    mask.classList.add('show');
    var agree = document.getElementById('disclaimer-agree');
    if (agree) agree.focus();
  }

  function hide() {
    if (mask) mask.classList.remove('show');
  }

  function quitApp() {
    // 优先走桌面壳的关闭接口（pywebview）
    try {
      if (window.pywebview && window.pywebview.api && window.pywebview.api.quit_app) {
        window.pywebview.api.quit_app();
        return;
      }
    } catch (e) { /* ignore */ }
    // 浏览器/Edge 应用模式兜底
    try {
      window.close();
    } catch (e) { /* ignore */ }
    setTimeout(function () {
      showToast(t('disclaimerCloseHint'));
    }, 300);
  }

  // 页头「更新数据」旁的常驻入口 + 页脚入口
  var headerBtn = document.getElementById('disclaimer-header-btn');
  var reopen = document.getElementById('disclaimer-reopen');
  if (headerBtn) {
    headerBtn.textContent = t('disclaimerReopen');
    headerBtn.addEventListener('click', show);
    // 整个边框盒子可点击（点击图标/空白处同样生效，点按钮本身不重复触发）
    var disclaimerWrap = document.getElementById('disclaimer-wrap');
    if (disclaimerWrap) {
      disclaimerWrap.addEventListener('click', function (e) {
        if (e.target !== headerBtn) show();
      });
    }
  }
  if (reopen) {
    reopen.textContent = t('disclaimerReopen');
    reopen.addEventListener('click', show);
  }

  // 语言切换时刷新入口文案（弹窗内文案由弹窗自己的切换按钮控制）
  var langSel = document.getElementById('lang-select');
  if (langSel) {
    langSel.addEventListener('change', function () {
      if (headerBtn) headerBtn.textContent = t('disclaimerReopen');
      if (reopen) reopen.textContent = t('disclaimerReopen');
    });
  }

  // 进入软件时弹出
  setTimeout(function () {
    if (shouldShow(getStored())) show();
  }, 400);
})();
