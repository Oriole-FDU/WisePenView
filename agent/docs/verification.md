# 验证矩阵

## 基础规则

- 修改前后检查 `git status --short`。
- 代码任务至少运行 `pnpm lint`。
- 交付说明记录实际运行的命令和结果；没有运行的检查不能写成已通过。
- 构建失败时先修复第一个真实错误，不用跳过检查或扩大 ESLint 禁止范围。

## 按变更范围选择

| 变更范围                               | 必需验证                                                                                          | 条件验证                                                     |
| -------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Markdown、模板、普通配置               | `git diff --check`                                                                                | `pnpm lint`（若影响 JS 配置）                                |
| `src/**/*.ts(x)`                       | `pnpm lint`、`pnpm typecheck`                                                                     | `pnpm build`（跨层或构建配置）                               |
| `src/**/*.{less,scss,css}`、主题 token | `pnpm lint`、`pnpm check:radius`、`pnpm check:z-index`、`pnpm check:spacing`、`pnpm check:styles` | `pnpm build-storybook`（stories 变更）                       |
| `src/domains/**`、registry、mock       | `pnpm lint`、`pnpm typecheck`、`pnpm check:mock`、`pnpm check:api-contracts`                      | `pnpm build`                                                 |
| `vite.config.ts`、tsconfig、Electron   | `pnpm lint`、`pnpm typecheck`、`pnpm build`                                                       | 对应打包脚本                                                 |
| 应用初始化、认证与运行时配置           | `pnpm lint`、`pnpm typecheck`、`pnpm check:mock`、`pnpm build`                                    | `pnpm build --mode mock`、配置错误启动检查、浏览器运行态回归 |
| 前端可观测性与异常捕获                 | `pnpm lint`、`pnpm typecheck`、`pnpm test:observability`、`pnpm build`                            | Collector、OTLP 内容、私有附件权限和浏览器运行态             |
| Storybook 配置或 stories               | `pnpm lint`、`pnpm typecheck`                                                                     | `pnpm build-storybook`                                       |
| UI 交互、路由、浮层                    | 上述静态检查                                                                                      | 用户明确授权后运行 mock 或浏览器回归                         |

## CI 契约

PR CI 固定执行 commitlint、格式检查、lint、行为回归、build、mock contract、token 与样式契约和 whitespace 检查。`Code Quality & Build Gate` 是 GitHub branch protection 的稳定检查名，修改 job 名称前必须同步仓库设置。

本地可用 `pnpm verify:ci` 并行执行与 CI 相同的格式、lint、契约检查、类型检查和构建步骤。

`pnpm check:api-contracts` 使用 `scripts/api-contract-baseline.json` 锁定尚未迁移的 unchecked REST 调用。新增 unchecked 调用会失败；迁移接口后必须同步下调基线，不能借旧文件继续扩大无契约接口。

行为回归统一放在 `tests/**/*.test.mjs`，由 `pnpm test` 收集；新增业务回归优先补到对应领域测试，不再为单个场景新增包脚本。`pnpm check:styles` 只保留长期稳定的样式契约：共用 partial 和 mixin 边界、Input 与 Table 基础封装、AppButton 行式触发器的按压缩放开关、token 归属、所有 CSS Module 可编译，以及禁止 Less 回流。迁移期的精确规则数量、声明顺序和内部文件拆分快照不作为长期 CI 契约；涉及视觉、布局或交互的风险由 Storybook 或已授权的浏览器回归验证。

SCSS 迁移系列的依赖 PR 以具名迁移分支为 base 时，仍运行同一 `Code Quality & Build Gate`。系列全部合入后可单独清理临时分支触发配置。

## 运行态记录

运行 mock 或浏览器时记录：日期、浏览器版本、窗口尺寸、操作步骤、预期结果、实际结果和控制台错误。没有启动服务时，不要声称完成页面行为验证。

可观测性运行态还需检查 OTLP logs/traces 状态、关键上下文、URL query 和凭据脱敏、
同对象去重、逻辑请求与重试子 span、最终失败分类及 source map release 是否一致。

运行态涉及初始化、认证或资源路由时，至少覆盖 `/login`、`/chat`、`/drive/personal`、资源 PDF／Note／Office／Draw.io 路由；需要时观察首次探测、online／offline、visibilitychange 及停止后的网络请求。应确认资源使用集中配置，mock 模式不发起校内探测，401 只由 App 提示一次并完成登录回跳。
