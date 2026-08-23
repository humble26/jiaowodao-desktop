// 交我导桌面版 · 设置模块核心逻辑测试
// 用法：node tools/test_settings.js
const assert = require('assert');
const st = require('../settings.js');

// 字体档位
assert.strictEqual(st.FONT_SCALES.length, 4);
assert.strictEqual(st.fontPx('m'), 16);
assert.strictEqual(st.fontPx('s'), 13.6);
assert.strictEqual(st.fontPx('xl'), 20);
assert.strictEqual(st.fontPx('unknown'), 16, 'unknown key falls back to 16');
// Node 无 localStorage：读写降级
assert.strictEqual(st.getFontKey(), 'm');
st.setFontKey('l'); // 不应抛错
// 清空数据键（含新增的自定义日程/免责声明/侧栏开关）
assert.deepStrictEqual(st.CLEAR_KEYS, [
  'jiaowodao_search_history',
  'jiaowodao_remote_v1',
  'jiaowodao_update_log',
  'jiaowodao_favs',
  'jiaowodao_use_stats',
  'jiaowodao_custom_links',
  'jiaowodao_sort_enabled',
  'jiaowodao_events',
  'jiaowodao_disclaimer',
  'jiaowodao_fav_side_open'
]);
const cleared = st.clearLocalDataKeys(['a', 'b']);
assert.deepStrictEqual(cleared, [], 'no localStorage -> nothing cleared, no crash');

// 版本与更新说明
assert.strictEqual(st.VERSION, '2.5.0');
assert.strictEqual(st.RELEASE_DATE, '2026-08-22');
assert.ok(Array.isArray(st.CHANGELOG) && st.CHANGELOG.length >= 11, 'changelog has 11+ versions');
assert.strictEqual(st.CHANGELOG[0].ver, '2.5.0');
assert.ok(st.CHANGELOG[0].zh.length > 0 && st.CHANGELOG[0].en.length > 0, 'v2.5.0 changelog zh/en');
assert.strictEqual(st.CHANGELOG[0].zh.length, st.CHANGELOG[0].en.length, 'zh/en entries aligned');
assert.strictEqual(st.CHANGELOG[1].ver, '2.4.4');
assert.strictEqual(st.CHANGELOG[2].ver, '2.4.3');
assert.strictEqual(st.CHANGELOG[3].ver, '2.4.2');
assert.strictEqual(st.CHANGELOG[4].ver, '2.4.1');
assert.strictEqual(st.CHANGELOG[5].ver, '2.4.0');
assert.strictEqual(st.CHANGELOG[6].ver, '2.3.0');
assert.strictEqual(st.CHANGELOG[7].ver, '2.2.0');
assert.strictEqual(st.CHANGELOG[8].ver, '2.1.0');
assert.strictEqual(st.CHANGELOG[9].ver, '2.0.0');
assert.strictEqual(st.CHANGELOG[10].ver, '1.0.0');
assert.ok(st.CHANGELOG[10].zh.length > 0, 'v1 feature list');
// 最新版本条目必须与 VERSION 一致（防止版本号与说明脱节）
assert.strictEqual(st.CHANGELOG[0].ver, st.VERSION);

// 关于面板版本标题：最新版=更新说明；仅 v1.0 标注最初版；其余无标签
assert.strictEqual(st.versionTitleKey('2.5.0', '2.5.0'), 'aboutLogTitle');
assert.strictEqual(st.versionTitleKey('1.0.0', '2.5.0'), 'aboutBaseTitle');
assert.strictEqual(st.versionTitleKey('2.4.2', '2.5.0'), '');
assert.strictEqual(st.versionTitleKey('2.0.0', '2.5.0'), '');
assert.strictEqual(st.versionTitleKey('2.3.0', '2.5.0'), '');

console.log('ALL SETTINGS TESTS PASSED');
