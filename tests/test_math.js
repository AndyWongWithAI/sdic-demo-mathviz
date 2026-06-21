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
test('generateSquarePoints: N=10 → 36 points (4 边 × N-1 + 4 角点共享)', () => {
  const pts = generateSquarePoints(400, 300, 400, 10);
  // 设计：每边 N-1 个内部点（不含末角），4 角点共享 → 4(N-1) = 36
  assert.strictEqual(pts.length, 36);
});

test('generateSquarePoints: 4 边各 N-1 个点', () => {
  const pts = generateSquarePoints(400, 300, 400, 10);
  // 统计各边数量
  const counts = [0, 0, 0, 0];
  for (const p of pts) counts[p.edge]++;
  for (let i = 0; i < 4; i++) {
    assert.strictEqual(counts[i], 9, `edge ${i} 应有 9 个点`);
  }
});

test('generateSquarePoints: 角点不重复', () => {
  // 4 个角点（同时是两条边的端点）
  const pts = generateSquarePoints(400, 300, 400, 5);
  // 验证: bottom-left 应该是 idx=0 (edge 0), 也在 edge 3 的 idx=4
  // 简化: 验证没有完全重合的点
  const seen = new Set();
  for (const p of pts) {
    const key = `${p.x.toFixed(3)},${p.y.toFixed(3)}`;
    assert(!seen.has(key), `点 ${key} 重复`);
    seen.add(key);
  }
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
  // 用 (0-1)/2 表达 -0.5（沙箱禁 . ，所以不用裸 -0.5）
  const [r] = colorAt(50, 50, 100, 100, '(0-1)/2', '0', '0', -1, 1, 1, -1);
  assert.strictEqual(r, 0);
});

test('colorAt: NaN → 0', () => {
  // Math.sqrt(-1) = NaN（注意沙箱里 Math.sqrt 会被改写为 sqrt）
  const [r] = colorAt(50, 50, 100, 100, 'sqrt(-1)', '0', '0', -1, 1, 1, -1);
  assert.strictEqual(r, 0);
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

test('renderColorField: R=1/2 → 像素 R=128', () => {
  // 用 1/2 表达 0.5（沙箱禁 . ，所以不用裸 0.5）
  const data = renderColorField(4, 4, '1/2', '0', '0', -1, 1, 1, -1);
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
