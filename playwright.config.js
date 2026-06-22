// playwright.config.js - Playwright E2E 测试配置
// 覆盖：3 tab 切换 + 渲染按钮 + canvas 像素 + PNG 导出

const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,        // 共享同一站点，串行
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,  // CI 失败重试 1 次
  workers: 1,                  // 单 worker
  reporter: process.env.CI
    ? [['list'], ['github']]
    : [['list']],
  outputDir: './test-results/e2e',
  use: {
    baseURL: process.env.E2E_BASE_URL || 'https://mathviz.intelab.cn',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    headless: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  timeout: 30 * 1000,
  expect: { timeout: 5000 },
});
