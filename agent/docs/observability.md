# 前端可观测性

## 入口

业务与框架边界只从下面三个入口使用 observability：

```text
业务异常          @/observability
React ErrorBoundary @/observability/react
用户身份补充      @/observability/context
HTTP 请求失败     @/observability/httpFailure
应用启动          @/observability/install
```

`@/observability/index.ts` 只导出无 SDK 副作用的捕获 API。React 适配器、用户上下文和安装器
各有明确入口，避免普通业务捕获顺带加载 React、构建配置或 OTel SDK。

## 目录

```text
src/observability/
├── index.ts         业务公共入口
├── types.ts         公共与内部事件类型
├── capture.ts       support ID、Error 规范化、对象去重和取消过滤
├── httpFailure.ts   Axios 5xx 适配
├── context.ts       匿名标识、用户、会话、路由和近期事件
├── privacy.ts       URL、本机路径、Token、邮箱和长度清洗
├── aggregation.ts   指纹聚合、摘要和发送预算
├── pipeline.ts      异常/HTTP 事件到 OTel Log/Span 的统一管线
├── otel.ts          SDK、Fetch/XHR 插桩和自动 span URL 清洗
├── install.ts       开始/停止、全局监听器与页面生命周期
└── react.tsx        React ErrorBoundary 适配器
```

一个文件只承担一种职责。新增能力时按下面的问题定位：

- 新的业务捕获入口：先扩展 `capture.ts` 或 `types.ts`。
- 新的上下文：修改 `context.ts`。
- 新的脱敏规则：修改 `privacy.ts`。
- 新的聚合或预算：修改 `aggregation.ts`。
- 新的 OTel 信号或插桩：修改 `otel.ts`。
- 新的浏览器监听器：修改 `install.ts`。

## 事件流

```text
captureException / reportHttpFailure
  -> 上下文快照
  -> 脱敏和字段限制
  -> fingerprint 聚合与预算
  -> OTel LogRecord
  -> 当前 span recordException 或短错误 span
```

异常和 HTTP 失败使用同一个 `TelemetryAggregation`。首次事件立即发送；60 秒窗口内的重复
发生通过摘要发送。每分钟最多发送 200 条错误或摘要事件，`telemetry.events_dropped`
也占用预算。该预算不计算自动网络 span。

`error.occurrence_count` 表示本条事件新增代表的次数，可直接求和；`error.total_count`
表示窗口累计值，不能再次求和。

## 业务故障

`application-handled` 用于已经被业务消费的故障：

- `chat.send`、`chat.stream`、`chat.recover`、`chat.resume`
- `office.sdk`
- `drawio.save`
- `skill.save`

主动取消、dispose、未 ready 前置拒绝和权限拒绝不记录为错误。业务代码不得直接 import
`@opentelemetry/*`，也不得依赖 `src/observability` 内部文件。

## 隐私

- 异常 message、stack、componentStack 和 ErrorEvent 坐标统一脱敏并限长。
- HTTP 和自动网络 span 的 URL 只保留 origin 和 pathname。
- 不记录请求/响应正文、对话、附件、文档 XML、Cookie 或认证头。
- `WisePenError` 只记录 source、code 和脱敏后的诊断信息。
- 存储访问被拒绝时退化为页面内匿名 ID，不影响业务或认证流程。

## 构建身份

`src/config/buildInfo.ts` 是构建身份的唯一读取入口：

```text
version
commit
buildId
mode
release
dirty
```

`release` 为 `<version>-<commit前12位>-<buildId>`，同一 commit 的重复构建仍具有不同
release。`build-info.json`、OTel resource、错误详情和发布清单使用同一份值。

## 私有源码映射

- Vite 使用 `sourcemap: 'hidden'`。
- `scripts/privateSourceMaps.ts` 将 map 和对应 JS 副本移到 `dist` 外的
  `.wisepen-debug/<release>`。
- 每个 release 生成带 SHA-256 的 `manifest.json`。
- `scripts/symbolicate-error.mjs` 校验 release、路径和哈希后还原源码位置。
- OSS、Docker 和发布清单拒绝 source map、sourceMappingURL 和符号链接。

## 验证

```bash
pnpm check:observability
pnpm lint
pnpm typecheck
pnpm build:app --mode mock
git diff --check
```

自动化覆盖隐私清洗、存储拒绝、support ID、统一聚合预算和真实 Vite source map 还原。
Collector、OTLP、Jenkins 附件权限、OSS 和第三方编辑器的真实运行态仍需单独验收。
