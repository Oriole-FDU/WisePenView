# WisePenView Agent 规约

这是 WisePenView 的常驻 agent 入口。先读本文件，再根据任务类型读取 `agent/docs`、`agent/skills` 或 `agent/workflows` 中的相关内容；不要一次性预读全部文档。

## 项目事实

- 技术栈：Vite、React 19、TypeScript strict、Less CSS Modules、HeroUI、ahooks、zustand；运行版本以 `.nvmrc` 和 `package.json#packageManager` 为准。
- 注释使用中文；commit message 使用中文 Conventional Commit。

## 任务路由

- Bug 或缺陷：先读 `agent/workflows/bug-to-pr.md`，需要重复执行时读 `agent/skills/bug-fix/SKILL.md`。
- 创建分支和 PR：读 `agent/skills/pr-create/SKILL.md` 与 `agent/templates/pull-request.md`。
- 处理 PR Review：读 `agent/workflows/review-to-patch.md` 与 `agent/skills/pr-review-followup/SKILL.md`。
- CI 失败：读 `agent/skills/ci-failure/SKILL.md`。
- 发布或版本任务：读 `agent/workflows/release.md` 与 `agent/docs/release.md`。
- 编码与架构：按 `agent/docs/README.md` 定位 Domain、Component、路由、状态等专题。
- 验证和提交：分别读 `agent/docs/verification.md`、`agent/docs/commit.md`。

## 工作边界

- 修改前必须查看 `git status --short`，不得覆盖或回滚用户已有改动。
- 先用 `rg` 查找同域、同类型实现，保持改动范围贴近任务。
- 不确定接口字段、权限边界或后端契约时先确认，不用 fallback 掩盖不确定性。
- 未经用户明确要求，不启动 `pnpm dev`、`pnpm mock`，不进入浏览器或可视化调试。
- 外部写操作（push、创建 PR、发送 Review 回复、修改 GitHub 设置）必须得到用户明确授权。

## 验证和交付

- 按 `agent/docs/verification.md` 选择并记录检查；代码任务至少运行 `pnpm lint`。
- 只有用户明确要求时才运行运行态验证，并记录浏览器、窗口尺寸和场景。
- 交付说明必须包含：改动、原因、验证结果、未验证项和剩余风险。

## Git 与 PR

- 分支与提交格式遵循 `agent/docs/commit.md`；默认基于 `main`。
- 除非用户特别说明，PR 默认提交到 `main`。
- PR 必须说明问题、根因、变更、验证、未验证项和 Review 重点。
- Review 修改应回到原 PR 分支，逐条对应评论并重新验证，不新开无关 PR。

## 文档和 Codex 配置

- 流程位于 `agent/workflows`；可复用 Skill 位于 `agent/skills`。
- 项目级 `.codex` 只放安全、可共享的环境设置，不放模型、审批策略、沙箱权限、个人路径或密钥；当前仓库不提交项目级 Codex 配置文件。
- 个人偏好、默认审批、MCP 和凭据放在 `~/.codex` 或组织级配置中。
- 涉及 Codex、OpenAI API 或 Codex 配置时，优先查阅官方 OpenAI 文档。
