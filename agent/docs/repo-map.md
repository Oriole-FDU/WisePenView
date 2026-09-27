# 仓库地图

## 运行与构建

- `src/`：React 应用、页面、组件和领域代码。
- `src/domains/`：API、mapper、service、entity、mock 和 registry。
- `src/components/base/`：无业务语义的基础控件。
- `src/components/business/`：跨页面复用的业务组件。
- `src/views/`：页面私有业务 UI、Controller、配置和状态。
- `src/layouts/`：路由壳和壳内私有实现。
- `src/apis/`：Axios 与请求基础设施。
- `scripts/`：构建和离线检查脚本。
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
corepack pnpm check:mock
corepack pnpm build
```

`pnpm dev` 和 `pnpm mock` 会启动服务，只有用户明确要求运行态验证时使用。
