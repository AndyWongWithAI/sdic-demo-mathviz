// tests/test_math.js - 基础单元测试（用 Node 内置 assert）
const { evalFunction, generatePoints } = require('../math.js');
const assert = require('assert');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e) {
    console.error(`  ✗ ${name}: ${e.message}`);
    failed++;
  }
}

console.log('=== MathViz 单元测试 ===\n');

test('identity: f(x) = x', () => {
  assert.strictEqual(evalFunction('x', 5), 5);
  assert.strictEqual(evalFunction('x', -3), -3);
});

test('arithmetic: f(x) = x * 2', () => {
  assert.strictEqual(evalFunction('x * 2', 3), 6);
  assert.strictEqual(evalFunction('x * 2', -1), -2);
});

test('Math.sin: f(x) = Math.sin(0)', () => {
  assert.strictEqual(evalFunction('Math.sin(0)', 0), 0);
  assert(Math.abs(evalFunction('Math.sin(Math.PI / 2)', 0) - 1) < 1e-10);
});

test('Math.pow: f(x) = x ** 2', () => {
  assert.strictEqual(evalFunction('x ** 2', 3), 9);
});

test('composition: f(x) = Math.sin(x) * 2', () => {
  assert(Math.abs(evalFunction('Math.sin(x) * 2', Math.PI / 2) - 2) < 1e-10);
});

test('rejects injection: window.alert', () => {
  assert.throws(() => evalFunction('window.alert(1)', 0));
});

test('rejects injection: arrow function', () => {
  assert.throws(() => evalFunction('() => 1', 0));
});

test('generatePoints: 101 points from x=0 to x=10', () => {
  const pts = generatePoints('x', 0, 10, 100);
  assert.strictEqual(pts.length, 101);
  assert.strictEqual(pts[0][0], 0);
  assert.strictEqual(pts[100][0], 10);
});

test('generatePoints: rejects xMin >= xMax', () => {
  assert.throws(() => generatePoints('x', 5, 5));
  assert.throws(() => generatePoints('x', 10, 5));
});

test('generatePoints: skips invalid points', () => {
  // Math.log(0) = -Infinity → 应被过滤
  const pts = generatePoints('Math.log(x)', 0, 5, 50);
  // 第 0 个点 (x=0) 会被过滤，其他保留
  assert(pts.length < 51, `期望 < 51，实际 ${pts.length}`);
  assert(pts[0][0] > 0);
});

console.log(`\n=== 结果: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);