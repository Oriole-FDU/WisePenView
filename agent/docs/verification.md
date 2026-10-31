# 验证矩阵

## 基础规则

- 修改前后检查 `git status --short`。
- 代码任务至少运行 `pnpm lint`。
- 交付说明记录实际运行的命令和结果；没有运行的检查不能写成已通过。
- 构建失败时先修复第一个真实错误，不用跳过检查或扩大 ESLint 禁止范围。

## 按变更范围选择

| 变更范围                               | 必需验证                                                                     | 条件验证                                                     |
| -------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Markdown、模板、普通配置               | `git diff --check`                                                           | `pnpm lint`（若影响 JS 配置）                                |
| `src/**/*.ts(x)`                       | `pnpm lint`、`pnpm typecheck`                                                | `pnpm build`（跨层或构建配置）                               |
| `src/**/*.{less,scss,css}`、主题 token | `pnpm lint`、`pnpm check:radius`、`pnpm check:z-index`、`pnpm check:spacing` | `pnpm build-storybook`（stories 变更）                       |
| `src/domains/**`、registry、mock       | `pnpm lint`、`pnpm typecheck`、`pnpm check:api-contracts`                    | `pnpm build`                                                 |
| `vite.config.ts`、tsconfig、Electron   | `pnpm lint`、`pnpm typecheck`、`pnpm build`                                  | 对应打包脚本                                                 |
| 应用初始化、认证与运行时配置           | `pnpm lint`、`pnpm typecheck`、`pnpm build`                                  | `pnpm build --mode mock`、配置错误启动检查、浏览器运行态回归 |
| 前端可观测性与异常捕获                 | `pnpm lint`、`pnpm typecheck`、`pnpm test:observability`、`pnpm build`       | Collector、OTLP 内容、私有附件权限和浏览器运行态             |
| Storybook 配置或 stories               | `pnpm lint`、`pnpm typecheck`                                                | `pnpm build-storybook`                                       |
| UI 交互、路由、浮层                    | 上述静态检查                                                                 | 用户明确授权后运行 mock 或浏览器回归                         |

## CI 契约

PR CI 固定执行 commitlint、格式检查、lint、核心行为回归、类型检查、build、API 与 Domain 边界、token 和 whitespace 检查。`Code Quality & Build Gate` 是 GitHub branch protection 的稳定检查名，修改 job 名称前必须同步仓库设置。

本地可用 `pnpm verify:ci` 并行执行与 CI 相同的格式、lint、契约检查、类型检查和构建步骤。

`pnpm check:api-contracts` 直接禁止领域代码绕过统一请求契约：不允许 unchecked、直接 transport 或直接 fetch 调用，不维护迁移白名单。Contract 总数仅输出统计，不作为固定数量门禁。

## 测试保留原则

- 任务交付不默认新增持久化测试。一次性修复验证、迁移验收可执行后丢弃，不自动进入仓库和 CI。
- 新增常驻测试必须说明其保护的长期风险、现有检查为何不足，以及维护收益；不能仅以“本次修改需要验证”为理由。
- 当前只保留共享 Schema 与请求契约、鉴权、编辑会话、前端状态、HTML 安全约束和可观测性核心回归，由 `pnpm test` 收集。
- 不保留逐领域契约迁移脚本、mock 全链路验收和样式实现快照，也不要求先新增替代测试才能删除低价值检查。
- 生产 Schema、开发 mock 和发布产物安全检查继续保留。样式编译由应用构建覆盖，未引用样式不再单独全量编译；视觉、布局或交互只在用户授权后进行运行态验证。

SCSS 迁移系列的依赖 PR 以具名迁移分支为 base 时，仍运行同一 `Code Quality & Build Gate`。系列全部合入后可单独清理临时分支触发配置。

## 运行态记录

运行 mock 或浏览器时记录：日期、浏览器版本、窗口尺寸、操作步骤、预期结果、实际结果和控制台错误。没有启动服务时，不要声称完成页面行为验证。

可观测性运行态还需检查 OTLP logs/traces 状态、关键上下文、URL query 和凭据脱敏、
同对象去重、逻辑请求与重试子 span、最终失败分类及 source map release 是否一致。

运行态涉及初始化、认证或资源路由时，至少覆盖 `/login`、`/chat`、`/drive/personal`、资源 PDF／Note／Office／Draw.io 路由；需要时观察首次探测、online／offline、visibilitychange 及停止后的网络请求。应确认资源使用集中配置，mock 模式不发起校内探测，401 只由 App 提示一次并完成登录回跳。
