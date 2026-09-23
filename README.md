# WisePenView

WisePenView 前端项目，基于 React、Vite、TypeScript、HeroUI 与 Shadcn。

开发规约入口见 `AGENTS.md`，专题规约位于 `docs/agent/`。

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

Mock 模式使用 `.env.mock`，生产构建使用 `.env.production`。

### 3 启动本地开发

```bash
pnpm dev
```

Mock 模式：

```bash
pnpm mock
```

Mock 與正式環境共用 service、mapper、快取和 registry，只在 `@domain-apis` 替換 API 與 OSS I/O。模擬資料存於記憶體，重新整理後重置；API 契約變更時需同步更新 mock API。

Note AI Diff 與 PDF 使用本機展示資料。課程公告、作業等正式 service 尚未提供的能力，在 mock 中也維持未開放狀態。Chat 串流、外部協作、Office 編輯與語音辨識不在此模擬範圍。

## 常用命令

- `pnpm dev`：启动开发服务器
- `pnpm mock`：以 mock 模式启动
- `pnpm build`：构建产物
- `pnpm lint`：执行全量 ESLint 检查，error 或 warning 均会失败
- `pnpm lint:fix`：自动整理导入、移除未使用的导入并修复可自动处理的问题
- `pnpm typecheck`：执行 TypeScript 类型检查
- `pnpm check:mock`：離線檢查 mock API 與正式 service 的跨領域讀寫，不啟動伺服器

提交前由 lint-staged 对暂存的 JS、MJS、CJS、TS、TSX 文件执行 ESLint 自动修复，再交给
Prettier 格式化。全量 lint、提交钩子与 CI 共用同一份 ESLint 规则。

导入按副作用导入、Node 内置模块、第三方包、项目别名、相对路径分组。副作用导入保留组内顺序；
依赖初始化或样式覆盖顺序的入口必须保留语义顺序。重复导入由 ESLint 报错，类型导入可以单独声明。
未使用的局部变量应删除；确需保留位置的回调参数使用 `_` 前缀，对象 rest 排除字段不计为未使用。

## 版本发布

发布入口是 `package.json` 的 `version`，版本号刷新后由 GitHub Actions 自动发布，不再手工建标签和 Release：

1. 在 `main` 上提交版本号变更，例如 `chore: 更新版本号至 1.2.0`。
2. 推送后由 `.github/workflows/release.yml` 比对本次推送前后的 `package.json` 版本号。
3. 版本号有变化时，以该提交为基准打标签 `v<version>` 并创建同名 GitHub Release，Release 说明由提交记录生成。

版本号未变化时工作流直接跳过；标签或 Release 已存在时同样跳过，因此重复推送、重跑任务不会产生重复发布。
需要补发已合并的版本时，可在 Actions 页面手动触发该工作流。

版本快照只由标签 `v<version>` 承担，不再手工切 `v1.1.x` 版本分支：标签固定在发布提交上不会移动，
而版本分支需要持续提交和维护才有意义。只有旧版本需要单独发补丁（例如 1.1.2 要在 1.2.0 之后补 1.1.3）时，
才另开维护分支，命名为 `release/1.1` 这类与标签不同的名字，避免分支与标签同名造成切换歧义。
