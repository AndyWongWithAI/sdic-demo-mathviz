// math.js - 数学函数求值 + 点生成（浏览器 + Node.js 兼容）

// 沙箱：把 Math.X 替换成 X（消除 . 字符），白名单禁 . 防止 process.exit 等注入
const MATH_INJECT = `
  const { sin, cos, tan, asin, acos, atan, atan2,
          sinh, cosh, tanh,
          sqrt, cbrt, abs, sign,
          log, log2, log10, exp,
          pow, floor, ceil, round, trunc,
          min, max, random,
          PI, E, LN2, LN10, LOG2E, LOG10E, SQRT2 } = Math;
`;

function _safeCompile(funcStr, args) {
  // 1. 先把 Math.X 替换成占位符（白名单允许占位符但不允许 .）
  const MATH_PLACEHOLDER = 'M';  // 短前缀，少占字符
  const templated = funcStr.replace(/Math\.([a-zA-Z]+)/g, (_, name) => `${MATH_PLACEHOLDER}${name}`);
  // 2. 白名单：禁止 . [ ] { } = ; : ' " ` $ & | ! ? < > # @ 等
  const allowed = /^[a-zA-Z0-9_+\-*/()%,\s]+$/;
  if (!allowed.test(templated)) {
    throw new Error('函数包含非法字符');
  }
  // 3. 编译前把占位符前缀展开成注入的 Math API
  // 注入的变量是单字母（sin, cos, ...），占位符模板：Msin → sin
  const rewritten = templated.replace(/M([a-zA-Z]+)/g, '$1');
  // 4. 编译
  let fn;
  try {
    fn = new Function(...args, MATH_INJECT + `return (${rewritten});`);
  } catch (e) {
    throw new Error('语法错误: ' + e.message);
  }
  return fn;
}

// 安全求值：白名单 + 显式 Math 注入（防 process.exit 等注入）
function evalFunction(funcStr, x) {
  let result;
  try {
    const fn = _safeCompile(funcStr, ['x']);
    result = fn(x);
  } catch (e) {
    if (e.message.startsWith('函数') || e.message.startsWith('语法') || e.message.startsWith('函数')) {
      throw e;
    }
    throw new Error('执行错误: ' + e.message);
  }
  if (typeof result !== 'number' || !isFinite(result)) return null;
  return result;
}

// 二维安全求值：(x, y) → number
function evalFunction2D(funcStr, x, y) {
  let result;
  try {
    const fn = _safeCompile(funcStr, ['x', 'y']);
    result = fn(x, y);
  } catch (e) {
    throw new Error('执行错误: ' + e.message);
  }
  if (typeof result !== 'number' || !isFinite(result)) return null;
  return result;
}

function generatePoints(funcStr, xMin, xMax, steps) {
  if (steps === undefined) steps = 200;
  if (xMin >= xMax) throw new Error('x_min 必须 < x_max');
  const points = [];
  const step = (xMax - xMin) / steps;
  for (let i = 0; i <= steps; i++) {
    const x = xMin + i * step;
    let y;
    try {
      y = evalFunction(funcStr, x);
    } catch (e) {
      continue;
    }
    if (y !== null) points.push([x, y]);
  }
  return points;
}

// ========== 功能 1: 端点连线 ==========
// 在一个正方形（以 (cx, cy) 为中心, side 为边长）的 4 条边上生成 N 个等距端点
// 设计：每边 N-1 个内部点（不含端点），4 角点共享 → 4(N-1) + 4 = 4N 个点，无重复
// 端点编号规则：底边 0..N-1（左→右，不含右上角），右边 N..2N-1（下→上，不含左上角），顶边 2N..3N-1（左→右不含左下角），左边 3N..4N-1（上→下不含右上角）
// 当 N=1 时：4 边各 0 个内部点，4 角点 → 4 个点
// 返回 [{x, y, edge, idx_in_edge}]
function generateSquarePoints(cx, cy, side, n) {
  if (n < 1) throw new Error('每边端点数必须 >= 1');
  const half = side / 2;
  const left = cx - half, right = cx + half;
  const top = cy - half, bottom = cy + half;
  const points = [];
  // 设计：每边 N-1 个内部点（不含末角），4 角点共享 → 4(N-1) + 4 = 4N 个点，无重复
  // 当 N=1：每边 0 个内部点 + 4 角点（每条边 push 1 个角点） = 4 个点
  // 当 N>1：每边 push i=0 (首角) + i=1..N-2 (内部)，跳过 i=N-1 (末角 → 由下一条边 push)
  // 总计：N=1 → 4; N>1 → 4(N-1) = 4N-4
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 1 : i / (n - 1);
    if (n > 1 && i === n - 1) continue;
    points.push({ x: left + t * side, y: bottom, edge: 0, idx: i });
  }
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 1 : i / (n - 1);
    if (n > 1 && i === n - 1) continue;
    points.push({ x: right, y: bottom - t * side, edge: 1, idx: i });
  }
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 1 : i / (n - 1);
    if (n > 1 && i === n - 1) continue;
    points.push({ x: right - t * side, y: top, edge: 2, idx: i });
  }
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 1 : i / (n - 1);
    if (n > 1 && i === n - 1) continue;
    points.push({ x: left, y: top + t * side, edge: 3, idx: i });
  }
  return points;
}

// 按规则生成连线对：pairs[i] = {from, to}
// 规则：纯函数 k(i) → number，取模 4N
// kStr 是用户输入的 k(i) 公式
function generateConnections(kStr, n) {
  if (!kStr || !kStr.trim()) throw new Error('连线规则不能为空');
  const total = 4 * n;
  const allowed = /^[a-zA-Z0-9_+\-*/%().,\s]+$/;
  if (!allowed.test(kStr)) {
    throw new Error('连线规则包含非法字符');
  }
  let kfn;
  try {
    kfn = new Function('i', 'n', `with (Math) { return (${kStr}); }`);
  } catch (e) {
    throw new Error('规则语法错误: ' + e.message);
  }
  const pairs = [];
  for (let i = 0; i < total; i++) {
    let target;
    try {
      target = kfn(i, n);
    } catch (e) {
      throw new Error(`规则求值错误(i=${i}): ${e.message}`);
    }
    if (typeof target !== 'number' || !isFinite(target)) {
      throw new Error(`规则必须返回有限数字(i=${i}: ${target})`);
    }
    // 取模到 [0, 4N)
    const t = ((target % total) + total) % total;
    const tInt = Math.floor(t);
    if (tInt !== i) {  // 跳过自连线
      pairs.push({ from: i, to: tInt });
    }
  }
  return pairs;
}

// ========== 功能 2: 五维函数 (x, y, r, g, b) ==========
// 在像素 (px, py) 计算 (r, g, b) 颜色值（0-255 整数）
// x ∈ [xMin, xMax], y ∈ [yMin, yMax]（用户输入范围）
// 默认 [-1, 1] × [-1, 1]
function colorAt(px, py, w, h, rStr, gStr, bStr, xMin, xMax, yMin, yMax) {
  const x = xMin + (px / w) * (xMax - xMin);
  // y 翻转：canvas 顶部 y=0 对应 yMax
  const y = yMax - (py / h) * (yMax - yMin);
  const clamp = (v) => {
    if (typeof v !== 'number' || !isFinite(v)) return 0;
    if (v < 0) return 0;
    if (v > 1) return 1;
    return v;
  };
  const r = clamp(evalFunction2D(rStr, x, y));
  const g = clamp(evalFunction2D(gStr, x, y));
  const b = clamp(evalFunction2D(bStr, x, y));
  return [
    Math.round(r * 255),
    Math.round(g * 255),
    Math.round(b * 255),
  ];
}

// 完整渲染：填充 canvas 图像数据
// 返回 ImageData（Node.js 用 Uint8ClampedArray；浏览器用 ImageData）
function renderColorField(w, h, rStr, gStr, bStr, xMin, xMax, yMin, yMax) {
  const total = w * h * 4;
  const data = new Uint8ClampedArray(total);
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const [r, g, b] = colorAt(px, py, w, h, rStr, gStr, bStr, xMin, xMax, yMin, yMax);
      const idx = (py * w + px) * 4;
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 255;  // alpha
    }
  }
  return data;
}

// Node.js 导出（测试用）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    evalFunction,
    evalFunction2D,
    generatePoints,
    generateSquarePoints,
    generateConnections,
    colorAt,
    renderColorField,
  };
}
