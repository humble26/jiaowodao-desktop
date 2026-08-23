// 交我导桌面版 · 倒计时模块核心逻辑测试
// 用法：node tools/test_countdown.js
const assert = require('assert');
const cd = require('../countdown.js');

// 默认日程（数量与格式）
assert.ok(Array.isArray(cd.DEFAULT_EVENTS) && cd.DEFAULT_EVENTS.length >= 10, 'defaults exist');
cd.DEFAULT_EVENTS.forEach(e => {
  assert.ok(e.name && /^\d{4}-\d{2}-\d{2}$/.test(e.date), 'default format: ' + e.date);
});

// daysUntil
const today = new Date(2026, 7, 15); // 2026-08-15
assert.strictEqual(cd.daysUntil('2026-08-16', today), 1);
assert.strictEqual(cd.daysUntil('2026-08-15', today), 0);
assert.strictEqual(cd.daysUntil('2026-08-14', today), -1);
assert.strictEqual(cd.daysUntil('2026-10-01', today), 47);
assert.strictEqual(cd.daysUntil('bad-date', today), null);
// 非法日期不得被 Date.UTC 静默进位成错误天数（rollover 回归防护）
assert.strictEqual(cd.daysUntil('2026-99-99', today), null);
assert.strictEqual(cd.daysUntil('2026-02-30', today), null);
assert.strictEqual(cd.daysUntil('2026-13-01', today), null);
assert.strictEqual(cd.daysUntil('2026-00-10', today), null);

// nextEvent：最近的下一个未来日程
const events = [
  { name: '已过去', date: '2026-08-01' },
  { name: '国庆', date: '2026-10-01' },
  { name: '考试周', date: '2026-08-20' },
  { name: '很远', date: '2027-12-31' }
];
let n = cd.nextEvent(events, today, 120);
assert.strictEqual(n.event.name, '考试周');
assert.strictEqual(n.days, 5);
// 今天
n = cd.nextEvent([{ name: '今天', date: '2026-08-15' }], today, 120);
assert.strictEqual(n.days, 0);
// 视野外（lookahead 限制）
n = cd.nextEvent([{ name: '很远', date: '2027-12-31' }], today, 30);
assert.strictEqual(n, null);
// 空列表 / 非法日期
assert.strictEqual(cd.nextEvent([], today, 120), null);
assert.strictEqual(cd.nextEvent([{ name: 'x', date: 'oops' }], today, 120), null);

console.log('ALL COUNTDOWN TESTS PASSED');
