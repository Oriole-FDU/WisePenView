# WisePenView

WisePenView 前端项目，基于 React、Vite、TypeScript、HeroUI 与 Shadcn。

开发规约入口见 `AGENTS.md`，专题规约位于 `agent/docs/`。

面向 Codex 的 Bug、PR 和 Review 工作流位于 `agent/`；标准命令和验证矩阵见 `agent/docs/repo-map.md` 与 `agent/docs/verification.md`。

## 快速开始

### 1 安装前置环境

- Node.js：`22.23.2`（项目已通过 `.nvmrc` 固定版本）。
- pnpm：执行 `corepack enable` 后使用，版本由 `package.json` 的 `packageManager` 固定。

### 2 项目初始化

```bash
pnpm install
```

如需连接真实后端，复制开发环境示例并按需调整：

```bash
cp .env.development.example .env.development
```

本地前端如需连接正式 API，可在临时 Vite 配置的 `server.proxy` 中增加 `/__production_api` 规则：目标设为 `https://api.wisepen.oriole.cn`，开启 `changeOrigin`、将 `cookieDomainRewrite` 设为空字符串，并移除转发路径中的 `/__production_api` 前缀。启动时将 `VITE_API_BASE_URL` 与 `VITE_API_BASE_URL_INTRANET` 都设为 `http://127.0.0.1:5173/__production_api`，再以 `production` 模式运行 `pnpm dev --config <临时配置文件>`。此代理仅供本机调试，不是仓库内建配置。

Mock 模式使用 `.env.mock`，生产构建使用 `.env.production`。

### 3 启动本地开发

```bash
pnpm dev
```

Mock 模式：

```bash
pnpm mock
```

### 4 公开配置与初始化

浏览器只从 `src/config/runtimeConfig.ts` 读取公开环境配置，解析规则集中在
`src/config/publicConfig.ts`。API、Office、Draw.io、mock 模式和开发流量标记不再由页面分别读取
`import.meta.env`；配置只允许显式列出的 `VITE_*` 值，未配置或 URL／数值格式错误会在构建入口直接报错。

生产模式额外需要校内 API、探测路径和超时；开发与 mock 模式不会启动内外网探测。浏览器网络监听与轮询由
`App` 挂载时启动、卸载时停止，HTTP 层只发布会话失效事件，未授权提示与登录跳转由 `App` 统一处理。

前端 OTel 默认关闭；设置 `VITE_OTEL_ENDPOINT`（同源 `/otel` 或绝对 OTLP HTTP 地址）
后启用 logs/traces，mock 模式始终禁用。当前支持统一异常捕获、逻辑请求 span、
请求失败分类、自动 Fetch/XHR span、隐私清洗、聚合预算、构建身份和私有源码映射。
Jenkins 开启 `ENABLE_OTEL` 时会使用
API origin 下的 `/otel`。实现、能力边界和验证方式见
[`agent/docs/observability.md`](agent/docs/observability.md)。

Mock 與正式環境共用 service、mapper、快取和 registry，只在 `@domain-apis` 替換 API 與 OSS I/O。模擬資料存於記憶體，重新整理後重置；API 契約變更時需同步更新 mock API。

Note AI Diff 與 PDF 使用本機展示資料。課程公告、作業等正式 service 尚未提供的能力，在 mock 中也維持未開放狀態。Chat 串流、外部協作、Office 編輯與語音辨識不在此模擬範圍。

## 常用命令

- `pnpm dev`：启动开发服务器
- `pnpm mock`：以 mock 模式启动
- `pnpm build`：构建产物
- `pnpm lint`：执行全量 ESLint 检查，error 或 warning 均会失败
- `pnpm lint:fix`：自动整理导入、移除未使用的导入并修复可自动处理的问题
- `pnpm format:check`：检查 JS、TS、JSON、Markdown 与 GitHub workflow 的格式
- `pnpm typecheck`：执行 TypeScript 类型检查
- `pnpm check:mock`：離線檢查 mock API 與正式 service 的跨領域讀寫，不啟動伺服器
- `pnpm check:api-contract`：离线检查统一 API response envelope 的运行期契约
- `pnpm check:observability`：检查异常/HTTP 管线、隐私、预算和私有 source map 还原

提交前由 lint-staged 对暂存的 JS、MJS、CJS、TS、TSX 文件执行 ESLint 自动修复，再交给
Prettier 格式化。全量 lint、提交钩子与 CI 共用同一份 ESLint 规则。

导入按副作用导入、Node 内置模块、第三方包、项目别名、相对路径分组。副作用导入保留组内顺序；
依赖初始化或样式覆盖顺序的入口必须保留语义顺序。重复导入由 ESLint 报错，类型导入可以单独声明。
未使用的局部变量应删除；确需保留位置的回调参数使用 `_` 前缀，对象 rest 排除字段不计为未使用。

## 版本发布

发布入口是 `package.json` 的 `version`。PR 合并到 `main` 后，由 `.github/workflows/release.yml` 自动处理补丁版本并创建同名 GitHub Release：

1. PR 已显式更新版本号时，直接以该版本打标签 `v<version>` 并发布，例如发布 `1.2.0`。
2. PR 未更新版本号时，工作流自动创建 `chore/release-pr-<PR 号>` 分支和补丁版本 PR，将最后一位版本号加一。
3. 补丁版本 PR 通过轻量版 `Code Quality & Build Gate` 后自动合并，再为该合并提交打标签并发布。该门禁只校验 PR 仅修改 `package.json#version` 且补丁号恰好加一，不重复执行普通 PR 的 lint、类型检查和构建。

`main` 受 ruleset 保护，版本提交也必须经过 PR，因此自动版本更新会额外产生一个已合并的版本 PR。重复运行同一发布任务或标签已存在时不会重复发布。

自动版本 PR 使用仓库 Secret `RELEASE_TOKEN` 创建，避免 `GITHUB_TOKEN` 创建的 PR 每次都等待人工批准 Actions 工作流。令牌必须是仓库协作者持有的 fine-grained PAT，仅授权 `WisePenView`，并授予 `Contents: Read and write` 与 `Pull requests: Read and write`；配置后无需再启用 “Allow GitHub Actions to create and approve pull requests”。发布工作流只使用该令牌创建版本分支和 PR，合并仍由 CI 与 ruleset 约束。

需要补发当前版本时，可在 Actions 页面手动触发该工作流；当前版本标签已存在则跳过。令牌过期或撤销后，发布任务会在创建版本 PR 前直接失败并给出配置提示。

版本快照只由标签 `v<version>` 承担，不再手工切 `v1.1.x` 版本分支：标签固定在发布提交上不会移动，
而版本分支需要持续提交和维护才有意义。只有旧版本需要单独发补丁（例如 1.1.2 要在 1.2.0 之后补 1.1.3）时，
才另开维护分支，命名为 `release/1.1` 这类与标签不同的名字，避免分支与标签同名造成切换歧义。
