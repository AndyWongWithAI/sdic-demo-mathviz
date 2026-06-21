// app.js - Canvas 绘图逻辑（仅浏览器）
function draw() {
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  const errorEl = document.getElementById('error');
  errorEl.textContent = '';

  const funcStr = document.getElementById('func').value.trim();
  const xMin = parseFloat(document.getElementById('xmin').value);
  const xMax = parseFloat(document.getElementById('xmax').value);

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  let points;
  try {
    points = generatePoints(funcStr, xMin, xMax);
  } catch (e) {
    errorEl.textContent = '错误: ' + e.message;
    return;
  }
  if (points.length === 0) {
    errorEl.textContent = '无有效点（函数在区间内无定义）';
    return;
  }

  // 自动算 y 范围
  const ys = points.map(p => p[1]);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);
  const yRange = (yMax - yMin) || 1;

  // 画函数曲线
  ctx.strokeStyle = '#0066cc';
  ctx.lineWidth = 2;
  ctx.beginPath();
  points.forEach(([x, y], i) => {
    const cx = (x - xMin) / (xMax - xMin) * canvas.width;
    const cy = canvas.height - (y - yMin) / yRange * canvas.height;
    if (i === 0) ctx.moveTo(cx, cy);
    else ctx.lineTo(cx, cy);
  });
  ctx.stroke();

  // 坐标轴
  ctx.strokeStyle = '#999';
  ctx.lineWidth = 1;
  ctx.beginPath();
  // x 轴
  const y0 = canvas.height - (0 - yMin) / yRange * canvas.height;
  if (y0 >= 0 && y0 <= canvas.height) {
    ctx.moveTo(0, y0);
    ctx.lineTo(canvas.width, y0);
  }
  // y 轴
  const x0 = (0 - xMin) / (xMax - xMin) * canvas.width;
  if (x0 >= 0 && x0 <= canvas.width) {
    ctx.moveTo(x0, 0);
    ctx.lineTo(x0, canvas.height);
  }
  ctx.stroke();

  // 文本：信息
  ctx.fillStyle = '#666';
  ctx.font = '12px monospace';
  ctx.fillText(`f(x) = ${funcStr}`, 10, 20);
  ctx.fillText(`y range: [${yMin.toFixed(2)}, ${yMax.toFixed(2)}]`, 10, canvas.height - 10);
}

window.addEventListener('load', draw);