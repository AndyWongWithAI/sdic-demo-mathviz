// math.js - 数学函数求值 + 点生成（浏览器 + Node.js 兼容）

// 安全求值：白名单字符 + Function 构造器
function evalFunction(funcStr, x) {
  // 白名单：仅允许字母、数字、下划线、运算符、Math 对象
  const allowed = /^[a-zA-Z0-9_+\-*/().,\s]+$/;
  if (!allowed.test(funcStr)) {
    throw new Error('函数包含非法字符（仅允许字母/数字/运算符）');
  }
  let fn;
  try {
    fn = new Function('x', `with (Math) { return (${funcStr}); }`);
  } catch (e) {
    throw new Error('函数语法错误: ' + e.message);
  }
  const result = fn(x);
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

// Node.js 导出（测试用）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { evalFunction, generatePoints };
}