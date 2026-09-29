# 验证矩阵

## 基础规则

- 修改前后检查 `git status --short`。
- 代码任务至少运行 `pnpm lint`。
- 交付说明记录实际运行的命令和结果；没有运行的检查不能写成已通过。
- 构建失败时先修复第一个真实错误，不用跳过检查或扩大 ESLint 禁止范围。

## 按变更范围选择

| 变更范围                             | 必需验证                                                       | 条件验证                                                     |
| ------------------------------------ | -------------------------------------------------------------- | ------------------------------------------------------------ |
| Markdown、模板、普通配置             | `git diff --check`                                             | `pnpm lint`（若影响 JS 配置）                                |
| `src/**/*.ts(x)`                     | `pnpm lint`、`pnpm typecheck`                                  | `pnpm build`（跨层或构建配置）                               |
| `src/domains/**`、registry、mock     | `pnpm lint`、`pnpm typecheck`、`pnpm check:mock`               | `pnpm build`                                                 |
| `vite.config.ts`、tsconfig、Electron | `pnpm lint`、`pnpm typecheck`、`pnpm build`                    | 对应打包脚本                                                 |
| 应用初始化、认证与运行时配置         | `pnpm lint`、`pnpm typecheck`、`pnpm check:mock`、`pnpm build` | `pnpm build --mode mock`、配置错误启动检查、浏览器运行态回归 |
| Storybook 配置或 stories             | `pnpm lint`、`pnpm typecheck`                                  | `pnpm build-storybook`                                       |
| UI 交互、路由、浮层                  | 上述静态检查                                                   | 用户明确授权后运行 mock 或浏览器回归                         |

## CI 契约

PR CI 固定执行 commitlint、lint、build、mock contract、API response contract 和 whitespace 检查。`Code Quality & Build Gate` 是 GitHub branch protection 的稳定检查名，修改 job 名称前必须同步仓库设置。

## 运行态记录

运行 mock 或浏览器时记录：日期、浏览器版本、窗口尺寸、操作步骤、预期结果、实际结果和控制台错误。没有启动服务时，不要声称完成页面行为验证。

运行态涉及初始化、认证或资源路由时，至少覆盖 `/login`、`/chat`、`/drive/personal`、资源 PDF／Note／Office／Draw.io 路由；需要时观察首次探测、online／offline、visibilitychange 及停止后的网络请求。应确认资源使用集中配置，mock 模式不发起校内探测，401 只由 App 提示一次并完成登录回跳。
