# WisePenView Agent 规约

这是 WisePenView 的项目级 agent 入口。先读本文件，再根据任务类型读取 `agent/docs`、`agent/skills` 或 `agent/workflows` 中的相关内容；不要一次性预读全部文档。

## 项目事实

- 技术栈：Vite、React 19、TypeScript strict、Less CSS Modules、HeroUI、ahooks、zustand。
- 运行环境：Node.js `22.23.2`，pnpm `11.13.1`，版本由 `.nvmrc` 和 `package.json#packageManager` 固定。
- 入口命令：`pnpm lint`、`pnpm typecheck`、`pnpm build`、`pnpm check:mock`。
- 注释使用中文；commit message 使用中文 Conventional Commit。
- UI 基础控件使用 HeroUI 或项目已有封装。

## 任务路由

- Bug 或缺陷：先读 `agent/workflows/bug-to-pr.md`，需要重复执行时读 `agent/skills/bug-fix/SKILL.md`。
- 创建分支和 PR：读 `agent/skills/pr-create/SKILL.md` 与 `agent/templates/pull-request.md`。
- 处理 PR Review：读 `agent/workflows/review-to-patch.md` 与 `agent/skills/pr-review-followup/SKILL.md`。
- CI 失败：读 `agent/skills/ci-failure/SKILL.md`。
- Domain 链路：按 `view/component -> service -> mapper -> api -> entity/enum` 读取 `agent/docs/domain-*.md`。
- Component、View、Hook、样式：读取 `agent/docs/component-*.md`；路由、状态、浮层和颜色按需读取对应专题文档。
- 提交规范：读取 `agent/docs/commit.md`。

## 工作边界

- 修改前必须查看 `git status --short`，不得覆盖或回滚用户已有改动。
- 先用 `rg` 查找同域、同类型实现，保持改动范围贴近任务。
- 不确定接口字段、权限边界或后端契约时先确认，不用 fallback 掩盖不确定性。
- 未经用户明确要求，不启动 `pnpm dev`、`pnpm mock`，不进入浏览器或可视化调试。
- 外部写操作（push、创建 PR、发送 Review 回复、修改 GitHub 设置）必须得到用户明确授权。
- 代码只写函数组件和 Hooks；不新增 `any`、`React.FC`、`useUpdateEffect`。
- 默认不用 `useEffect`、`useMemo`、`useCallback`；确有必要时遵守对应中文 JSDoc 和 ESLint 规则。
- API DTO 只放在 `src/domains/<Domain>/apis`，组件不直接消费 raw DTO。
- Service 不直接 import Axios、其它 service 实现或 UI；跨 service 依赖由 registry 注入。
- `src/components/base` 不得依赖 `business`；页面私有业务 UI 优先放在 `src/views`。
- 重构或迁移完成后删除旧 API、wrapper、alias 和重复实现，不保留临时双路径。

## 验证和交付

- 代码任务至少运行 `pnpm lint`；涉及类型、Domain、跨层链路或构建时按 `agent/docs/verification.md` 增加检查。
- Domain、registry 或 mock 变更运行 `pnpm check:mock`。
- Vite、Electron、环境配置或跨层变更运行 `pnpm build`。
- 只有用户明确要求时才运行运行态验证，并记录浏览器、窗口尺寸和场景。
- 交付说明必须包含：改动、原因、验证结果、未验证项和剩余风险。

## Git 与 PR

- 默认从 `main` 创建任务分支；分支使用 `agent-<content>`，人工分支可使用 `feat/<content>`、`fix/<content>` 或 `refactor/<content>`。
- 一个 commit 表达一个意图，type 必须使用 commitlint 白名单，subject 使用中文。
- PR 默认提交到 `main`；只有用户明确要求时才使用 `dev`。
- PR 必须说明问题、根因、变更、验证、未验证项和 Review 重点。
- Review 修改应回到原 PR 分支，逐条对应评论并重新验证，不新开无关 PR。

## 文档和 Codex 配置

- 架构专题文档位于 `agent/docs`；流程位于 `agent/workflows`；可复用 Skill 位于 `agent/skills`。
- 项目级 `.codex` 只放安全、可共享的环境设置，不放模型、审批策略、沙箱权限、个人路径或密钥；当前仓库不提交项目级 Codex 配置文件。
- 个人偏好、默认审批、MCP 和凭据放在 `~/.codex` 或组织级配置中。
- 涉及 Codex、OpenAI API 或 Codex 配置时，优先查阅官方 OpenAI 文档。
