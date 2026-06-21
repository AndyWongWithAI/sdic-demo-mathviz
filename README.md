# MathViz

数学函数可视化网站。SDLC workflow 跨项目验证 demo。

## 背景

- **目标需求**：[arch://b9a407b1](https://arch.intelab.cn)（架构平台 P2 draft，「通过数学函数绘图的网站」）
- **验证目标**：把 SDLC Phase 4-6 workflow（CI/测试/部署）接入到非架构平台的真实项目
- **关联 plan**：[staged-cuddling-bird.md](https://github.com/AndyWongWithAI/Architecture-Platform/blob/main/.claude/plans/)（aace22c5 SDLC workflow 实施）

## 技术栈

- 纯 HTML5 + CSS + Vanilla JS
- HTML5 Canvas 绘图
- 零运行时依赖（测试用 Node 内置 assert）

## 本地运行

```bash
# 启动本地服务（任意静态文件服务器）
python3 -m http.server 8080
# 或
npx serve .
```

访问 http://localhost:8080

## 测试

```bash
node tests/test_math.js
```

## SDLC workflow 接入

本项目使用 `~/.claude/skills/sdlc/templates/` 下的模板：

| Workflow | 来源 | 作用 |
|---|---|---|
| `.github/workflows/sdlc-registry.json` | `templates/sdlc-registry.json` | 项目级 workflow 注册表 |
| `.github/workflows/sdlc-dispatcher.yml` | `templates/sdlc-dispatcher.yml` | 调度器（读 registry 决定跑哪些）|
| `.github/workflows/sdlc-ci.yml` | `templates/sdlc-ci.yml` | Phase 4 CI（lint/test/coverage/docker-build/trivy）|
| `.github/workflows/sdlc-test.yml` | `templates/sdlc-test.yml` | Phase 5 多栈测试模板 |
| `.github/workflows/sdlc-deploy.yml` | `templates/sdlc-deploy.yml` | Phase 6 部署 |

替换任一 workflow：改 `sdlc-registry.json` 1 行 + 提交新 yaml，其他无感（这是 plan §AC #6 的实现验证）。

## 项目结构

```
sdic-demo-mathviz/
├── index.html           # 主页（Canvas + 控制面板）
├── style.css            # 样式
├── math.js              # 数学函数求值（浏览器 + Node 兼容）
├── app.js               # Canvas 绘图逻辑（仅浏览器）
├── tests/
│   └── test_math.js     # 单元测试（Node assert）
├── aip.json             # 架构平台元数据（SDLC 必备）
├── README.md
├── .gitignore
└── .github/
    └── workflows/
        ├── sdlc-registry.json
        ├── sdlc-dispatcher.yml
        ├── sdlc-ci.yml
        ├── sdlc-test.yml
        └── sdlc-deploy.yml
```

## 关联

- 架构平台需求：`b9a407b1-fad3-400e-b837-30325083a003`
- SDLC plan：`aace22c5-f06d-4f86-b0fc-ae3274ebf978`（triaged）
- SDLC 适配机制：`~/.claude/specs/sdlc/manifest-schema.md`