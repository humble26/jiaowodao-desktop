/* 交我导桌面版 · 二维码分享
 * 功能：生成当前卡片链接（或名称）的二维码，手机扫码直达；可下载 PNG 图片。
 * 依赖：qrcode.js（MIT，Kazuhiko Arase 的 QR Code Generator，随应用内置，离线可用）
 */
(function () {
  'use strict';

  /* ================= 核心纯逻辑（Node 可测） ================= */
  /** 根据卡片标题/内容生成合规的默认文件名：
   *  过滤 Windows 非法字符、去除首尾点与空格、保留名回退、限长、补 .png 后缀 */
  function suggestFilename(title, text) {
    var base = String(title || text || '').trim();
    base = base.replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '_');
    base = base.replace(/[. ]+$/g, '').trim();
    if (!base || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(base)) {
      base = 'jiaowodao-qr';
    }
    if (base.length > 60) base = base.slice(0, 60);
    return base + '.png';
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { suggestFilename: suggestFilename };
  }
  if (typeof document === 'undefined') return;
  /* ================= 核心纯逻辑结束 ================= */

  var mask = null;

  function escHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /** 用内置 qrcode 库生成二维码，返回 canvas dataURL（PNG）
   *  图片底部附名称（如有）与链接/内容文字，便于识别与分享 */
  function makeQrDataUrl(text, name) {
    if (!window.qrcode) return '';
    // 默认 Byte 模式按 Latin-1 截断字符，中文会乱码；显式切到 UTF-8。
    // 该赋值会改写库的全局 stringToBytes，故在 finally 中恢复原函数，
    // 避免影响其它调用方（可测纯逻辑或其它页面）。
    var utf8Bytes = window.qrcode.stringToBytesFuncs && window.qrcode.stringToBytesFuncs['UTF-8'];
    var originalBytes = window.qrcode.stringToBytes;
    if (utf8Bytes) window.qrcode.stringToBytes = utf8Bytes;
    try {
      var qr = window.qrcode(0, 'M');
      qr.addData(String(text));
      qr.make();
      return renderQrCanvas(qr, text, name);
    } finally {
      if (utf8Bytes) window.qrcode.stringToBytes = originalBytes;
    }
  }

  /** 把二维码模块矩阵绘制成带底部信息条的 PNG dataURL。 */
  function renderQrCanvas(qr, text, name) {
    var n = qr.getModuleCount();
    var quiet = 4;
    var scale = 8;
    var qrPx = (n + quiet * 2) * scale;

    // 底部信息条：名称（如有，加粗）+ 链接/内容
    var label = String(text || '');
    var title = (name && String(name) !== label) ? String(name) : '';
    var titleSize = 16;
    var subSize = 13;
    var labelPad = 12;
    var titleH = titleSize + 8;
    var subH = subSize + 6;
    var labelH = labelPad * 2 + (title ? titleH + subH : titleSize + 8);

    var canvas = document.createElement('canvas');
    canvas.width = qrPx;
    canvas.height = qrPx + labelH;
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#111111';
    for (var r = 0; r < n; r++) {
      for (var c = 0; c < n; c++) {
        if (qr.isDark(r, c)) {
          ctx.fillRect((c + quiet) * scale, (r + quiet) * scale, scale, scale);
        }
      }
    }
    var maxW = qrPx - labelPad * 2;
    /** 按最大宽度逐字截断文本并追加省略号，避免文字溢出图片 */
    function fit(t, size) {
      ctx.font = size + 'px "Segoe UI", "Microsoft YaHei", sans-serif';
      var shown = t;
      while (shown.length > 4 && ctx.measureText(shown + '\u2026').width > maxW) {
        shown = shown.slice(0, -1);
      }
      if (shown !== t) shown += '\u2026';
      return shown;
    }
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#111111';
    if (title) {
      ctx.font = 'bold ' + titleSize + 'px "Segoe UI", "Microsoft YaHei", sans-serif';
      var t1 = fit(title, titleSize);
      ctx.fillText(t1, (canvas.width - ctx.measureText(t1).width) / 2, qrPx + labelPad + titleH / 2);
      ctx.font = subSize + 'px "Segoe UI", "Microsoft YaHei", sans-serif';
      var t2 = fit(label, subSize);
      ctx.fillText(t2, (canvas.width - ctx.measureText(t2).width) / 2, qrPx + labelPad + titleH + subH / 2);
    } else {
      ctx.font = titleSize + 'px "Segoe UI", "Microsoft YaHei", sans-serif';
      var t3 = fit(label, titleSize);
      ctx.fillText(t3, (canvas.width - ctx.measureText(t3).width) / 2, qrPx + labelH / 2);
    }
    return canvas.toDataURL('image/png');
  }

  function buildModal() {
    mask = document.createElement('div');
    mask.className = 'qr-mask';
    mask.innerHTML =
      '<div class="qr-box" role="dialog" aria-modal="true" aria-labelledby="qr-title">' +
      '<div class="qr-head"><h3 id="qr-title"></h3>' +
      '<button type="button" class="qr-close" aria-label="close">&times;</button></div>' +
      '<div class="qr-body">' +
      '<img class="qr-img" id="qr-img" alt="QR">' +
      '<div class="qr-content" id="qr-content"></div>' +
      '<div class="qr-hint" id="qr-hint"></div>' +
      '<div class="qr-actions">' +
      '<button type="button" class="set-btn ghost" id="qr-copy"></button>' +
      '<button type="button" class="set-btn primary" id="qr-download"></button>' +
      '<button type="button" class="set-btn ghost" id="qr-close-btn"></button>' +
      '</div></div></div>';
    document.body.appendChild(mask);
    mask.querySelector('.qr-close').addEventListener('click', hide);
    mask.querySelector('#qr-close-btn').addEventListener('click', hide);
    mask.addEventListener('click', function (e) {
      if (e.target === mask) hide();
    });
    mask.querySelector('#qr-copy').addEventListener('click', function () {
      if (!currentText) return;
      copyText(currentText);
      showToast(t('toastCopied', { name: currentText.length > 40 ? currentText.slice(0, 40) + '…' : currentText }));
    });
    mask.querySelector('#qr-download').addEventListener('click', function () {
      var img = mask.querySelector('#qr-img');
      if (!img || !img.src) return;
      var fname = suggestFilename(currentTitle, currentText);
      var api = window.pywebview && window.pywebview.api;
      if (api && api.save_qr_png) {
        // 桌面壳：系统「另存为」对话框，用户自选保存位置
        var b64 = img.src.slice(img.src.indexOf(',') + 1);
        api.save_qr_png(b64, fname).then(function (r) {
          if (r && r.ok) {
            showToast(t('qrSaved', { path: r.path }));
          } else if (r && r.cancelled) {
            // 用户取消，不打扰
          } else {
            showToast(t('qrSaveFailed'));
          }
        }).catch(function () {
          showToast(t('qrSaveFailed'));
        });
        return;
      }
      // 浏览器/Edge 免安装版回退：触发浏览器下载（默认下载位置）
      var a = document.createElement('a');
      a.href = img.src;
      a.download = fname;
      document.body.appendChild(a);
      a.click();
      a.remove();
      showToast(t('qrSavedFallback'));
    });
    renderTexts();
  }

  /** 弹窗文案每次打开时按当前语言刷新（与设置面板/收藏侧栏的语言同步行为一致） */
  function renderTexts() {
    document.getElementById('qr-title').textContent = t('qrTitle');
    document.getElementById('qr-copy').textContent = t('qrCopy');
    document.getElementById('qr-download').textContent = t('qrDownload');
    document.getElementById('qr-close-btn').textContent = t('qrClose');
    document.getElementById('qr-hint').textContent = t('qrHint');
  }

  function copyText(text) {
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
  }

  var currentText = '';
  var currentTitle = '';

  function show(info) {
    if (!mask) buildModal();
    renderTexts();
    var text = (info && (info.url || info.title)) || '';
    if (!text) return;
    currentText = text;
    currentTitle = (info && info.title) || '';
    var dataUrl = makeQrDataUrl(text, currentTitle);
    var img = mask.querySelector('#qr-img');
    if (dataUrl) {
      img.src = dataUrl;
      img.style.display = '';
    } else {
      img.style.display = 'none';
    }
    var content = mask.querySelector('#qr-content');
    content.textContent = text.length > 90 ? text.slice(0, 90) + '…' : text;
    content.title = text;
    mask.classList.add('show');
  }

  function hide() {
    if (mask) mask.classList.remove('show');
  }

  window.JWD_QR = { show: show };
})();
