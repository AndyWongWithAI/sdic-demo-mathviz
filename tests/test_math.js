// tests/test_math.js - MathViz 单元测试（Node 内置 assert）
const {
  evalFunction,
  evalFunction2D,
  generatePoints,
  generateSquarePoints,
  generateConnections,
  colorAt,
  renderColorField,
} = require('../math.js');
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

// ===== Part 1: evalFunction / generatePoints（旧功能）=====
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

test('rejects injection: window.alert', () => {
  assert.throws(() => evalFunction('window.alert(1)', 0));
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

// ===== Part 2: evalFunction2D =====
test('evalFunction2D: f(x,y) = x + y', () => {
  assert.strictEqual(evalFunction2D('x + y', 3, 4), 7);
  assert.strictEqual(evalFunction2D('x - y', 10, 3), 7);
});

test('evalFunction2D: f(x,y) = Math.sqrt(x*x + y*y)', () => {
  assert(Math.abs(evalFunction2D('Math.sqrt(x*x + y*y)', 3, 4) - 5) < 1e-10);
});

test('evalFunction2D: rejects injection', () => {
  assert.throws(() => evalFunction2D('process.exit(1)', 0, 0));
});

// ===== Part 3: generateSquarePoints =====
test('generateSquarePoints: N=10 → 40 points (每边 N 个，4N 总数)', () => {
  const pts = generateSquarePoints(400, 300, 400, 10);
  // 设计：每边 N 个端点，4 边共 4N 个点（4 角点各被两条边共享）
  assert.strictEqual(pts.length, 40);
});

test('generateSquarePoints: 4 边各 N 个点', () => {
  const pts = generateSquarePoints(400, 300, 400, 10);
  const counts = [0, 0, 0, 0];
  for (const p of pts) counts[p.edge]++;
  for (let i = 0; i < 4; i++) {
    assert.strictEqual(counts[i], 10, `edge ${i} 应有 10 个点`);
  }
});

test('generateSquarePoints: 角点位置重合（被 2 条边共享）', () => {
  // 4 个角点（被相邻两条边共享）→ 至少 2 个 entry 位置相同
  const pts = generateSquarePoints(0, 0, 100, 5);
  // bottom-left 角点：(left=-50, bottom=50)，edge 0 idx=0 和 edge 3 idx=4
  // 验证它们位置完全相同
  const bottomLeft0 = pts[0];   // edge 0 idx 0
  const bottomLeft3 = pts[4 * 5 - 1];  // edge 3 last (idx=4, 5-1=4)
  assert.strictEqual(bottomLeft0.x, bottomLeft3.x);
  assert.strictEqual(bottomLeft0.y, bottomLeft3.y);
});

test('generateSquarePoints: N=1 → 4 角点', () => {
  const pts = generateSquarePoints(0, 0, 100, 1);
  assert.strictEqual(pts.length, 4);
  // 4 个角点：(±50, ±50)
  const expected = new Set(['-50,-50', '50,-50', '50,50', '-50,50']);
  for (const p of pts) {
    const key = `${p.x},${p.y}`;
    assert(expected.has(key), `点 ${key} 不是预期角点`);
  }
});

test('generateSquarePoints: 索引 0..4N-1 全部可访问（连接规则对齐）', () => {
  // 关键不变量：连接规则 0..4N-1 都能 points[i] 拿到一个有效 entry
  const pts = generateSquarePoints(400, 300, 400, 10);
  for (let i = 0; i < 4 * 10; i++) {
    assert(pts[i] !== undefined, `points[${i}] 必须是有效 entry`);
    assert(typeof pts[i].x === 'number', `points[${i}].x 必须是数字`);
    assert(typeof pts[i].y === 'number', `points[${i}].y 必须是数字`);
  }
});

// ===== Part 4: generateConnections =====
test('generateConnections: 简单平移 (i+1)%(4N)', () => {
  const pairs = generateConnections('(i + 1) % (4*n)', 5);  // 4N=20
  // (i+1)%20 没有 i 满足 ==i，所以 20 条都保留（无自连线）
  assert.strictEqual(pairs.length, 20);
  // 第 0 个端点应连到第 1 个
  assert.strictEqual(pairs[0].from, 0);
  assert.strictEqual(pairs[0].to, 1);
  // 第 19 个端点应连到第 0 个（环回）
  assert.strictEqual(pairs[19].from, 19);
  assert.strictEqual(pairs[19].to, 0);
});

test('generateConnections: 模运算处理负数', () => {
  // 负数取模应正确处理
  const pairs = generateConnections('((i - 1) + 4*n) % (4*n)', 3);
  // ((i-1)+12)%12 没有 i 满足 ==i（每条都-1），12 条都保留
  assert.strictEqual(pairs.length, 12);
  // 第 0 个端点应连到第 11 个（(0-1+12)%12 = 11）
  assert.strictEqual(pairs[0].to, 11);
});

test('generateConnections: 自连线被过滤', () => {
  // k(i) = i: 自连线，全部应被过滤
  const pairs = generateConnections('i', 5);
  assert.strictEqual(pairs.length, 0);
});

test('generateConnections: 拒绝非法字符', () => {
  assert.throws(() => generateConnections('window.alert(1)', 5));
});

test('generateConnections: 拒绝空规则', () => {
  assert.throws(() => generateConnections('', 5));
});

test('generateConnections: 拒绝语法错误', () => {
  assert.throws(() => generateConnections('(i +', 5));
});

// ===== Part 5: colorAt & renderColorField =====
test('colorAt: R=1, G=0, B=0 → 红色', () => {
  const [r, g, b] = colorAt(50, 50, 100, 100, '1', '0', '0', -1, 1, 1, -1);
  assert.strictEqual(r, 255);
  assert.strictEqual(g, 0);
  assert.strictEqual(b, 0);
});

test('colorAt: clamp 边界（>1 → 255）', () => {
  const [r] = colorAt(50, 50, 100, 100, '2', '0', '0', -1, 1, 1, -1);
  assert.strictEqual(r, 255);
});

test('colorAt: clamp 边界（<0 → 0）', () => {
  // 沙箱支持裸数字小数 -0.5
  const [r] = colorAt(50, 50, 100, 100, '-0.5', '0', '0', -1, 1, 1, -1);
  assert.strictEqual(r, 0);
});

test('colorAt: NaN → 0', () => {
  const [r] = colorAt(50, 50, 100, 100, 'sqrt(-1)', '0', '0', -1, 1, 1, -1);
  assert.strictEqual(r, 0);
});

test('沙箱：支持裸数字小数（0.5, -0.5, 3.14）', () => {
  assert.strictEqual(evalFunction('0.5', 0), 0.5);
  assert.strictEqual(evalFunction('-0.5', 0), -0.5);
  assert(Math.abs(evalFunction('3.14', 0) - 3.14) < 1e-10);
  assert.strictEqual(evalFunction('1 + 0.5', 0), 1.5);
});

test('沙箱：仍禁 process.exit 等带点全局', () => {
  assert.throws(() => evalFunction('process.exit(1)', 0));
  assert.throws(() => evalFunction('global.foo', 0));
  // 但允许数字字面量中的 .
  assert.strictEqual(evalFunction('1.0 + 2.0', 0), 3);
});

test('renderColorField: 输出维度正确', () => {
  const data = renderColorField(10, 10, '0', '0', '0', -1, 1, 1, -1);
  // 10*10*4 = 400 字节（RGBA）
  assert.strictEqual(data.length, 400);
  // RGB 全 0（黑色），A=255
  for (let i = 0; i < 400; i++) {
    if (i % 4 === 3) {
      assert.strictEqual(data[i], 255);  // alpha
    } else {
      assert.strictEqual(data[i], 0);
    }
  }
});

test('renderColorField: R=0.5 → 像素 R=128', () => {
  const data = renderColorField(4, 4, '0.5', '0', '0', -1, 1, 1, -1);
  // 检查第一个像素的 R
  assert.strictEqual(data[0], 128);  // round(0.5*255) = 128
  // alpha = 255
  assert.strictEqual(data[3], 255);
});

test('renderColorField: 性能（100x100 < 1s）', () => {
  const t0 = Date.now();
  renderColorField(100, 100, 'sin(x*5)', 'cos(y*5)', '(x+y+2)/4', -1, 1, 1, -1);
  const elapsed = Date.now() - t0;
  assert(elapsed < 1000, `渲染耗时 ${elapsed}ms > 1000ms`);
});

console.log(`\n=== 结果: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);
