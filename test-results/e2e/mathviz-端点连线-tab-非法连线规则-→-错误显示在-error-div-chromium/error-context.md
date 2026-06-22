# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mathviz.spec.js >> 端点连线 tab >> 非法连线规则 → 错误显示在 error div
- Location: tests/e2e/mathviz.spec.js:67:3

# Error details

```
Error: expect(received).toContain(expected) // indexOf

Expected substring: "非法字符"
Received string:    "错误: 规则求值错误(i=0): process is not defined"
```

# Page snapshot

```yaml
- generic [ref=e1]:
  - banner [ref=e2]:
    - heading "MathViz" [level=1] [ref=e3]
    - paragraph [ref=e4]: 数学函数可视化（SDLC 跨项目验证 · arch://b9a407b1）
  - generic [ref=e5]:
    - generic [ref=e6] [cursor=pointer]: 端点连线
    - generic [ref=e7] [cursor=pointer]: 五维函数 (x,y,r,g,b)
    - generic [ref=e8] [cursor=pointer]: 函数曲线 (y=f(x))
  - generic [ref=e9]:
    - generic [ref=e10]:
      - generic [ref=e11]:
        - text: "每边端点数 N:"
        - spinbutton "每边端点数 N:" [ref=e12]: "20"
      - generic [ref=e13]:
        - text: "连线规则 k(i):"
        - textbox "连线规则 k(i):" [ref=e14]: process.exit(1)
      - button "绘制" [active] [ref=e15] [cursor=pointer]
      - button "导出 PNG" [ref=e16] [cursor=pointer]
    - generic [ref=e18]: "错误: 规则求值错误(i=0): process is not defined"
  - contentinfo [ref=e19]:
    - generic [ref=e20]:
      - text: 由 SDLC 工作流部署 ·
      - link "源码" [ref=e21] [cursor=pointer]:
        - /url: https://github.com/AndyWongWithAI/sdic-demo-mathviz
```

# Test source

```ts
  1   | // tests/e2e/mathviz.spec.js - MathViz 端到端测试
  2   | // 覆盖：3 tab 切换 + 渲染按钮 + canvas 像素 + PNG 导出
  3   | //
  4   | // 怎么验证 canvas 有像素？canvas.toDataURL() 包含 'data:image/png;base64,'，长度 > 100 说明有内容
  5   | // 怎么验证不空白？计算 ImageData 的非白像素数（> 0）
  6   | //
  7   | // 运行：
  8   | //   npx playwright test                       # 跑全测（baseURL 来自 env 或 config 默认）
  9   | //   E2E_BASE_URL=http://localhost:8000 npx playwright test  # 本地测试
  10  | 
  11  | const { test, expect } = require('@playwright/test');
  12  | 
  13  | const URL = process.env.E2E_BASE_URL || 'https://mathviz.intelab.cn';
  14  | 
  15  | test.describe('MathViz 主页', () => {
  16  |   test('页头 + 3 tab 可见', async ({ page }) => {
  17  |     await page.goto(URL);
  18  |     await expect(page).toHaveTitle(/MathViz.*数学函数可视化/);
  19  |     await expect(page.locator('h1')).toHaveText('MathViz');
  20  |     await expect(page.locator('.tab')).toHaveCount(3);
  21  |     await expect(page.locator('.tab').nth(0)).toHaveText('端点连线');
  22  |     await expect(page.locator('.tab').nth(1)).toHaveText(/五维函数/);
  23  |     await expect(page.locator('.tab').nth(2)).toHaveText(/函数曲线/);
  24  |   });
  25  | 
  26  |   test('默认 tab 是端点连线', async ({ page }) => {
  27  |     await page.goto(URL);
  28  |     await expect(page.locator('#panel-points')).toBeVisible();
  29  |     await expect(page.locator('#panel-color')).toBeHidden();
  30  |     await expect(page.locator('#panel-curve')).toBeHidden();
  31  |   });
  32  | });
  33  | 
  34  | test.describe('端点连线 tab', () => {
  35  |   test('点"绘制"按钮不抛错，canvas 有像素', async ({ page }) => {
  36  |     const errors = [];
  37  |     page.on('pageerror', e => errors.push(e.message));
  38  | 
  39  |     await page.goto(URL);
  40  |     await expect(page.locator('#panel-points')).toBeVisible();
  41  | 
  42  |     // 默认值应该已触发一次（window.load 调 drawPoints）
  43  |     // 主动点一次按钮确保覆盖
  44  |     await page.click('#panel-points button:has-text("绘制")');
  45  | 
  46  |     // 验证 canvas 有内容（toDataURL 长度 > 200，说明有像素）
  47  |     const canvasLen = await page.evaluate(() => {
  48  |       const c = document.getElementById('canvas-points');
  49  |       return c.toDataURL('image/png').length;
  50  |     });
  51  |     expect(canvasLen, 'canvas 应有非空内容').toBeGreaterThan(200);
  52  |     expect(errors, 'page 应无 JS 错误').toEqual([]);
  53  |   });
  54  | 
  55  |   test('修改 N 后重绘仍正常', async ({ page }) => {
  56  |     await page.goto(URL);
  57  |     await page.fill('#pn', '50');
  58  |     await page.click('#panel-points button:has-text("绘制")');
  59  | 
  60  |     // 检查 canvas 仍然有内容
  61  |     const canvasLen = await page.evaluate(() => {
  62  |       return document.getElementById('canvas-points').toDataURL('image/png').length;
  63  |     });
  64  |     expect(canvasLen).toBeGreaterThan(200);
  65  |   });
  66  | 
  67  |   test('非法连线规则 → 错误显示在 error div', async ({ page }) => {
  68  |     await page.goto(URL);
  69  |     await page.fill('#pk', 'process.exit(1)');  // 沙箱应拒
  70  |     await page.click('#panel-points button:has-text("绘制")');
  71  | 
  72  |     // 错误应显示
  73  |     const errorText = await page.locator('#error-points').textContent();
  74  |     expect(errorText).toContain('错误');
> 75  |     expect(errorText).toContain('非法字符');
      |                       ^ Error: expect(received).toContain(expected) // indexOf
  76  |   });
  77  | });
  78  | 
  79  | test.describe('五维函数 tab', () => {
  80  |   test('切换 + 渲染 + canvas 有像素', async ({ page }) => {
  81  |     const errors = [];
  82  |     page.on('pageerror', e => errors.push(e.message));
  83  | 
  84  |     await page.goto(URL);
  85  |     await page.click('.tab[data-tab="color"]');
  86  |     await expect(page.locator('#panel-color')).toBeVisible();
  87  | 
  88  |     await page.click('#panel-color button:has-text("渲染")');
  89  | 
  90  |     // canvas 应有像素
  91  |     const canvasLen = await page.evaluate(() => {
  92  |       return document.getElementById('canvas-color').toDataURL('image/png').length;
  93  |     });
  94  |     expect(canvasLen).toBeGreaterThan(500);
  95  |     expect(errors, 'page 应无 JS 错误').toEqual([]);
  96  |   });
  97  | 
  98  |   test('裸数字小数（0.5）能渲染', async ({ page }) => {
  99  |     await page.goto(URL);
  100 |     await page.click('.tab[data-tab="color"]');
  101 | 
  102 |     // 用户写 0.5（之前沙箱会拒，现在应通过）
  103 |     await page.fill('#pr', '0.5');
  104 |     await page.fill('#pg', '0');
  105 |     await page.fill('#pb', '0');
  106 |     await page.click('#panel-color button:has-text("渲染")');
  107 | 
  108 |     const errorText = await page.locator('#error-color').textContent();
  109 |     expect(errorText.trim()).toBe('');  // 应无错误
  110 |   });
  111 | });
  112 | 
  113 | test.describe('函数曲线 tab', () => {
  114 |   test('切换 + 绘制 + canvas 有像素', async ({ page }) => {
  115 |     const errors = [];
  116 |     page.on('pageerror', e => errors.push(e.message));
  117 | 
  118 |     await page.goto(URL);
  119 |     await page.click('.tab[data-tab="curve"]');
  120 |     await expect(page.locator('#panel-curve')).toBeVisible();
  121 | 
  122 |     await page.click('#panel-curve button:has-text("绘制")');
  123 | 
  124 |     const canvasLen = await page.evaluate(() => {
  125 |       return document.getElementById('canvas-curve').toDataURL('image/png').length;
  126 |     });
  127 |     expect(canvasLen).toBeGreaterThan(200);
  128 |     expect(errors, 'page 应无 JS 错误').toEqual([]);
  129 |   });
  130 | });
  131 | 
  132 | test.describe('PNG 导出', () => {
  133 |   test('点"导出 PNG"触发下载', async ({ page }) => {
  134 |     await page.goto(URL);
  135 | 
  136 |     // 默认 tab 是端点连线，等其渲染完
  137 |     await page.waitForFunction(() => {
  138 |       return document.getElementById('canvas-points').toDataURL('image/png').length > 200;
  139 |     }, { timeout: 5000 });
  140 | 
  141 |     // 监听下载
  142 |     const downloadPromise = page.waitForEvent('download');
  143 |     await page.click('#panel-points button:has-text("导出 PNG")');
  144 |     const download = await downloadPromise;
  145 | 
  146 |     // 验证文件名以 mathviz-points- 开头，以 .png 结尾
  147 |     expect(download.suggestedFilename()).toMatch(/^mathviz-points-.*\.png$/);
  148 | 
  149 |     // 保存到临时位置验证 size > 0
  150 |     const path = await download.path();
  151 |     const fs = require('fs');
  152 |     const stat = fs.statSync(path);
  153 |     expect(stat.size).toBeGreaterThan(100);
  154 |   });
  155 | });
  156 | 
  157 | test.describe('性能（NFR: Canvas 渲染 < 1s）', () => {
  158 |   test('800x600 canvas 渲染 < 1s', async ({ page }) => {
  159 |     await page.goto(URL);
  160 |     const start = Date.now();
  161 |     await page.click('#panel-points button:has-text("绘制")');
  162 |     const elapsed = Date.now() - start;
  163 |     expect(elapsed, `渲染耗时 ${elapsed}ms`).toBeLessThan(1000);
  164 |   });
  165 | });
  166 | 
```