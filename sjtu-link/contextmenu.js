/* 交我导桌面版 · 右键卡片菜单（复制标题 / 复制链接 / 复制名称 / 生成二维码）
 * 结构：单文件前端装配。菜单为延迟创建的悬浮 div；
 *       在卡片上右键定位菜单并按当前选中卡片填充条目。
 */
(function () {
  'use strict';
  if (typeof document === 'undefined') return;

  var menu = null;     // 悬浮菜单的 DOM 节点（首次使用时创建）
  var current = null;  // 当前右键命中的卡片信息 { title, link }

  /** HTML 转义，防止标题/链接含特殊字符时破坏 DOM 结构或注入脚本 */
  function escHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /** 复制文本到剪贴板：优先 execCommand，失败时回退 async Clipboard API */
  function copyText(text, label) {
    var ok = false;
    try {
      var input = document.createElement('textarea');
      input.value = text;
      input.style.position = 'fixed';
      input.style.opacity = '0';
      document.body.appendChild(input);
      input.select();
      ok = document.execCommand('copy');
      input.remove();
    } catch (e) { /* ignore */ }
    if (!ok && navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).catch(function () {});
    }
    showToast(t('toastCopied', { name: label || text }));
  }

  /** 隐藏菜单 */
  function hideMenu() {
    if (menu) menu.style.display = 'none';
  }

  /**
   * 在 (x, y) 处弹出针对 card 的菜单。
   * 有链接时提供「复制链接」，无链接（公众号/社团）提供「复制名称」；
   * 始终提供「生成二维码」。
   */
  function openMenu(x, y, card) {
    var nameEl = card.querySelector('.name');
    var title = nameEl ? nameEl.textContent : '';
    var link = card.tagName === 'A' ? card.href : '';
    current = { title: title, link: link };

    var html = '';
    html += '<div class="ctx-item" data-act="title">' + escHtml(t('ctxCopyTitle')) + '</div>';
    if (link) {
      html += '<div class="ctx-item" data-act="link">' + escHtml(t('ctxCopyLink')) + '</div>';
    } else {
      html += '<div class="ctx-item" data-act="name">' + escHtml(t('ctxCopyName')) + '</div>';
    }
    html += '<div class="ctx-item" data-act="qr">' + escHtml(t('qrMenu')) + '</div>';
    menu.innerHTML = html;
    menu.style.display = 'block';
    // 定位：限制在视口内，避免菜单溢出屏幕边缘
    var mw = menu.offsetWidth;
    var mh = menu.offsetHeight;
    menu.style.left = Math.max(8, Math.min(x, window.innerWidth - mw - 8)) + 'px';
    menu.style.top = Math.max(8, Math.min(y, window.innerHeight - mh - 8)) + 'px';
  }

  /** 惰性创建菜单节点并绑定条目点击分发 */
  function ensureMenu() {
    if (menu) return;
    menu = document.createElement('div');
    menu.className = 'ctx-menu';
    menu.style.display = 'none';
    document.body.appendChild(menu);
    menu.addEventListener('click', function (e) {
      var el = e.target.closest ? e.target.closest('.ctx-item') : null;
      if (!el || !current) return;
      var act = el.getAttribute('data-act');
      if (act === 'title') copyText(current.title, current.title);
      else if (act === 'link') copyText(current.link, current.title);
      else if (act === 'name') copyText(current.title, current.title);
      else if (act === 'qr' && window.JWD_QR) {
        window.JWD_QR.show({ title: current.title, url: current.link });
      }
      hideMenu();
    });
  }

  ensureMenu();

  // 在卡片上右键弹出菜单；其它区域右键仅隐藏菜单
  document.addEventListener('contextmenu', function (e) {
    var card = e.target && e.target.closest ? e.target.closest('.card') : null;
    if (!card) {
      hideMenu();
      return;
    }
    e.preventDefault();
    openMenu(e.clientX, e.clientY, card);
  });

  // 任意点击 / 滚动 / Esc 关闭菜单
  document.addEventListener('click', hideMenu);
  window.addEventListener('scroll', hideMenu, true);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') hideMenu();
  });
})();
