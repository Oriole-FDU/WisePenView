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
| `src/domains/**`、registry、mock       | `pnpm lint`、`pnpm typecheck`、`pnpm check:mock`                                                  | `pnpm build`                                                 |
| `vite.config.ts`、tsconfig、Electron   | `pnpm lint`、`pnpm typecheck`、`pnpm build`                                                       | 对应打包脚本                                                 |
| 应用初始化、认证与运行时配置           | `pnpm lint`、`pnpm typecheck`、`pnpm check:mock`、`pnpm build`                                    | `pnpm build --mode mock`、配置错误启动检查、浏览器运行态回归 |
| 前端可观测性与异常捕获                 | `pnpm lint`、`pnpm typecheck`、`pnpm check:observability`、`pnpm build`                           | Collector、OTLP 内容、私有附件权限和浏览器运行态             |
| Storybook 配置或 stories               | `pnpm lint`、`pnpm typecheck`                                                                     | `pnpm build-storybook`                                       |
| UI 交互、路由、浮层                    | 上述静态检查                                                                                      | 用户明确授权后运行 mock 或浏览器回归                         |

## CI 契约

PR CI 固定执行 commitlint、格式检查、lint、文件长度规则、editor runtime、Auth 注册请求、build、mock contract、API response contract、observability、z-index 层级、圆角 token、间距 token、样式契约、note link 协议和 whitespace 检查。`Code Quality & Build Gate` 是 GitHub branch protection 的稳定检查名，修改 job 名称前必须同步仓库设置。

本地可用 `pnpm verify:ci` 并行执行与 CI 相同的格式、lint、契约检查、类型检查和构建步骤。

全量 Less → SCSS 迁移另执行 `pnpm build:app --mode mock`、`pnpm build-storybook`、`git diff --check`，比对迁移前后的有序编译 CSS、完整 CSS Modules 导出键与 composition。`pnpm check:styles` 使用 `node:test` 验证共用 partial 无 CSS 输出、Input field 状态、AppBreadcrumb 导出与通用字体 token、非 Table 基础组件及 `_shadcn` 的 SCSS 编译边界、scrollbar 声明不拆分父规则，以及试点组件样式与 SCSS 守卫。Table 契约另涵盖私有 partial 无输出、直接消费全局排版与 `--table-*` token、两种表格各精确生成 1–16 栏规则、共用类别导出与 composition、Group 行高规则顺序，以及 Table／F33 不跨组件预处理器引用私有样式。建置与静态比对不能代替已授权的视觉／互动验收。

Drive／Group／Resource 业务组件另检查域内无 Less、所有 CSS Module 可编译、scrollbar 与后续声明维持同一父规则，以及 640／768／960px 断点对应的窄版布局。

Chat／Sidebar 业务组件另检查域内无 Less、历史导览精确生成 48→1 的延迟规则及其后的 reduced-motion 覆写、重复选择器优先级、父声明与 scrollbar 规则顺序、桌面拖拽／禁拖拽区与键盘焦点，以及输入区 container query、640px 窄版和 Sidebar 选取／禁用／收合状态。编译输出比对需逐一记录等价差异，不得以全局声明排序或规则合并掩盖 cascade 变化。

其余业务组件另检查整个 `components/business` 无 Less、所有剩余 Module 可编译、SelectedMemberList scrollbar 不拆分父规则、桌面窗口按钮禁拖拽与焦点、UserSearchCombobox／RechargeModal 的 768／640px 断点、禁用与唯读状态、表单与错误页间距、CommandPalette 全局覆写、Wallet 动画及 InlineComment 重复规则顺序；不藉迁移修补既有业务或样式缺键。

agent／skill 编辑器另检查域内无 Less、所有 Module 可编译、七处 scrollbar 不拆分父规则、三组 768px 布局、编辑区尺寸与预览表格／图片的全局选择器、两段 footer 声明顺序，以及资产拖入遮罩、prompt 选取／兼容状态、文件树焦点与待储存队列 resize／失败／进度样式。

note、其余编辑器／runtime、版型、页面、bootstrap 与样式 stories 检查所有 Module 可编译；另覆盖 Note 五个本地 checklist mixin 的正文／拖拽预览、十四处晚声明 scrollbar、Auth 文本链接的 hover／键盘焦点、layout mixin 参数与声明去重、桌面拖拽／禁拖拽边界及 Tabs 软焦点。Less 专属语法以编译输出验证；计算简化、格式与独立声明位置的等价差异须逐项限定来源、选择器、属性、值、上下文与次数，不可宽泛排序或合并规则。

清零契约拒绝 `src`、Storybook 与 Electron 入口的 Less 文件／样式引用，以及任何直接 Less 依赖；保留上游套件仍声明的可选依赖，不把它当作自有编译入口。原生 CSS／主题 token 维持原用途。静态契约不代表已验证编辑、协作、拖拽、卷动或 resize 互动。

SCSS 迁移系列的依赖 PR 以具名迁移分支为 base 时，仍运行同一 `Code Quality & Build Gate`。系列全部合入后可单独清理临时分支触发配置。

## 运行态记录

运行 mock 或浏览器时记录：日期、浏览器版本、窗口尺寸、操作步骤、预期结果、实际结果和控制台错误。没有启动服务时，不要声称完成页面行为验证。

可观测性运行态还需检查 OTLP logs/traces 状态、关键上下文、URL query 和凭据脱敏、
同对象去重、逻辑请求与重试子 span、最终失败分类及 source map release 是否一致。

运行态涉及初始化、认证或资源路由时，至少覆盖 `/login`、`/chat`、`/drive/personal`、资源 PDF／Note／Office／Draw.io 路由；需要时观察首次探测、online／offline、visibilitychange 及停止后的网络请求。应确认资源使用集中配置，mock 模式不发起校内探测，401 只由 App 提示一次并完成登录回跳。
