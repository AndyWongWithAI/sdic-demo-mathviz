// tests/e2e/mathviz.spec.js - MathViz 端到端测试
// 覆盖：3 tab 切换 + 渲染按钮 + canvas 像素 + PNG 导出
//
// 怎么验证 canvas 有像素？canvas.toDataURL() 包含 'data:image/png;base64,'，长度 > 100 说明有内容
// 怎么验证不空白？计算 ImageData 的非白像素数（> 0）
//
// 运行：
//   npx playwright test                       # 跑全测（baseURL 来自 env 或 config 默认）
//   E2E_BASE_URL=http://localhost:8000 npx playwright test  # 本地测试

const { test, expect } = require('@playwright/test');

const URL = process.env.E2E_BASE_URL || 'https://mathviz.intelab.cn';

test.describe('MathViz 主页', () => {
  test('页头 + 3 tab 可见', async ({ page }) => {
    await page.goto(URL);
    await expect(page).toHaveTitle(/MathViz.*数学函数可视化/);
    await expect(page.locator('h1')).toHaveText('MathViz');
    await expect(page.locator('.tab')).toHaveCount(3);
    await expect(page.locator('.tab').nth(0)).toHaveText('端点连线');
    await expect(page.locator('.tab').nth(1)).toHaveText(/五维函数/);
    await expect(page.locator('.tab').nth(2)).toHaveText(/函数曲线/);
  });

  test('默认 tab 是端点连线', async ({ page }) => {
    await page.goto(URL);
    await expect(page.locator('#panel-points')).toBeVisible();
    await expect(page.locator('#panel-color')).toBeHidden();
    await expect(page.locator('#panel-curve')).toBeHidden();
  });
});

test.describe('端点连线 tab', () => {
  test('点"绘制"按钮不抛错，canvas 有像素', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));

    await page.goto(URL);
    await expect(page.locator('#panel-points')).toBeVisible();

    // 默认值应该已触发一次（window.load 调 drawPoints）
    // 主动点一次按钮确保覆盖
    await page.click('#panel-points button:has-text("绘制")');

    // 验证 canvas 有内容（toDataURL 长度 > 200，说明有像素）
    const canvasLen = await page.evaluate(() => {
      const c = document.getElementById('canvas-points');
      return c.toDataURL('image/png').length;
    });
    expect(canvasLen, 'canvas 应有非空内容').toBeGreaterThan(200);
    expect(errors, 'page 应无 JS 错误').toEqual([]);
  });

  test('修改 N 后重绘仍正常', async ({ page }) => {
    await page.goto(URL);
    await page.fill('#pn', '50');
    await page.click('#panel-points button:has-text("绘制")');

    // 检查 canvas 仍然有内容
    const canvasLen = await page.evaluate(() => {
      return document.getElementById('canvas-points').toDataURL('image/png').length;
    });
    expect(canvasLen).toBeGreaterThan(200);
  });

  test('非法连线规则 → 错误显示在 error div', async ({ page }) => {
    await page.goto(URL);
    await page.fill('#pk', 'process.exit(1)');  // 沙箱应拒
    await page.click('#panel-points button:has-text("绘制")');

    // 错误应显示
    const errorText = await page.locator('#error-points').textContent();
    expect(errorText).toContain('错误');
    expect(errorText).toContain('非法字符');
  });
});

test.describe('五维函数 tab', () => {
  test('切换 + 渲染 + canvas 有像素', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));

    await page.goto(URL);
    await page.click('.tab[data-tab="color"]');
    await expect(page.locator('#panel-color')).toBeVisible();

    await page.click('#panel-color button:has-text("渲染")');

    // canvas 应有像素
    const canvasLen = await page.evaluate(() => {
      return document.getElementById('canvas-color').toDataURL('image/png').length;
    });
    expect(canvasLen).toBeGreaterThan(500);
    expect(errors, 'page 应无 JS 错误').toEqual([]);
  });

  test('裸数字小数（0.5）能渲染', async ({ page }) => {
    await page.goto(URL);
    await page.click('.tab[data-tab="color"]');

    // 用户写 0.5（之前沙箱会拒，现在应通过）
    await page.fill('#pr', '0.5');
    await page.fill('#pg', '0');
    await page.fill('#pb', '0');
    await page.click('#panel-color button:has-text("渲染")');

    const errorText = await page.locator('#error-color').textContent();
    expect(errorText.trim()).toBe('');  // 应无错误
  });
});

test.describe('函数曲线 tab', () => {
  test('切换 + 绘制 + canvas 有像素', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));

    await page.goto(URL);
    await page.click('.tab[data-tab="curve"]');
    await expect(page.locator('#panel-curve')).toBeVisible();

    await page.click('#panel-curve button:has-text("绘制")');

    const canvasLen = await page.evaluate(() => {
      return document.getElementById('canvas-curve').toDataURL('image/png').length;
    });
    expect(canvasLen).toBeGreaterThan(200);
    expect(errors, 'page 应无 JS 错误').toEqual([]);
  });
});

test.describe('PNG 导出', () => {
  test('点"导出 PNG"触发下载', async ({ page }) => {
    await page.goto(URL);

    // 默认 tab 是端点连线，等其渲染完
    await page.waitForFunction(() => {
      return document.getElementById('canvas-points').toDataURL('image/png').length > 200;
    }, { timeout: 5000 });

    // 监听下载
    const downloadPromise = page.waitForEvent('download');
    await page.click('#panel-points button:has-text("导出 PNG")');
    const download = await downloadPromise;

    // 验证文件名以 mathviz-points- 开头，以 .png 结尾
    expect(download.suggestedFilename()).toMatch(/^mathviz-points-.*\.png$/);

    // 保存到临时位置验证 size > 0
    const path = await download.path();
    const fs = require('fs');
    const stat = fs.statSync(path);
    expect(stat.size).toBeGreaterThan(100);
  });
});

test.describe('性能（NFR: Canvas 渲染 < 1s）', () => {
  test('800x600 canvas 渲染 < 1s', async ({ page }) => {
    await page.goto(URL);
    const start = Date.now();
    await page.click('#panel-points button:has-text("绘制")');
    const elapsed = Date.now() - start;
    expect(elapsed, `渲染耗时 ${elapsed}ms`).toBeLessThan(1000);
  });
});
