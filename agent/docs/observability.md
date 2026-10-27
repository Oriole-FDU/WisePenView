# 前端可观测性

本文描述当前实现。产品目标、未完成能力和后续阶段见
[`observability-target.md`](./observability-target.md)。

## 安装与开关

- `main.tsx` 在创建 React root 前调用 `src/bootstrap/observability.ts`。
- `installObservability` 统一启动 OTel SDK、全局异常监听、认证上下文、路由上下文、页面环境监听和聚合定时器。
- 未配置 `VITE_OTEL_ENDPOINT`、mock 模式或 SDK 配置无效时不安装任何业务监听。
- `installObservability` 返回幂等 cleanup；当前入口通过 Vite HMR dispose 调用。

## 公共入口

业务和框架边界只从 `@/observability` 使用：

```ts
captureException(error, {
  detector: 'root-fallback',
  componentStack,
});

getSupportErrorId(error);
observeUserLoad(() => userService.getUserInfo());
```

`captureException` 只表达捕获，不负责网络发送、UI 文案或业务恢复。support ID 使用
`WPE-XXXXXXXX`，即使遥测关闭也可生成。

### Exception detector

`error.detector` 只表示异常在哪个接入点被检测到：

| detector                     | 接入点                          |
| ---------------------------- | ------------------------------- |
| `react-root-uncaught`        | `createRoot.onUncaughtError`    |
| `react-root-recoverable`     | `createRoot.onRecoverableError` |
| `root-fallback`              | 根 `ObservedErrorBoundary`      |
| `route-fallback`             | `RouteOutletBoundary`           |
| `router-error`               | `RouterProvider.onError`        |
| `window-error`               | `window.error`                  |
| `window-unhandled-rejection` | `window.unhandledrejection`     |

不再输出 `error.origin`、`error.boundary` 或 `error.disposition`。`error.source` 只保留给
`WisePenError` 的 `api/http/network/client` 来源。

## 业务 handled 故障

业务已处理但没有继续抛给框架边界的故障使用：

```ts
captureException(error, {
  detector: 'application-handled',
  operation: 'chat.send',
});
```

`operation` 使用固定低基数名称，不包含资源 ID、会话 ID 或自由文本。Chat 首期接入：

- `chat.send`：用户发送消息的业务 catch。
- `chat.stream`：AI SDK `onError`。
- `chat.recover`：恢复会话 catch。
- `chat.resume`：重连 catch。

主动取消不生成错误事件。业务原异常继续交给原 callback、提示和 Promise；可观测性不改变这些
行为，也不附加对话、请求正文或附件内容。

## 异常管线

```text
captureException
  -> 同一 Error 对象去重
  -> Error 规范化
  -> message、stack、componentStack、URL 脱敏
  -> 捕获身份、页面、资源与近期事件快照
  -> fingerprint 聚合与事件预算
  -> OTel LogRecord
  -> 当前 span recordException
```

首次异常发送 `frontend.error`：

- `error.id`：support ID。
- `error.detector`：捕获入口。
- `error.fingerprint`：错误类型、脱敏 message 和首个 stack frame。
- `exception.type/message/stacktrace`：异常内容。
- `error.code/source`：仅 `WisePenError` 存在。
- `code.file.path/line.number/column.number`：有有效 ErrorEvent 坐标时存在。
- `telemetry.breadcrumbs`：最多 50 条近期事件的 JSON。

存在活动 span 时只调用 `recordException` 并写入关联日志，不另建 span。没有活动 span 时创建
短 `frontend.error` span。`react-root-recoverable` 使用 WARN，不覆盖活动 span 的 status；
其他框架异常使用 ERROR。

## 去重与预算

- 同一 Error 对象只形成一次 occurrence，后续入口复用相同 support ID。
- 不同 Error 对象按 fingerprint、版本、路由、detector、资源、用户和会话聚合。
- 首次错误立即发送；60 秒窗口内重复错误通过 `frontend.error_summary` 提供增量次数。
- 聚合最多保留 100 组。
- 每分钟最多发送 200 条事件，包括 `telemetry.events_dropped` 摘要。
- `error.occurrence_count` 可直接求和；`error.total_count` 只用于查看窗口累计值。

## 基础上下文

每次构建生成一次身份，并同时注入 bundle、`dist/build-info.json`、OTel resource/logs、错误详情和
Jenkins 发布清单。构建身份包含版本、完整 commit、build ID、mode、唯一 release 和 dirty；
同一 commit 重建会得到不同 release。

每次安装会建立以下上下文字段：

- `service.version`、`service.commit`、`service.release`、`service.build_id`
- `service.build_mode`、`service.dirty`、`deployment.environment.name`
- `client.id`、`client.type`
- `browser.name`、`browser.version`、`os.type`
- `session.id`、`page.instance.id`
- `user.id`
- `page.path`、`page.route`
- `resource.id`、`editor.type`
- `page.visibility`、`network.online`

client ID 在本地保存 90 天；session ID 在标签页存储中保存，并在登录、登出或认证失效时轮换。
路由只记录模板路径与允许的资源参数。页面可见性、联网状态和导航只作为错误现场，不生成独立
导航 span。

## 私有 source map

- Vite 生成 hidden map，构建插件把 map 和对应 JS 副本移到 `dist` 同级的
  `.wisepen-debug/<release>/`。
- 每个附件包含构建身份、文件列表、JS SHA-256 和 map SHA-256；不同 release 的历史附件不会
  被新构建删除。
- 公开 dist、发布清单、OSS 和 Docker 均拒绝 map、sourceMappingURL 和符号链接。
- 维护者按事件的完整 release 指定附件和压缩位置进行离线还原：

```sh
node scripts/symbolicate-error.mjs \
  --artifacts .wisepen-debug/<release> \
  --release <release> \
  --frame assets/example.js:1:120
```

附件包含源码。Jenkins 默认归档权限不能视为私有；正式启用前必须完成 ACL、加密、保留和回退
版本覆盖验收。

## 现有 HTTP 行为

HTTP 5xx 仍由 Axios 最终失败拦截器触发：

- 日志事件与 `frontend.http_failure` 兜底 span 保持原有语义。
- 记录 HTTP 方法、状态码、请求路径、服务地址、request ID、业务码、重试次数和脱敏后的服务端错误文案。
- API envelope 解析留在 `src/apis/_internal/httpFailureTelemetry.ts`。
- XHR 自动 span 的 API 属性仍在 `src/apis/_internal/xhrApiTelemetry.ts`。

本次不实现逻辑请求 span、统一 4xx／网络／业务失败分类，也不把异常写成主动后端请求。

## 隐私边界

- 异常捕获不采集请求/响应正文、对话、文档 XML、附件内容或原始业务对象；既有 5xx
  `api.server_message` 仅保留脱敏和限长后的错误文案。
- 日志 URL 去除 query 与 hash。
- Bearer token、邮箱和超长诊断字段在进入 OTel 前清理。
- `WisePenError` 只发送 source/code 和脱敏 stack，不复制服务端原始文案作为异常 message。
- `React componentStack`、stack 和浏览器位置均有长度与 URL 清理。

## 离线验证

```bash
pnpm check:observability
```

测试使用真实 OTel TracerProvider／LoggerProvider 内存 processor 和受控浏览器环境，覆盖：

- 关闭时零副作用与 support ID。
- 短 span、活动 span exception event。
- detector 字段、同对象去重、用户、路由、认证和页面环境。
- 脱敏、ErrorEvent 坐标、聚合摘要、预算和 dropped summary。
- 现有 HTTP 5xx 与 XHR API 属性回归。

静态门禁仍需运行 `pnpm lint`、`pnpm typecheck`、`pnpm build:app --mode mock` 和
`pnpm verify:ci`。测试不代表 Collector、Loki、Tempo、Grafana 或真实浏览器链路已经验收。
