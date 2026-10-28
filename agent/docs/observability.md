# 前端可观测性

本文只描述当前实现，不是目标规划。完整代码位于 `src/observability`。

## 启用

- 设置 `VITE_OTEL_ENDPOINT` 后启用 OTLP HTTP logs/traces。
- `mock` 模式始终禁用遥测。
- 未启用时不注册 Provider、浏览器监听器或定时器，也不产生上报请求。
- 同源 `/otel` 会解析为当前站点 origin；默认上报地址为 `/v1/logs` 和 `/v1/traces`。

## 入口

| 用途                | 入口                      |
| ------------------- | ------------------------- |
| 业务异常            | `@/observability`         |
| React ErrorBoundary | `@/observability/react`   |
| 用户身份补充        | `@/observability/context` |
| API 请求观测        | `@/observability/request` |
| 应用安装            | `@/observability/install` |

`@/observability` 不导出 SDK、构建配置或 React 适配器，普通业务捕获不会顺带加载这些模块。
业务代码不得直接 import `@opentelemetry/*` 或 `src/observability` 内部文件。

## 当前能力

### 异常

- React root uncaught/recoverable、根 Boundary、路由 Boundary、Router error、
  `window.error` 和 `unhandledrejection` 使用同一 `captureException`。
- 返回稳定的 `WPE-XXXXXXXX` support ID；遥测关闭时仍可生成本地 ID。
- 同一个 Error 对象只形成一次 occurrence；不同对象按 fingerprint、版本、路由、
  operation、资源、用户和会话聚合。
- 主动取消和 `CanceledError` 不记录。
- `WisePenError` 记录 `source`、`code` 和脱敏诊断，不复制 `meta` 或服务端正文。

### 请求与自动网络 span

- 每个顶层 `apiGet/apiPost/apiPut/apiDelete/apiGetText` 创建一条 `api.request` 逻辑 span，
  覆盖地址等待、全部重试、响应解包和解析。
- 最终失败只生成一次 `frontend.request_failure`，并分类为 HTTP、network、timeout、
  business、contract 或 canceled。
- 请求事件记录 method、稳定 endpoint、状态码、脱敏 path、host/port、request ID、
  business code、resend count 和 duration。
- 请求发起时保存 user/session/page 快照；账号切换后迟到的失败仍归属发起请求的账号。
- 已记录的请求异常会标记为 observed，业务 catch 不会重复生成 `frontend.error`。
- Fetch/XHR 自动 span 覆盖网络调用；OTLP 自身请求被排除。
- 自动网络 span 挂在逻辑请求 span 下；重试表现为同一逻辑请求的多个传输子 span。
- 自动 span 的 `url.full` 只保留 origin + pathname，query 和 fragment 不导出。
- API XHR span 额外记录稳定 endpoint、HTTP/business outcome 和业务码。

### 上下文与生命周期

- 基础字段：构建身份、deployment mode、client、browser、OS 和 page instance。
- 会话字段：`session.id`、`user.id`、页面模板、资源 ID、编辑器类型、可见性和联网状态。
- 近期事件最多 50 条、保留 2 分钟，只允许固定白名单字段。
- 登录、登出和 401 会话切换会刷新 session ID 并清理旧 breadcrumb。
- 存储受限时使用页面内匿名 ID；遥测初始化或认证回调失败不会阻断业务。

### 聚合与预算

- 首次错误事件立即发送；60 秒窗口内的重复 occurrence 通过摘要发送。
- 最多保留 100 个聚合组。
- 每分钟最多发送 200 条错误或摘要事件，`telemetry.events_dropped` 也占用预算。
- `error.occurrence_count` 可求和；`error.total_count` 只表示窗口累计值。
- 该预算覆盖异常和请求失败日志，不计算逻辑请求或自动网络 span。

### 业务故障

`application-handled` 用于已经被业务消费的故障，当前 operation 为：

- `chat.send`、`chat.stream`、`chat.recover`、`chat.resume`
- `office.sdk`
- `drawio.save`
- `skill.save`

前置条件不满足、权限拒绝、主动取消、dispose 和未 ready 拒绝不记录为错误。
`createClientError` 只创建业务错误，不自动上报。

## 事件流

```text
captureException / request observation
  -> 捕获时上下文快照
  -> Error 规范化和统一脱敏
  -> fingerprint 聚合与预算
  -> OTel LogRecord
  -> 当前 span recordException，或创建短错误 span
```

## 模块职责

```text
src/observability/
├── index.ts         无 SDK 副作用的业务捕获入口
├── types.ts         公共与内部事件类型
├── capture.ts       support ID、对象去重、取消过滤
├── request.ts       逻辑请求 span、最终失败分类与身份快照
├── context.ts       身份、路由、环境与近期事件
├── privacy.ts       脱敏、字段裁剪与 fingerprint
├── aggregation.ts   聚合、摘要和发送预算
├── pipeline.ts      异常/请求到 Log/Span 的统一管线
├── otel.ts          Provider、Exporter 和自动网络插桩
├── install.ts       启动、停止和浏览器生命周期
└── react.tsx        React ErrorBoundary 适配器
```

## 隐私

- 默认不采集请求/响应正文、对话、附件、文档 XML、Cookie 或认证头。
- URL query 和 fragment 不进入日志或 span；本机路径、Bearer Token 和邮箱会替换为占位符。
- message、stack、componentStack、breadcrumb 和位置字段均有长度上限。
- `code.file.path`、ErrorEvent 行列和 exception stack 只在有效时写入。
- 未提供的可选字段直接省略，不导出空对象。

## 构建身份

`src/config/buildInfo.ts` 是唯一读取入口，字段为：

```text
version / commit / buildId / mode / release / dirty
```

`release` 为 `<version>-<commit前12位>-<buildId>`。同一 commit 的重复构建也会产生不同
release，并写入 `dist/build-info.json`、OTel resource、错误详情和发布清单。

## 私有源码映射

- Vite 使用 `sourcemap: 'hidden'`。
- `scripts/privateSourceMaps.ts` 把 map 和对应 JS 副本移到
  `.wisepen-debug/<release>`，公开 `dist` 不保留 map。
- 每个 release 生成包含 SHA-256 的 `manifest.json`。
- `scripts/symbolicate-error.mjs` 校验 release、路径和哈希后离线还原源码位置。
- Docker、OSS 和发布清单拒绝 source map、sourceMappingURL 和符号链接。

## 已知边界

- 未实现指标、页面导航 span 和完整性能 SLI。
- 逻辑请求 span 包含 user/session/page；自动网络子 span 仍只带 OTel resource 和标准网络字段。
- 逻辑请求 span 与自动网络 span 均不纳入 200/min 错误事件预算。
- 自动传输 span 会逐次记录网络重试；只有最终逻辑失败生成错误事件。
- 页面隐藏时刷新聚合层，但不能保证 BatchProcessor 在浏览器冻结前完成最终导出。
- 基础 resource 属性目前同时出现在 Resource 和事件属性中，用于保留现有查询路径；
  是否去重取决于正式 Collector/Loki 映射。

## 验证

```bash
pnpm check:observability
pnpm lint
pnpm typecheck
pnpm build:app --mode mock
git diff --check
```

`pnpm check:observability` 覆盖隐私、存储拒绝、support ID、异常/请求统一预算、
逻辑请求 span、最终失败分类、认证切换归属、SDK 初始化边界、Fetch/XHR URL 清洗
和真实 Vite source map 还原。

### 运行态记录

2026-10-28 在 macOS、Chrome `156.0.0.0`、窗口 `1710×1010`、已登录的 `/chat`
页面完成冒烟验证：

- 真实 `window.error` 监听器生成 `frontend.error`；support ID、`error.detector`、
  `user.id`、`session.id`、`page.route`、occurrence count、traceId 和 spanId 正确。
- URL query、Bearer Token、邮箱和本机路径均已脱敏；未提供的可选字段不再导出空对象。
- 带敏感 query 的自动 Fetch span 只记录 origin + pathname，干净刷新后每次请求只生成一条
  Fetch span。
- 打开文件页触发真实只读 API 后，每个顶层请求生成一条 `api.request` span；
  对应 XHR span 的 `parentSpanId` 指向逻辑 span，且共享同一 traceId。
- 同一个 Error 连续捕获两次复用同一 support ID，日志只生成一次 occurrence。
- 模拟最终 HTTP 503 后，状态码、resend count、request ID、业务码和脱敏 path 正确，
  并进入同一聚合计数。
- 本轮 OTLP logs/traces 请求均返回 `200 OK`。

本轮未执行真实 Chat 发送、Office 加载失败、Draw.io 保存失败和 Skill 批量上传失败，
因为这些场景会调用第三方服务或修改业务数据；取消过滤和聚合预算使用自动化测试覆盖。

仍未验证正式 Collector/Loki/Tempo/Grafana、Jenkins 附件 ACL 与加密、OSS 发布、
Electron 产物和上述第三方业务故障。
