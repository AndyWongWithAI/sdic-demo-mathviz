// app.js - MathViz 渲染逻辑（仅浏览器）

// ========== Tab 切换 ==========
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    const target = tab.dataset.tab;
    document.getElementById('panel-' + target).classList.add('active');
  });
});

// ========== 功能 1: 端点连线 ==========
function drawPoints() {
  const canvas = document.getElementById('canvas-points');
  const ctx = canvas.getContext('2d');
  const errorEl = document.getElementById('error-points');
  errorEl.textContent = '';

  const n = parseInt(document.getElementById('pn').value, 10);
  const kStr = document.getElementById('pk').value.trim();

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  let points, pairs;
  try {
    const cx = canvas.width / 2, cy = canvas.height / 2;
    const side = Math.min(canvas.width, canvas.height) * 0.85;
    points = generateSquarePoints(cx, cy, side, n);
    pairs = generateConnections(kStr, n);
  } catch (e) {
    errorEl.textContent = '错误: ' + e.message;
    return;
  }

  // 1. 画连线（先画线，再画点，线条不盖住点）
  ctx.strokeStyle = 'rgba(0, 102, 204, 0.4)';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  for (const { from, to } of pairs) {
    const a = points[from], b = points[to];
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
  }
  ctx.stroke();

  // 2. 画正方形边框
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 2;
  ctx.strokeRect(
    canvas.width / 2 - Math.min(canvas.width, canvas.height) * 0.425,
    canvas.height / 2 - Math.min(canvas.width, canvas.height) * 0.425,
    Math.min(canvas.width, canvas.height) * 0.85,
    Math.min(canvas.width, canvas.height) * 0.85
  );

  // 3. 画端点
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    ctx.fillStyle = '#c00';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // 4. 顶部编号（第一个端点）
  if (points.length > 0) {
    ctx.fillStyle = '#333';
    ctx.font = '12px monospace';
    ctx.fillText(`0`, points[0].x - 10, points[0].y + 4);
  }

  // 5. 信息
  ctx.fillStyle = '#666';
  ctx.font = '13px monospace';
  ctx.fillText(`N=${n}  4N=${4 * n}  连线数=${pairs.length}  规则: k(i) = ${kStr}`, 10, 20);
}

// ========== 功能 2: 五维函数 (x,y,r,g,b) ==========
function drawColor() {
  const canvas = document.getElementById('canvas-color');
  const ctx = canvas.getContext('2d');
  const errorEl = document.getElementById('error-color');
  errorEl.textContent = '';

  const rStr = document.getElementById('pr').value.trim();
  const gStr = document.getElementById('pg').value.trim();
  const bStr = document.getElementById('pb').value.trim();

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  try {
    const w = canvas.width, h = canvas.height;
    const data = renderColorField(w, h, rStr, gStr, bStr, -1, 1, 1, -1);
    const imgData = new ImageData(data, w, h);
    ctx.putImageData(imgData, 0, 0);
  } catch (e) {
    errorEl.textContent = '错误: ' + e.message;
    return;
  }

  // 信息
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillRect(8, 8, 280, 38);
  ctx.fillStyle = '#333';
  ctx.font = '11px monospace';
  ctx.fillText(`R(x,y) = ${rStr}`, 12, 22);
  ctx.fillText(`G(x,y) = ${gStr}`, 12, 36);
}

// ========== 功能 3: 函数曲线（旧版）==========
function drawCurve() {
  const canvas = document.getElementById('canvas-curve');
  const ctx = canvas.getContext('2d');
  const errorEl = document.getElementById('error-curve');
  errorEl.textContent = '';

  const funcStr = document.getElementById('cf').value.trim();
  const xMin = parseFloat(document.getElementById('cxmin').value);
  const xMax = parseFloat(document.getElementById('cxmax').value);

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

  const ys = points.map(p => p[1]);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);
  const yRange = (yMax - yMin) || 1;

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

  ctx.strokeStyle = '#999';
  ctx.lineWidth = 1;
  ctx.beginPath();
  const y0 = canvas.height - (0 - yMin) / yRange * canvas.height;
  if (y0 >= 0 && y0 <= canvas.height) {
    ctx.moveTo(0, y0);
    ctx.lineTo(canvas.width, y0);
  }
  const x0 = (0 - xMin) / (xMax - xMin) * canvas.width;
  if (x0 >= 0 && x0 <= canvas.width) {
    ctx.moveTo(x0, 0);
    ctx.lineTo(x0, canvas.height);
  }
  ctx.stroke();

  ctx.fillStyle = '#666';
  ctx.font = '12px monospace';
  ctx.fillText(`f(x) = ${funcStr}`, 10, 20);
  ctx.fillText(`y range: [${yMin.toFixed(2)}, ${yMax.toFixed(2)}]`, 10, canvas.height - 10);
}

// ========== 功能 4: PNG 导出 ==========
function exportCanvas(canvasId) {
  const canvas = document.getElementById(canvasId);
  const dataUrl = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const mode = canvasId.replace('canvas-', '');
  a.download = `mathviz-${mode}-${ts}.png`;
  a.href = dataUrl;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ========== 初始化：默认渲染当前 tab ==========
window.addEventListener('load', () => {
  drawPoints();  // 默认第一个 tab
});
