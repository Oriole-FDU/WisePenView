# 前端可观测性

本文只描述当前实现，不是目标规划。完整代码位于 `src/observability`。

## 启用

- 设置 `VITE_OTEL_ENDPOINT` 后启用 OTLP HTTP logs/traces。
- `mock` 模式始终禁用遥测。
- 未启用时不注册 Provider、浏览器监听器或定时器，也不产生上报请求。
- 同源 `/otel` 会解析为当前站点 origin；默认上报地址为 `/v1/logs` 和 `/v1/traces`。

## 入口

| 用途                | 入口                          |
| ------------------- | ----------------------------- |
| 业务异常            | `@/observability`             |
| React ErrorBoundary | `@/observability/react`       |
| 用户身份补充        | `@/observability/context`     |
| Axios 最终 5xx      | `@/observability/httpFailure` |
| 应用安装            | `@/observability/install`     |

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

### HTTP 与自动网络 span

- Axios 只在重试全部结束、最终 5xx 时记录一次 `frontend.http_failure`。
- HTTP 事件记录 method、状态码、脱敏 path、host/port、request ID、业务码和 resend count。
- 已由 HTTP 层记录的 5xx 会标记映射后的 `WisePenError`，业务 catch 不会重复记录。
- Fetch/XHR 自动 span 覆盖网络调用；OTLP 自身请求被排除。
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
- 该预算覆盖异常和 HTTP 错误日志，不计算自动网络 span。

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
captureException / reportHttpFailure
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
├── httpFailure.ts   Axios 最终 5xx 适配
├── context.ts       身份、路由、环境与近期事件
├── privacy.ts       脱敏、字段裁剪与 fingerprint
├── aggregation.ts   聚合、摘要和发送预算
├── pipeline.ts      异常/HTTP 到 Log/Span 的统一管线
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

- 未实现逻辑请求 span、统一 4xx/network/business failure 分类和指标。
- 自动网络 span 不包含自定义 user/session/page 上下文，也不纳入 200/min 错误预算。
- 自动 span 仍会逐次记录网络重试；只有最终 HTTP 5xx 错误事件做业务级去重。
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

`pnpm check:observability` 覆盖隐私、存储拒绝、support ID、异常/HTTP 统一预算、
SDK 初始化边界、Fetch/XHR URL 清洗和真实 Vite source map 还原。

2026-10-28 已在 Chrome 156、1710×1010、`/chat` 页面完成运行态验证：OTLP logs/traces
均返回 200；异常脱敏、同对象去重、HTTP 503、用户/会话/路由上下文和自动 fetch span
URL 清洗符合预期。

仍未验证正式 Collector/Loki/Tempo/Grafana、Jenkins 附件 ACL 与加密、OSS 发布、
Electron 产物和第三方 Chat/Office/Draw.io/Skill 服务故障。
