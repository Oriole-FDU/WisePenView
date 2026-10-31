# 仓库地图

## 运行与构建

- `src/`：React 应用、页面、组件和领域代码。
- `src/domains/`：API、mapper、service、entity、mock 和 registry。
- `src/components/base/`：无业务语义的基础控件。
- `src/components/business/`：跨页面复用的业务组件。
- `src/components/editors/`：资源编辑器层，承载编辑器契约、运行时、注册表与挂载分发；资源工作区外壳与路由目标解析留在 `src/views/resource/`。
- `src/views/`：页面私有业务 UI、Controller、配置和状态。
- `src/layouts/`：路由壳和壳内私有实现。
- `src/styles/`：全局样式入口、主题 token（按域拆分，如 `theme/radius.css`）和规范示例 story。
- `src/config/`：公开运行时配置的声明、验证与浏览器入口。
- `src/apis/`：Axios 与请求基础设施。
- `src/observability/`：异常捕获、上下文、隐私、聚合和 OTel 管线。
- `scripts/`：构建和离线检查脚本。
- `scripts/privateSourceMaps.ts`：隔离私有 source map；`scripts/symbolicate-error.mjs`
  离线还原 release 对应源码位置。
- `.github/workflows/`：CI 和发布工作流。

## 数据流

```text
view/component -> useXxxService -> service -> mapper -> api -> request
```

API DTO 不得越过 mapper 直接进入组件；跨 service 依赖必须通过 registry 注入。

## 常用命令

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm build
```

`pnpm dev` 和 `pnpm mock` 会启动服务，只有用户明确要求运行态验证时使用。
