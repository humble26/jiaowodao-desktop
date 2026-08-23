/* 交我导桌面版 · 设置面板
 * 功能：字体大小（rem 整体缩放）/ 桌面宠物开关 / 清空本地数据 / 更新日志查看
 * 结构：上半部分为纯逻辑（可在 Node 中 require 测试），下半部分为浏览器装配。
 */
(function () {
  'use strict';

  /* ================= 核心纯逻辑 ================= */
  var FONT_KEY = 'jiaowodao_font_scale';
  var CLEAR_KEYS = [
    'jiaowodao_search_history',
    'jiaowodao_remote_v1',
    'jiaowodao_update_log',
    'jiaowodao_favs',
    'jiaowodao_use_stats',
    'jiaowodao_custom_links',
    'jiaowodao_sort_enabled',
    'jiaowodao_events',            // 自定义日程（倒计时）
    'jiaowodao_disclaimer',        // 免责声明"不再显示"勾选
    'jiaowodao_fav_side_open'      // 收藏侧栏展开状态
  ];

  /* ---------- 版本与更新说明 ---------- */
  var VERSION = '2.5.0';
  var RELEASE_DATE = '2026-08-22';
  var CHANGELOG = [
    {
      ver: '2.5.0',
      date: '2026-08-22',
      zh: [
        '修复：数据更新在极端情况（远端文件列表为空）下更新功能卡死；缓存写入失败现会显式提示',
        '修复：收藏侧栏项由不合法的 <a> 内嵌 <button> 改为兄弟结构，修正无效嵌套并保留整行直达',
        '修复：关闭「常用优先」后恢复顺序的比较器违反传递性，可能导致顺序不定',
        '修复：「清空本地数据」现同时清理自定义日程、免责声明勾选与收藏侧栏开关',
        '修复：免责声明正文 HTML 渲染改为转义+白名单（<br>/<b>），杜绝文案注入为 XSS',
        '修复：倒计时天数改用 UTC 归一化计算，避免时区/夏令时导致的 ±1 天偏差',
        '修复：二维码生成临时改写库的全局编码函数，现用后即恢复，不再污染其它调用',
        '搜索与排序的同分项现按名称二次排序，结果更稳定可预期'
      ],
      en: [
        'Fix: data update could hang if the remote file list was empty; cache-save failures are now surfaced',
        'Fix: favorites sidebar items changed from invalid <a>-wrapping-<button> to sibling nodes; full-row navigation preserved',
        'Fix: comparator when restoring base order violated transitivity, causing unstable ordering',
        'Fix: "Clear local data" now also clears custom events, the disclaimer checkbox and the sidebar toggle',
        'Fix: disclaimer body HTML is now escaped then allow-listed (<br>/<b>) to prevent XSS via text injection',
        'Fix: countdown day diff now normalized via UTC to avoid +/-1 day errors around DST/timezone shifts',
        'Fix: QR generation temporarily patches the library global encoder, now restored after use',
        'Search/sort ties are now broken by name for stable, predictable ordering'
      ]
    },
    {
      ver: '2.4.4',
      date: '2026-08-15',
      zh: [
        '修复：页头按钮框架点击不生效（旧版脚本被 WebView2 缓存）；缓存更新机制重构：监控全部前端文件、清除失败自动重试、资源引用带版本号，确保版本更新后旧缓存必被清除'
      ],
      en: [
        'Fix: header button frame clicks were ignored (stale scripts cached by WebView2); cache invalidation rebuilt: watches all frontend files, retries on failure, versioned asset URLs - old cache is always cleared after updates'
      ]
    },
    {
      ver: '2.4.3',
      date: '2026-08-15',
      zh: [
        '二维码图片底部同时展示卡片名称（加粗）与链接地址，更易识别'
      ],
      en: [
        'QR image now shows both the card name (bold) and the link at the bottom'
      ]
    },
    {
      ver: '2.4.2',
      date: '2026-08-15',
      zh: [
        '二维码图片默认文件名按卡片标题生成（如 上海交通大学官网.png），过滤 Windows 非法字符并限长，合规且可识别，仍可在对话框中修改，支持中文名'
      ],
      en: [
        'QR default filename now derives from the card title (e.g. Library.png), sanitized for Windows and length-limited; still editable in the dialog, Chinese names supported'
      ]
    },
    {
      ver: '2.4.1',
      date: '2026-08-15',
      zh: [
        '二维码图片底部附链接/名称文字，便于识别与分享（过长自动省略）'
      ],
      en: [
        'QR image now includes the link/name caption at the bottom (auto-truncated with ellipsis)'
      ]
    },
    {
      ver: '2.4.0',
      date: '2026-08-15',
      zh: [
        '二维码「保存图片」升级：弹出系统另存为对话框，可自选保存位置（exe / Python 版）；Edge 免安装版回退浏览器下载'
      ],
      en: [
        'QR "Save Image" now opens a native Save-As dialog so you can choose the location (exe/Python); Edge mode falls back to browser download'
      ]
    },
    {
      ver: '2.3.0',
      date: '2026-08-15',
      zh: [
        '修复：二维码弹窗点击无反应（元素选择器不匹配导致构建中断）',
        '修复：内置二维码库在浏览器环境未挂载全局对象，二维码图无法生成',
        '二维码弹窗新增「复制链接」与「保存图片」按钮',
        '修复：开启常用排序后卡片未即时重排；清空搜索框后联想下拉残留旧建议',
        '修复：切换语言后倒计时横幅、收藏侧边栏文案未同步刷新',
        '性能：搜索打分索引缓存（逐键联想提速约 7 倍）、建议下拉限高防溢出',
        '「清空本地数据」范围扩展至收藏、自定义链接与使用统计'
      ],
      en: [
        'Fix: QR dialog did not open (selector mismatch broke modal construction)',
        'Fix: QR library was not attached to the global object in browsers, so no QR image was generated',
        'QR dialog now has "Copy Link" and "Save Image" buttons',
        'Fix: frequent-first sorting did not re-render the grid immediately; stale suggestions remained after clearing the search box',
        'Fix: countdown banner and favorites sidebar did not refresh on language switch',
        'Performance: cached search index (~7x faster suggestions), dropdown height limit',
        '"Clear local data" now also covers favorites, custom links and usage stats'
      ]
    },
    {
      ver: '2.2.0',
      date: '2026-08-15',
      zh: [
        '二维码分享：右键卡片菜单「生成二维码」，弹窗展示并支持下载 PNG，手机扫码直达链接',
        '收藏侧边栏：右侧可折叠面板，彩色头像列表，点击直达、悬停删除，更美观易用'
      ],
      en: [
        'QR code sharing: right-click a card -> "QR Code", view and download a PNG; scan with your phone to open',
        'Favorites sidebar: collapsible right panel with colorful avatars, click to open, hover to remove'
      ]
    },
    {
      ver: '2.1.0',
      date: '2026-08-15',
      zh: [
        '收藏夹：卡片星标收藏，页面顶部「我的收藏」条随时取用',
        '自定义链接：在设置中添加个人常用网站，并入导航与搜索',
        '使用统计与常用排序：自动记录打开次数，可开启「常用优先」排序',
        '日程倒计时：顶部横幅显示距下个假期/考试周的天数，内置公共假期与参考寒暑假，可自由增删日程'
      ],
      en: [
        'Favorites: star cards and access them from the "My Favorites" strip on top',
        'Custom links: add personal sites in Settings; merged into cards and search',
        'Usage stats & frequent-first sorting: visit counts recorded automatically',
        'Countdown banner: days until the next holiday/exam week; built-in public holidays, fully editable schedule'
      ]
    },
    {
      ver: '2.0.0',
      date: '2026-08-15',
      zh: [
        '搜索增强：热门直达预选栏、输入联想、拼音/首字母/英文缩写搜索、搜索历史、网址直达、Ctrl+K 快捷键',
        '数据在线更新：启动自动检查网站数据、页头「更新数据」按钮、本地缓存离线可用',
        '免责声明：进入应用弹出（中文/英文切换，默认中文）、页头常驻入口、退出应用按钮',
        '设置面板：字体大小四档、桌面宠物开关、一键清空本地数据、数据更新日志',
        '右键卡片菜单：复制标题 / 复制链接 / 复制名称',
        '页脚标注：网站原作者邮箱与桌面版来源说明',
        '数据持久化与页面缓存自动处理，保证更新即时生效'
      ],
      en: [
        'Search upgrade: quick-access presets, live suggestions, pinyin/initial/abbreviation search, history, URL quick-open, Ctrl+K shortcut',
        'Online data updates: auto-check on startup, manual "Update" button, local cache for offline use',
        'Disclaimer dialog on entry (zh/en toggle, defaults to Chinese), header entry, exit button',
        'Settings panel: font size (4 levels), pet toggle, clear local data, data update log',
        'Right-click card menu: copy title / link / name',
        'Footer credits: original site author email and desktop version attribution',
        'Persistent storage and automatic cache invalidation so updates take effect immediately'
      ]
    },
    {
      ver: '1.0.0',
      date: '',
      zh: [
        '仿「交我导」网页版风格的上海交大导航桌面应用',
        '内置网站 / 公众号 / 社团数据 303 条，离线可用',
        '搜索、类型页签、分类筛选、卡片直达、滚动加载',
        '浅色 / 深色 / 跟随系统主题，中英文切换',
        '可拖拽互动的小宠物「导导」'
      ],
      en: [
        'SJTU navigation desktop app styled after the "JiaoWoDao" website',
        '303 bundled entries (websites / WeChat accounts / clubs), usable offline',
        'Search, type tabs, category filters, direct-link cards, infinite scroll',
        'Light / dark / system themes, zh-en switching',
        'Draggable interactive pet "DaoDao"'
      ]
    }
  ];


  var FONT_SCALES = [
    { key: 's', zh: '小', en: 'Small', px: 13.6 },
    { key: 'm', zh: '标准', en: 'Normal', px: 16 },
    { key: 'l', zh: '大', en: 'Large', px: 18 },
    { key: 'xl', zh: '特大', en: 'X-Large', px: 20 }
  ];

  function fontPx(key) {
    for (var i = 0; i < FONT_SCALES.length; i++) {
      if (FONT_SCALES[i].key === key) return FONT_SCALES[i].px;
    }
    return 16;
  }

  function getFontKey() {
    try {
      return (typeof localStorage !== 'undefined' && localStorage.getItem(FONT_KEY)) || 'm';
    } catch (e) {
      return 'm';
    }
  }

  function setFontKey(key) {
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(FONT_KEY, key);
    } catch (e) { /* ignore */ }
  }

  function clearLocalDataKeys(keys) {
    var cleared = [];
    try {
      if (typeof localStorage !== 'undefined') {
        (keys || CLEAR_KEYS).forEach(function (k) {
          if (localStorage.getItem(k) !== null) {
            localStorage.removeItem(k);
            cleared.push(k);
          }
        });
      }
    } catch (e) { /* ignore */ }
    return cleared;
  }

  /** 关于面板版本标题键：最新版=更新说明；v1.0=功能说明（最初版）；其余无标签 */
  function versionTitleKey(ver, currentVersion) {
    if (ver === currentVersion) return 'aboutLogTitle';
    if (ver === '1.0.0') return 'aboutBaseTitle';
    return '';
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      FONT_KEY: FONT_KEY,
      CLEAR_KEYS: CLEAR_KEYS,
      FONT_SCALES: FONT_SCALES,
      VERSION: VERSION,
      RELEASE_DATE: RELEASE_DATE,
      CHANGELOG: CHANGELOG,
      versionTitleKey: versionTitleKey,
      fontPx: fontPx,
      getFontKey: getFontKey,
      setFontKey: setFontKey,
      clearLocalDataKeys: clearLocalDataKeys
    };
  }
  if (typeof document === 'undefined') return;
  /* ================= 核心纯逻辑结束 ================= */

  var mask = null;
  var pendingClear = false;

  /** 依据已保存的字体档位设置根元素 font-size（rem 整体缩放） */
  function applyFont(key) {
    document.documentElement.style.fontSize = fontPx(key) + 'px';
  }

  function escHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function fmtTime(iso) {
    try {
      var d = new Date(iso);
      return d.toLocaleString(currentLang === 'en' ? 'en-US' : 'zh-CN', {
        year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
      });
    } catch (e) {
      return String(iso || '');
    }
  }

  function buildPanel() {
    mask = document.createElement('div');
    mask.className = 'settings-mask';
    mask.innerHTML =
      '<div class="settings-box" role="dialog" aria-modal="true" aria-labelledby="settings-title">' +
      '<div class="settings-head">' +
      '<h3><svg class="settings-head-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
      '<circle cx="12" cy="12" r="3.2" stroke="currentColor" stroke-width="2"></circle>' +
      '<path d="M19.4 13.5a7.6 7.6 0 0 0 0-3l2-1.5-2-3.4-2.4 1a7.6 7.6 0 0 0-2.6-1.5L14 2.6h-4l-.4 2.5a7.6 7.6 0 0 0-2.6 1.5l-2.4-1-2 3.4 2 1.5a7.6 7.6 0 0 0 0 3l-2 1.5 2 3.4 2.4-1a7.6 7.6 0 0 0 2.6 1.5l.4 2.5h4l.4-2.5a7.6 7.6 0 0 0 2.6-1.5l2.4 1 2-3.4-2-1.5Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"></path>' +
      '</svg><span id="settings-title"></span></h3>' +
      '<button type="button" class="settings-close" id="settings-close" aria-label="close">&times;</button>' +
      '</div>' +
      '<div class="settings-body">' +

      '<div class="set-sec">' +
      '<div class="set-sec-title" id="set-font-label"></div>' +
      '<div class="seg" id="set-font-seg"></div>' +
      '<div class="set-hint" id="set-font-hint"></div>' +
      '</div>' +

      '<div class="set-sec">' +
      '<div class="set-sec-title" id="set-pet-label"></div>' +
      '<div class="seg" id="set-pet-seg"></div>' +
      '</div>' +

      '<div class="set-sec">' +
      '<div class="set-sec-title" id="set-sort-label"></div>' +
      '<div class="seg" id="set-sort-seg"></div>' +
      '<div class="set-hint" id="set-sort-hint"></div>' +
      '</div>' +

      '<div class="set-sec">' +
      '<div class="set-sec-title" id="set-custom-label"></div>' +
      '<div class="custom-list" id="set-custom-list"></div>' +
      '<div class="set-form">' +
      '<input type="text" class="set-input" id="set-custom-name" maxlength="40">' +
      '<input type="text" class="set-input" id="set-custom-url" maxlength="200">' +
      '<button type="button" class="set-btn primary" id="set-custom-add"></button>' +
      '</div>' +
      '<div class="set-hint" id="set-custom-hint"></div>' +
      '</div>' +

      '<div class="set-sec">' +
      '<div class="set-sec-title set-log-title">' +
      '<span id="set-event-label"></span>' +
      '<button type="button" class="set-mini" id="set-event-reset"></button>' +
      '</div>' +
      '<div class="event-list" id="set-event-list"></div>' +
      '<div class="set-form">' +
      '<input type="text" class="set-input" id="set-event-name" maxlength="30">' +
      '<input type="date" class="set-input set-date" id="set-event-date">' +
      '<button type="button" class="set-btn primary" id="set-event-add"></button>' +
      '</div>' +
      '<div class="set-hint" id="set-event-hint"></div>' +
      '</div>' +

      '<div class="set-sec">' +
      '<div class="set-sec-title" id="set-data-label"></div>' +
      '<div class="set-data-row">' +
      '<button type="button" class="set-btn danger" id="set-clear-btn"></button>' +
      '<button type="button" class="set-btn ghost" id="set-clear-cancel" hidden></button>' +
      '</div>' +
      '<div class="set-hint" id="set-clear-hint"></div>' +
      '</div>' +

      '<div class="set-sec">' +
      '<div class="set-sec-title set-log-title">' +
      '<span id="set-log-label"></span>' +
      '<button type="button" class="set-mini" id="set-log-clear"></button>' +
      '</div>' +
      '<div class="log-list" id="set-log-list"></div>' +
      '<div class="set-hint" id="set-log-hint"></div>' +
      '</div>' +

      '<div class="set-sec">' +
      '<div class="set-sec-title" id="set-about-label"></div>' +
      '<div class="about-version" id="set-about-version"></div>' +
      '<div class="about-log" id="set-about-log"></div>' +
      '</div>' +

      '</div>' +
      '</div>';
    document.body.appendChild(mask);

    document.getElementById('settings-title').textContent = t('settingsTitle');
    document.getElementById('settings-close').addEventListener('click', hide);
    mask.addEventListener('click', function (e) {
      if (e.target === mask) hide();
    });
    document.getElementById('set-clear-btn').addEventListener('click', onClearClick);
    document.getElementById('set-clear-cancel').addEventListener('click', resetClearState);
    document.getElementById('set-log-clear').addEventListener('click', function () {
      try {
        if (typeof window !== 'undefined' && window.jwdClearUpdateLog) window.jwdClearUpdateLog();
      } catch (e) { /* ignore */ }
      renderPanel();
    });
    // 常用排序
    document.getElementById('set-sort-seg').addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('.set-seg') : null;
      if (!b) return;
      var on = b.getAttribute('data-key') === 'on';
      if (window.JWD_PERSONAL) window.JWD_PERSONAL.setSortEnabled(on);
      renderPanel();
    });
    // 自定义链接
    document.getElementById('set-custom-add').addEventListener('click', function () {
      var name = document.getElementById('set-custom-name').value;
      var url = document.getElementById('set-custom-url').value;
      var r = window.JWD_PERSONAL ? window.JWD_PERSONAL.addCustom(name, url) : { ok: false };
      if (r && r.ok) {
        document.getElementById('set-custom-name').value = '';
        document.getElementById('set-custom-url').value = '';
        showToast(t('customAdded', { name: name.trim() }));
      } else {
        showToast(t('customInvalid'));
      }
      renderPanel();
    });
    // 日程
    document.getElementById('set-event-add').addEventListener('click', function () {
      var name = document.getElementById('set-event-name').value;
      var date = document.getElementById('set-event-date').value;
      var r = window.JWD_COUNTDOWN ? window.JWD_COUNTDOWN.addEvent(name, date) : { ok: false };
      if (r && r.ok) {
        document.getElementById('set-event-name').value = '';
        document.getElementById('set-event-date').value = '';
        showToast(t('eventAdded', { name: name.trim() }));
      } else {
        showToast(t('eventInvalid'));
      }
      renderPanel();
    });
    document.getElementById('set-event-reset').addEventListener('click', function () {
      if (window.JWD_COUNTDOWN) window.JWD_COUNTDOWN.resetEvents();
      showToast(t('eventResetDone'));
      renderPanel();
    });

    renderPanel();
  }

  /** 生成一组分段按钮（seg），高亮 activeKey，并绑定选择回调 */
  function segButtons(container, options, activeKey, onClick) {
    container.innerHTML = '';
    options.forEach(function (opt) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'set-seg' + (opt.key === activeKey ? ' active' : '');
      b.textContent = opt.label;
      b.addEventListener('click', function () {
        onClick(opt.key);
        var all = container.querySelectorAll('.set-seg');
        for (var i = 0; i < all.length; i++) all[i].classList.toggle('active', all[i] === b);
      });
      container.appendChild(b);
    });
  }

  /** 重绘整个设置面板（字体/宠物/排序/自定义/日程/数据/日志/关于） */
  function renderPanel() {
    // 字体
    var fk = getFontKey();
    document.getElementById('set-font-label').textContent = t('fontLabel');
    document.getElementById('set-font-hint').textContent = t('fontHint');
    segButtons(document.getElementById('set-font-seg'),
      FONT_SCALES.map(function (s) { return { key: s.key, label: currentLang === 'en' ? s.en : s.zh }; }),
      fk,
      function (key) { setFontKey(key); applyFont(key); });

    // 宠物
    var petHidden = !!(window.JWD_PET && window.JWD_PET.isHidden());
    document.getElementById('set-pet-label').textContent = t('petLabel');
    segButtons(document.getElementById('set-pet-seg'), [
      { key: 'show', label: t('petShow') },
      { key: 'hide', label: t('petHide') }
    ], petHidden ? 'hide' : 'show', function (key) {
      if (window.JWD_PET) {
        if (key === 'hide') window.JWD_PET.hide();
        else window.JWD_PET.show();
      }
    });

    // 常用排序
    var sortOn = !!(window.JWD_PERSONAL && window.JWD_PERSONAL.getSortEnabled());
    document.getElementById('set-sort-label').textContent = t('sortLabel');
    document.getElementById('set-sort-hint').textContent = t('sortHint');
    var sortSeg = document.getElementById('set-sort-seg');
    sortSeg.innerHTML = '';
    [
      { key: 'on', label: t('sortOn') },
      { key: 'off', label: t('sortOff') }
    ].forEach(function (opt) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'set-seg' + ((opt.key === 'on') === sortOn ? ' active' : '');
      b.setAttribute('data-key', opt.key);
      b.textContent = opt.label;
      sortSeg.appendChild(b);
    });

    // 自定义链接
    document.getElementById('set-custom-label').textContent = t('customLabel');
    document.getElementById('set-custom-hint').textContent = t('customHint');
    document.getElementById('set-custom-add').textContent = t('customAdd');
    document.getElementById('set-custom-name').placeholder = t('customNamePh');
    document.getElementById('set-custom-url').placeholder = t('customUrlPh');
    renderCustomList();

    // 日程
    document.getElementById('set-event-label').textContent = t('eventLabel');
    document.getElementById('set-event-reset').textContent = t('eventReset');
    document.getElementById('set-event-hint').textContent = t('eventHint');
    document.getElementById('set-event-add').textContent = t('eventAdd');
    document.getElementById('set-event-name').placeholder = t('eventNamePh');
    renderEventList();

    // 数据
    document.getElementById('set-data-label').textContent = t('dataLabel');
    document.getElementById('set-clear-btn').textContent = t('clearData');
    document.getElementById('set-clear-cancel').textContent = t('clearDataCancel');
    document.getElementById('set-clear-hint').textContent = t('clearDataHint');

    // 更新日志
    document.getElementById('set-log-label').textContent = t('logLabel');
    document.getElementById('set-log-clear').textContent = t('logClear');
    document.getElementById('set-log-hint').textContent = t('logHint');
    renderLog();

    // 关于（版本与更新说明）
    document.getElementById('set-about-label').textContent = t('aboutLabel');
    document.getElementById('set-about-version').textContent =
      t('aboutVersion', { version: VERSION });
    renderAbout();
  }

  function renderCustomList() {
    var el = document.getElementById('set-custom-list');
    var list = (window.JWD_PERSONAL && window.JWD_PERSONAL.getCustom()) || [];
    if (!list.length) {
      el.innerHTML = '<div class="set-empty">' + escHtml(t('customEmpty')) + '</div>';
      return;
    }
    var html = '';
    list.forEach(function (c) {
      html += '<div class="link-row">' +
        '<span class="link-row-name">' + escHtml(c.name) + '</span>' +
        '<span class="link-row-url">' + escHtml(c.url) + '</span>' +
        '<button type="button" class="link-row-del" data-name="' + escHtml(c.name) + '">' + escHtml(t('customRemove')) + '</button>' +
        '</div>';
    });
    el.innerHTML = html;
    var dels = el.querySelectorAll('.link-row-del');
    for (var i = 0; i < dels.length; i++) {
      dels[i].addEventListener('click', function () {
        if (window.JWD_PERSONAL) window.JWD_PERSONAL.removeCustom(this.getAttribute('data-name'));
        renderPanel();
      });
    }
  }

  function renderEventList() {
    var el = document.getElementById('set-event-list');
    var list = (window.JWD_COUNTDOWN && window.JWD_COUNTDOWN.getEvents()) || [];
    if (!list.length) {
      el.innerHTML = '<div class="set-empty">' + escHtml(t('eventEmpty')) + '</div>';
      return;
    }
    var html = '';
    list.slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; }).forEach(function (ev) {
      html += '<div class="link-row">' +
        '<span class="link-row-name">' + escHtml(ev.name) + '</span>' +
        '<span class="link-row-url">' + escHtml(ev.date) + '</span>' +
        '<button type="button" class="link-row-del" data-date="' + escHtml(ev.date) + '" data-name="' + escHtml(ev.name) + '">' + escHtml(t('customRemove')) + '</button>' +
        '</div>';
    });
    el.innerHTML = html;
    var dels = el.querySelectorAll('.link-row-del');
    for (var i = 0; i < dels.length; i++) {
      dels[i].addEventListener('click', function () {
        if (window.JWD_COUNTDOWN) {
          window.JWD_COUNTDOWN.removeEvent(this.getAttribute('data-date'), this.getAttribute('data-name'));
        }
        renderPanel();
      });
    }
  }

  function renderAbout() {
    var el = document.getElementById('set-about-log');
    var html = '';
    var isEn = currentLang === 'en';
    CHANGELOG.forEach(function (entry) {
      var items = isEn ? entry.en : entry.zh;
      var titleKey = versionTitleKey(entry.ver, VERSION);
      var head = 'v' + escHtml(entry.ver) +
        (entry.date ? ' <span class="about-entry-date">(' + escHtml(entry.date) + ')</span>' : '');
      if (titleKey) head += ' · ' + escHtml(t(titleKey));
      html += '<div class="about-entry">' +
        '<div class="about-entry-head">' + head + '</div>' +
        '<ul class="about-entry-list">';
      items.forEach(function (line) {
        html += '<li>' + escHtml(line) + '</li>';
      });
      html += '</ul></div>';
    });
    el.innerHTML = html;
  }

  function renderLog() {
    var listEl = document.getElementById('set-log-list');
    var arr = [];
    try {
      if (window.jwdReadUpdateLog) arr = window.jwdReadUpdateLog();
    } catch (e) { /* ignore */ }
    if (!arr || !arr.length) {
      listEl.innerHTML = '<div class="set-empty">' + escHtml(t('logEmpty')) + '</div>';
      return;
    }
    var html = '';
    var reversed = arr.slice().reverse();
    reversed.forEach(function (entry) {
      var src = entry.source === 'manual' ? t('logSourceManual') : t('logSourceAuto');
      html += '<div class="log-item">' +
        '<span class="log-time">' + escHtml(fmtTime(entry.t)) + '</span>' +
        '<span class="log-text">' + escHtml(t('logEntry', {
          version: entry.version || '-', before: entry.before, after: entry.after, source: src
        })) + '</span></div>';
    });
    listEl.innerHTML = html;
  }

  function onClearClick() {
    if (!pendingClear) {
      pendingClear = true;
      var btn = document.getElementById('set-clear-btn');
      btn.textContent = t('clearDataConfirm');
      btn.classList.add('confirm');
      document.getElementById('set-clear-cancel').hidden = false;
      return;
    }
    var cleared = clearLocalDataKeys();
    showToast(t('clearDataDone'));
    setTimeout(function () { location.reload(); }, 800);
  }

  function resetClearState() {
    pendingClear = false;
    var btn = document.getElementById('set-clear-btn');
    btn.textContent = t('clearData');
    btn.classList.remove('confirm');
    document.getElementById('set-clear-cancel').hidden = true;
  }

  function show() {
    if (!mask) buildPanel();
    pendingClear = false;
    renderPanel();
    mask.classList.add('show');
  }

  function hide() {
    if (mask) mask.classList.remove('show');
  }

  // 页头「设置」按钮（通过调用时解析调用当前 show，避免捕获旧引用）
  var headerBtn = document.getElementById('settings-header-btn');
  if (headerBtn) {
    headerBtn.textContent = t('settingsBtn');
    headerBtn.addEventListener('click', function () { show(); });
    // 整个边框盒子可点击（点击图标/空白处同样生效，点按钮本身不重复触发）
    var settingsWrap = document.getElementById('settings-wrap');
    if (settingsWrap) {
      settingsWrap.addEventListener('click', function (e) {
        if (e.target !== headerBtn) show();
      });
    }
  }

  // 语言切换：关闭面板（下次打开按新语言渲染）
  var langSel = document.getElementById('lang-select');
  if (langSel) {
    langSel.addEventListener('change', function () {
      if (headerBtn) headerBtn.textContent = t('settingsBtn');
      hide();
    });
  }

  // 暴露给 data-update 的日志读写（避免循环依赖）
  window.jwdReadUpdateLog = function () {
    try {
      var s = document.createElement('script');
      // data-update.js 已加载，直接读其存储
      var raw = (typeof localStorage !== 'undefined' && localStorage.getItem('jiaowodao_update_log')) || '';
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  };
  window.jwdClearUpdateLog = function () {
    try {
      if (typeof localStorage !== 'undefined') localStorage.removeItem('jiaowodao_update_log');
    } catch (e) { /* ignore */ }
  };

  // 倒计时横幅点击 -> 打开设置
  document.addEventListener('jiaowodao:open-settings', function () {
    show();
  });

  // 个人化模块变化时刷新面板（若已打开）；懒订阅（模块后于本脚本加载）
  function refreshIfOpen() {
    if (mask && mask.classList.contains('show')) renderPanel();
  }
  var subscribed = false;
  function subscribePersonal() {
    if (subscribed) return;
    if (window.JWD_PERSONAL) window.JWD_PERSONAL.onChanged(refreshIfOpen);
    if (window.JWD_COUNTDOWN) window.JWD_COUNTDOWN.onChanged(refreshIfOpen);
    subscribed = !!(window.JWD_PERSONAL && window.JWD_COUNTDOWN);
  }
  show = (function (orig) {
    return function () {
      subscribePersonal();
      return orig();
    };
  })(show);

  // 启动时应用已保存的字体大小（早期 bootstrap 已处理，这里兜底保证一致）
  applyFont(getFontKey());
})();
