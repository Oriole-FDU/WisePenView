# 前端可观测性目标与重实现方案

## 文档定位

本文定义 WisePenView 前端可观测性的目标能力、概念边界和模块职责，是后续从最新 `main`
重新实现的依据。

PR #473、#500、#501、#502、#503、#504、#505 作为需求来源和测试案例使用，不作为新实现的代码基线。
这些分支基于较早的 `main`，并形成多层 stacked PR；直接 rebase 和继续叠加会把旧概念固化为
新的底层依赖。新实现应从最新 `main` 建立独立分支，逐项满足本文的目标和验收场景。

审查时的依赖关系如下，#489 是底座修正，虽然不是本次目标文档点名的能力 PR，但其预算和
错误编号修复属于目标行为：

```text
#473 -> #489
          ├─ #500 -> #501
          └─ #502
               ├─ #503
               ├─ #504
               └─ #505
```

文档不表示相关代码已经存在于 `main`。实现完成前，运行态能力以实际代码和配置为准。

## 一句话目标

建立一套以 OpenTelemetry 为实现标准、但业务代码不直接依赖 OTel 的前端可观测体系，使维护者能够回答：

1. 哪个用户、会话、页面和资源受到影响？
2. 哪个请求或业务操作失败，失败发生在传输、业务契约还是应用处理阶段？
3. 前后端是否属于同一条 trace，能否通过请求 ID 相互定位？
4. 问题来自哪一次具体构建，而不是只得到一个相同 commit？
5. 在有匹配 release 的私有附件时，能否还原到原始源码位置？
6. 同一故障是否被重复计数，数据中是否带入了正文、凭据或其他敏感信息？

## 当前 main 基线

当前 `main` 已具备一小部分能力：

- 配置 `VITE_OTEL_ENDPOINT` 后启动 OTel Browser SDK。
- 自动插桩 Fetch 和 XHR，并按配置的 API Origin 传播 W3C `traceparent`。
- XHR 完成后补充部分 API endpoint、业务码和结果属性。
- React 根边界、路由错误、全局 `error`／`unhandledrejection` 会调用现有 `reportError`。
- 现有 `reportError` 可以进入 OTel 日志和 span。
- Jenkins、OSS 和 Docker 已有基础发布流程。

当前缺口：

- `reportError` 同时承担错误编号、对象去重、自建 DTO、全局 reporter 配置和 OTel 接入，
  是旧“主动上报接口”概念的遗留。
- 请求只有自动传输 span，没有覆盖等待地址、重试和解包的一次逻辑请求 span。
- HTTP 主要只记录 5xx；HTTP 200 业务失败、响应契约失败、4xx、重试和取消缺少统一语义。
- 账号、会话、页面、资源等上下文没有统一快照，异步请求可能在登录切换后串身份。
- React 已捕获错误之外，Chat、Office、Draw.io、Skill 等业务已处理错误没有统一入口。
- 正常请求缺少近期上下文，错误发生时难以还原操作背景。
- 构建只有应用版本和短 SHA，无法区分同 commit 的两次构建。
- 没有私有 source map 生成、归档、release 校验和离线还原链路。
- 缺少统一的数据脱敏、错误聚合、事件预算和遥测自身失败保护。

## 设计原则

### 1. 自动插桩负责 I/O，应用代码负责语义

自动插桩可以记录 Fetch／XHR、状态码、耗时和 trace 传播，但无法理解：

- HTTP 200 响应 envelope 中的业务失败；
- Chat 已处理但没有继续抛出的 SDK 错误；
- Office／Draw.io callback 和 Skill 批量保存结果中的业务故障；
- 哪些取消是正常操作，哪些前置拒绝无需上报。

这些语义必须由应用层显式捕获，但不能由业务代码直接创建 OTel span 或 LogRecord。

### 2. 捕获不等于导出

业务只表达“这里发生了一个需要记录的异常或失败”。OTel SDK、BatchProcessor 和 Exporter
负责批处理与网络发送。

业务代码不得：

- 直接调用 exporter；
- 关心 `/v1/logs` 或 `/v1/traces`；
- 自行拼接后端上报请求；
- 依赖某个可变的全局 reporter。

### 3. 所有异常进入同一条处理管线

统一管线负责：

```text
捕获
  -> 规范化 Error 和操作语义
  -> 脱敏与字段裁剪
  -> 关联发生时的上下文
  -> 分类、对象去重、指纹聚合
  -> 事件预算
  -> OTel LogRecord / Span exception
  -> BatchProcessor / Exporter
```

业务层、React 边界、请求层和全局监听不得各自维护一套发送、去重和预算逻辑。

### 4. 上下文在事件发生时快照

请求、异步恢复和导航开始时应保存当时的：

- 认证版本；
- 用户 ID；
- 会话 ID；
- 页面实例；
- 路由模板和允许的资源标识；
- 构建身份。

账号切换后旧异步结果不能更新新身份，也不能把旧现场写入新会话。

### 5. 可观测性不得影响业务

- 初始化、采集、脱敏、聚合或导出失败都不能改变业务结果。
- 遥测初始化失败不能阻止应用启动。
- 未配置或明确禁用时，不创建监听器、定时器、队列或上报请求。
- 出口异常不能递归上报，也不能抛回业务 catch。

### 6. 默认不采集业务内容

禁止默认采集：

- 请求或响应正文；
- Chat 对话；
- 附件内容或文件名；
- Office／Draw.io 文档 XML；
- Cookie、认证头、URL query；
- DOM 文本；
- 原始 User-Agent；
- 完整本机路径。

错误 message、stack、componentStack 和额外 attributes 在进入 OTel 前必须统一脱敏和限长。

### 7. 业务错误模型与可观测性解耦

`src/utils/error` 保留：

- `WisePenError` 和错误码；
- `createClientError`；
- 用户文案解析；
- 业务错误分类所需的最小类型。

`src/utils/error` 不再负责：

- 错误上报；
- OTel 接入；
- 全局 reporter 配置；
- 遥测用的自建 ErrorReport DTO；
- 跨请求去重；
- 业务操作名联合类型。

## 核心概念

### Signal

首选 OTel Trace 和 Log 两类信号：

- Trace 表示请求、导航和业务操作的时延与关系。
- Log 表示可检索的异常、重复摘要、预算丢弃等离散事实。

指标、性能 SLI、会话回放和产品分析不属于首期范围。

### Observation

一次可被关联的操作现场，例如：

- 一次逻辑 API 请求；
- 一次页面导航；
- 一次 Chat send／stream／recover／resume；
- 一次 Office SDK 回调失败；
- 一次 Draw.io save／iframe 故障；
- 一次 Skill 批量保存及其单项结果失败。

Observation 保存发生时的身份和上下文快照。

### Capture

应用显式声明一个需要记录的异常或失败。Capture 不直接负责网络发送。

### Export

OTel SDK 将 LogRecord 和 Span 批量发送到 Collector。Exporter 是基础设施，不是业务 API。

### Error occurrence、ID、fingerprint 和 summary

- **occurrence**：错误实际发生的一次事实。
- **error ID**：面向用户支持和同对象关联的稳定编号，例如 `WPE-XXXXXXXX`。
- **fingerprint**：用于归并重复错误的稳定技术特征。
- **summary**：窗口内重复错误的聚合记录，不与首次完整事件重复计数。

聚合语义必须明确：

- `error.occurrence_count` 表示本条事件新增代表的次数，统计总量时求和。
- `error.total_count` 表示窗口累计值，供查看摘要，不能再次求和。
- `error.first_seen`、`error.last_seen` 表示摘要覆盖范围。

### Handled 与 unhandled

- `unhandled`：React 未捕获、路由失败、window error、unhandled rejection。
- `handled`：业务 catch、SDK onError、保存失败等已被应用消费的故障。
- `canceled`：主动取消或正常离开，不生成错误日志。

`handled` 不等于一定低严重度。严重度由失败类别和操作策略共同决定。

### Operation

Operation 是稳定、有限基数的业务语义名，不使用资源 ID、URL 参数或自由文本。

首期建议：

- `http.request`
- `page.navigation`
- `chat.send`
- `chat.stream`
- `chat.recover`
- `chat.resume`
- `office.sdk`
- `drawio.save`
- `skill.save`

新增 operation 必须说明调用点、失败边界、预期严重度和去重方式，不能只扩展一个字符串联合类型。

## 目标能力

### A. 初始化、配置与生命周期

- 提供唯一安装入口，负责 SDK、instrumentation、监听器和清理。
- 明确 enabled、mode、endpoint 和 API Origin 配置。
- mock 模式或缺少 endpoint 时完全禁用采集。
- 开发环境必须显式决定是否发送，避免测试数据污染正式 Collector。
- HMR 清理监听和定时器；正式运行保持一个全局 provider。
- 忽略发往 OTel `/v1/traces`、`/v1/logs` 的自身请求。
- 初始化失败只降级可观测性，不影响业务启动。

### B. 上下文与身份生命周期

- 客户端匿名 ID：持久化、可过期、可重置。
- 会话 ID：标签页范围，登录、登出和认证失效时轮换。
- 页面实例 ID：每次页面加载变化。
- 用户 ID：只来自已确认的认证用户查询。
- 当前路由：保存模板路径，不保存邀请 token、query 和 hash。
- 资源上下文：只允许资源 ID 和编辑器类型。
- 构建身份：版本、commit、build ID、mode、release、dirty。
- 环境上下文：页面可见性、联网状态。
- 认证版本：防止旧请求或旧用户查询污染新会话。

### C. 自动插桩与逻辑请求

保留 Fetch／XHR 自动插桩，同时增加应用级请求 observation：

- 一次业务请求对应一个逻辑 span；
- 逻辑 span 覆盖地址等待、全部重试和响应解包；
- 每次真实传输是逻辑 span 的子 span；
- 重试复用同一逻辑请求现场，只记录最终失败；
- W3C `traceparent` 只传播到明确配置的 API Origin；
- 成功请求不逐条发送成功日志，只保留 span 和近期上下文；
- 自动 App 请求正常状态码、耗时、服务地址、request ID；
- 业务失败与响应契约失败由请求契约层补充，不让可观测性模块反向理解 API DTO。

建议的失败分类：

| `error.kind` | 条件                               | 默认日志级别        |
| ------------ | ---------------------------------- | ------------------- |
| `network`    | 无响应、离线、连接失败             | ERROR               |
| `timeout`    | 客户端超时                         | ERROR               |
| `http`       | HTTP 非成功状态码                  | 5xx ERROR，4xx WARN |
| `business`   | HTTP 成功但 envelope 业务码失败    | WARN                |
| `contract`   | envelope、DTO 或文本响应契约不成立 | ERROR               |
| `canceled`   | 主动取消                           | 不生成错误日志      |

401、预期认证失效和特定 422 可由统一策略降为 INFO，但策略只存在于可观测性策略模块，不散落在业务 catch。

### D. 异常捕获

覆盖以下来源：

- React `onUncaughtError`；
- React recoverable error；
- root error boundary；
- route fallback；
- Router `onError`；
- window `error`；
- window `unhandledrejection`；
- 业务显式捕获的 handled 故障。

捕获结果应包含：

- `error.id`；
- 标准 `exception.type`、`exception.message`、`exception.stacktrace`；
- `error.kind`、`error.detector`；
- `operation.name`；
- 发生时的身份、页面和资源上下文；
- 有效 stack 或浏览器 ErrorEvent 坐标；
- Debug 环境允许的 component stack，必须脱敏和限长。

同一 Error 对象经过多个入口只应形成一次 occurrence。不同对象即使 message 相同，也先按 fingerprint
归并，再由摘要表达发生次数。

### E. 近期上下文

维护有限、短时的近期事件，用于解释“错误发生前用户做了什么”：

- 最多 50 条；
- 最多保留两分钟；
- 只允许固定字段白名单；
- 页面隐藏、账号切换或超时后清理；
- 不保存请求正文、响应正文或自由文本。

建议保留：

- 页面导航；
- HTTP 方法、路径、结果、耗时、状态码和请求 ID；
- 资源与编辑器类型；
- 页面可见性和联网状态；
- 业务 operation 结果。

### F. 去重、聚合和预算

- Capture 层阻止同一 Error 对象在短时间内被多个边界重复记录。
- 请求层保证一次逻辑请求只产生一个最终失败事件。
- 聚合层按 fingerprint、构建版本、路由、operation、资源、用户和会话分组。
- 首次错误完整发送，重复次数通过摘要发送。
- 聚合缓存必须有上限，淘汰最旧分组并保留摘要。
- 每分钟发送预算必须有硬上限。
- 预算丢弃摘要本身也占用预算，不能在满额后额外突破上限。
- primitive、`null`、`undefined` 的单次 capture 返回 ID 必须与真实 OTel 事件 ID 一致。

### G. 导航和页面生命周期

- 导航使用 route template，不使用包含动态 token 的真实 pathname。
- 导航 span 从导航开始到完成、取消或卸载。
- 页面隐藏时刷新错误摘要并尝试 flush。
- 页面重新可见时恢复上下文。
- 在线／离线变化只进入近期上下文，不作为正常日志持续发送。
- 导航日志不得被解释为完整首屏性能或全部子请求成功。

### H. 构建身份

一次构建只生成一份身份：

```text
version
commit
buildId
mode
release
dirty
```

约束：

- `commit` 是完整 commit SHA。
- 同一 commit 的两次构建必须得到不同 `release`。
- bundle 注入值、日志属性、错误详情、`build-info.json` 和发布 manifest 使用同一份身份。
- Jenkins 的镜像 tag 和发布 metadata 读取构建身份，不在部署阶段重新推断。
- `dirty` 只表示构建工作区状态，不表示运行时修改。
- 在没有 `.git` 的源码包中如何构建必须在实现前明确；不能静默生成伪 commit。

### I. 私有 source map 与源码还原

- 构建生成 hidden source map。
- map 和用于位置校验的 JS 副本移出公开 `dist`。
- 附件按唯一 `release` 保存，不按 commit 或 latest 猜测。
- 每个附件包含 release 身份、文件列表和 SHA-256。
- 公开目录、OSS manifest、Docker 镜像不得包含 map、sourceMappingURL 或符号链接。
- 离线还原 CLI 必须要求显式 artifact 目录、release 和 frame。
- release 不匹配、文件缺失、哈希不符、路径穿越、符号链接越界、无映射和越界位置必须明确失败。
- 不具备有效 stack 或 ErrorEvent 坐标时，不承诺源码位置。
- 私密附件只允许授权维护者访问；正式启用前必须完成 ACL、加密、保留和回退版本覆盖验收。

### J. 数据契约和排障路径

日志和 span 至少支持以下关联：

| 维度                                                                       | 用途                         |
| -------------------------------------------------------------------------- | ---------------------------- |
| `service.version`、`service.commit`、`service.release`、`service.build_id` | 精确确定构建                 |
| `deployment.environment.name`                                              | 区分环境                     |
| `client.id`                                                                | 区分匿名客户端               |
| `session.id`、`page.instance.id`                                           | 缩小会话与页面实例           |
| `user.id`                                                                  | 定位受影响用户               |
| `page.route`、`resource.id`、`editor.type`                                 | 定位页面和资源               |
| `operation.name`                                                           | 定位请求或业务操作           |
| `wisepen.request_id`                                                       | 与后端日志关联               |
| trace ID／span ID                                                          | 与 Tempo 等 trace 数据源关联 |
| `error.id`、`error.detector`、`error.fingerprint`                          | 用户支持、捕获入口与重复聚合 |

Collector 映射、Loki structured metadata、Tempo 关联和 Grafana 数据源连接属于跨仓库验收项，
不能以“前端已经发出请求”代替。

### K. 业务接入

首期业务接入只覆盖能够明确判定失败的边界：

#### Chat

- 发送 catch；
- AI SDK onError；
- 恢复 catch；
- 重连 catch；
- 正常取消不上报；
- 已由请求层记录的原异常不重复上报；
- 保留原 callback、提示和返回对象；
- 会话切换后的迟到失败不能污染新会话。

#### Office

- `events_onError`；
- `onLoadComponentError`；
- 不根据 ready、modified 或离开状态推断保存成功／失败；
- 保留原 dispatch、onError、草稿和退出协议；
- 验证一次故障是否会同时触发两个 callback，避免重复计数。

#### Draw.io

- 共用保存 session 的明确失败；
- 工具栏导出与 iframe save；
- 既有 10 秒导出 timeout；
- 通过 origin／source 校验的 iframe error；
- pending 保存与 iframe 双入口使用同一错误对象时只记录一次；
- dispose、无权限、未 ready 等前置拒绝不上报；
- 不附加 XML、plain text 或 iframe 原始 message。

业务组件不得直接读取身份、维护 trace 或调用 OTel API，只表达失败语义。

#### Skill

- 文件保存不能只观察 Promise 是否 reject；批量上传可能 resolve 一个包含单项失败的结果数组。
- 覆盖初始化为 API 失败、OSS 上传失败、缺上传票据、缺客户端结果和混合成功／失败结果。
- API 原异常由请求层记录后，结果中重复出现的同一 Error 不再形成第二套事件。
- 缺票和缺结果使用明确本地错误，不根据自由文本推断原因。
- 最终批次汇总错误用于维持原 UI／Promise 契约，不再额外生成汇总错误事件。
- 保留成功项、失败草稿、队列顺序、进度、进行中请求共享、revision、提示和重试行为。
- 不采集文件名、路径、文件内容、签名 URL、callback header 或 OSS 原始响应。
- 真实 OSS、票据服务和后端结果协议仍需在受控环境验收。

## 目标模块边界

建议从最新 `main` 建立新的可观测性目录，并与业务错误工具分离：

```text
src/observability/
├── index.ts                 # 应用唯一公开入口
├── capture/
│   └── exception.ts         # captureException、support ID
├── http/
│   └── request.ts           # 请求 observation，只供请求基础设施使用
└── _internal/
    ├── install.ts           # SDK、instrumentation、卸载
    ├── config.ts            # 配置解析和启用判定
    ├── context.ts           # 上下文快照与认证边界
    ├── identity.ts          # client/session/page/user ID
    ├── privacy.ts           # 脱敏与白名单
    ├── normalization.ts     # Error 与诊断字段规范化
    ├── aggregation.ts       # 去重、摘要、预算
    ├── lifecycle.ts         # 路由、可见性、联网监听
    ├── otel.ts              # provider、logger、tracer
    └── spanProcessor.ts     # 自动 span 上下文补充与 URL 清理
```

职责约束：

| 模块                       | 负责                        | 不负责                      |
| -------------------------- | --------------------------- | --------------------------- |
| `capture/exception.ts`     | 业务捕获边界、support ID    | Exporter、业务 API 解析     |
| `http/request.ts`          | 逻辑请求 span、传输结果关联 | 业务 envelope 规则、UI 提示 |
| `src/apis/request.ts`      | API envelope／contract 语义 | OTel API、全局 reporter     |
| `src/utils/error`          | 错误类型、错误码、用户文案  | 遥测、去重、发送、构建身份  |
| `_internal/privacy.ts`     | 脱敏、白名单、长度限制      | 业务分类                    |
| `_internal/aggregation.ts` | fingerprint 聚合、预算      | 用户提示、HTTP 重试         |
| `_internal/install.ts`     | 生命周期和 provider         | 业务操作                    |

依赖方向：

```text
业务 / 边界 / 请求层 -> observability 公共入口
observability -> OTel SDK
utils/error -> 无 telemetry 依赖
apis/request -> observability/http + utils/error
```

禁止：

- 业务 import `@opentelemetry/*`；
- 业务 import `observability/_internal`；
- `utils/error` import observability；
- observability import Chat、Office、Draw.io、Skill 或 API DTO；
- 用字符串 config 在请求对象上承载跨层去重状态；
- 保留 `configureErrorReporter` 这种单订阅全局服务定位器作为正式契约。

## 错误捕获 API 目标

建议应用只使用一个语义入口：

```ts
captureException(error, {
  detector: 'application-handled',
  operation: 'chat.send',
  attributes: {
    // 只允许经过定义的低成本诊断字段
  },
}): string;
```

行为约定：

- 返回可展示的 support error ID。
- 未启用遥测时安全 no-op，但不向业务抛错。
- 不返回自定义 ErrorReport DTO。
- 不要求业务传入完整 pathname；页面上下文由 observation 提供。
- 不要求业务选择 OTel signal。
- component stack、ErrorEvent 坐标等边界专有信息通过内部类型化字段传入。
- `captureException` 名称表达“捕获”，不表达“向后端发送”。

迁移期如需 `reportError`，只能作为薄兼容适配器调用 `captureException`，不能继续承载新职责。
由于本次是从 `main` 重写，首版实现应优先直接使用新 API，避免长期双路径。

内部管线建议保留一份 `ExceptionObservation`，但它是内部模型，不导出给业务、错误页或请求层：

```text
ExceptionObservation
  -> fingerprint / severity / attributes
  -> LogRecord
  -> optional Span exception
```

## 请求观测目标

请求基础设施需要显式传递一个内部 observation：

```text
开始请求
  -> 捕获上下文快照
  -> 创建逻辑请求 span
  -> 地址等待
  -> 每次真实传输绑定同一 observation
  -> 响应状态与 request ID
  -> API envelope / contract 解包
  -> success / failure / canceled
  -> 只结束一次逻辑 span
  -> 抛出原有 WisePenError
```

关键约束：

- observation 使用私有 symbol 或内部闭包，不占用公开 Axios config 字符串字段。
- 重试共享 observation，但每次 transport 有独立子 span。
- 请求层在错误抛给业务前标记 error 已被观测。
- React 边界或业务组件再次捕获同一个 Error 时，只补充可允许的语义，不重复记录 occurrence。
- 业务错误仍通过 `WisePenError` 和 cause 保留原异常。
- 自动 instrumentation 与逻辑请求 observation 不创建两条互不关联的 trace。

## 构建与发布目标

建议把构建身份独立成无业务依赖的构建模块：

```text
vite build
  -> 生成一次 BuildIdentity
  -> 注入 bundle
  -> 生成 build-info.json
  -> 生成私有 source map manifest
  -> release manifest 读取同一身份
  -> Jenkins tag 读取同一身份
  -> Docker / OSS 防泄漏检查
```

构建模块不负责：

- 报告运行时错误；
- 选择 Collector；
- 推断业务状态；
- 公开私有 source。

私有 map 的归档、权限和保留策略是正式启用的安全门禁，不是“后续优化”。

## 首期不做

以下能力可以记录为后续方向，不混入首期实现：

- 产品行为分析和漏斗；
- session replay；
- 持久化离线日志队列；
- 完整性能指标体系和 Core Web Vitals SLI；
- 对所有业务行为自动建 span；
- 采集请求／响应正文；
- 在无匹配 release 附件时猜测源码位置；
- 将 Jenkins 默认归档权限视为私有。

## 实施顺序

### 阶段 0：确定契约

- 确认 operation 命名和有限集合。
- 确认 error kind、severity 和取消规则。
- 确认 capture API、support ID 和 ErrorPage 消费方式。
- 确认日志／span 字段白名单和 Collector 映射输入。
- 确认私有 source map 的 ACL、加密、保留和回退策略。

### 阶段 1：SDK、配置和上下文

- 从最新 `main` 建立唯一安装入口。
- 实现 enabled 判定、SDK 初始化和清理。
- 实现 client、session、page、user 和构建上下文。
- 验证禁用、mock、HMR、账号切换和监听清理。

### 阶段 2：异常处理管线

- 建立 `captureException`。
- 实现统一规范化、脱敏、support ID、对象去重、fingerprint、摘要和预算。
- 将 React、Router、window 和 unhandled rejection 边界迁入新入口。
- 删除 `utils/error` 中的 reporter、错误 DTO 和遥测依赖。

### 阶段 3：请求与 trace

- 实现逻辑请求 observation。
- 保留自动 Fetch／XHR instrumentation。
- 接入重试、传输结果、API business／contract 结果、request ID 和取消。
- 解决 current main 的 API contract 入口兼容，避免退回旧泛型实现。
- 验证父子 span、重试、traceparent 和账号竞态。

### 阶段 4：业务捕获

- 按 Chat、Office、Draw.io、Skill 分别建立最小接入。
- 每个业务先明确失败边界、是否 handled、operation、严重度和去重方式。
- 保留原 callback、提示、状态、保存和退出协议。
- 用真实 SDK 或受控集成环境验证回调次数和重复上报。

### 阶段 5：构建身份与源码定位

- 生成唯一 BuildIdentity。
- 保证 bundle、日志、错误详情、公开文件、manifest 和部署 tag 同源。
- 实现 ErrorEvent 坐标备援和缺失位置语义。
- 实现 hidden map、私有附件、哈希 manifest 和离线 CLI。
- 完成 Docker、OSS、Jenkins 和本地 ignored 目录防泄漏检查。

### 阶段 6：运行态与跨仓库验收

- 验证 Collector 实际接收 logs／traces。
- 验证 Loki 字段映射和 structured metadata。
- 验证 Tempo trace 查询和前后端关联。
- 验证私有 source map 仍可访问、不可公开、覆盖当前和回退版本。
- 记录浏览器、窗口尺寸、场景、实际结果和控制台错误。

## 验收标准

### 故障定位

- 能从 ERROR 日志定位用户、会话、页面、资源、operation 和构建 release。
- 能从请求失败定位逻辑移动和每次重试，不把中间重试当成多次业务失败。
- 能通过 request ID 找到后端日志。
- 能通过 trace ID 找到前后端 span。
- 有有效位置且附件匹配时，能还原到原始源码行列。

### 计数准确性

- 同一 Error 经过 catch、SDK callback 和全局监听只形成一次 occurrence。
- 同一逻辑请求只形成一个最终失败事件。
- 摘要 occurrence 统计与首次事件相加等于实际发生次数。
- 预算耗尽时，丢弃摘要也计入硬预算。

### 隐私与安全

- 日志和 trace 中不存在请求／响应正文、对话、XML、附件内容或 URL query。
- 公开 dist、OSS manifest 和 Docker 镜像不包含 source map。
- 私有 source map 的访问权限、加密和保留策略经过书面验收。
- 错误复制详情不包含 `WisePenError.meta` 或业务正文。

### 降级

- 未配置、mock 或关闭开关时，没有遥测 DOM 监听、定时器、队列或网络请求。
- Collector 不可达、SDK 初始化失败或 aggregate sink 异常时，业务流程和用户提示不变。
- HMR 和页面卸载后监听器与定时器可清理。

## 旧 PR 需求映射

| PR   | 作为目标保留的能力                                             | 不作为最终方案保留的部分                                              |
| ---- | -------------------------------------------------------------- | --------------------------------------------------------------------- |
| #473 | 上下文、逻辑请求、分类、聚合、近期事件、隐私边界和核心测试场景 | 现有 `reportError`／reporter／自建 DTO 中心结构；旧 API contract 结构 |
| #489 | dropped 摘要计入预算、primitive 单次 ID 一致                   | stacked CI 触发配置只作为临时手段                                     |
| #500 | 一次构建身份、全链同源、ErrorEvent 坐标、错误码文案            | 直接把构建命令塞进 Vite 配置的业务实现方式可按新模块边界调整          |
| #501 | hidden map、私有附件、release 精确还原、哈希和发布防泄漏       | 在 ACL／加密／保留验收前正式启用                                      |
| #502 | Chat handled 故障、取消排除、原 callback 保持、API 原异常去重  | 向 `utils/error` 继续扩展业务 operation 联合类型                      |
| #503 | Office 明确 callback、保存／退出语义隔离                       | 仅依赖组件替身，不验证真实 callback 次数                              |
| #504 | Draw.io 保存、timeout、iframe 错误、双入口去重和前置拒绝排除   | 仅依赖受控 iframe，不验证真实第三方会话                               |
| #505 | Skill 批量保存的结果级失败、缺票／缺结果、API 去重和状态保持   | 仅依赖受控 OSS／票据，不验证真实上传协议和第三方服务                  |

## 待实现时必须明确的问题

以下不是可以留给 fallback 的细节，而是实现前需要拍板的设计输入：

1. 使用 `src/observability` 作为新目录名，还是在现有 `src/telemetry` 上重新划清边界。
2. 业务接入后 `application-handled` 的 operation 和 severity 正式枚举及命名。
3. request ID 缺失时如何关联前后端；不能使用请求正文或 query 代替。
4. ErrorPage 在遥测禁用时是否仍提供本地 support ID。
5. 源构建没有 `.git` 时是拒绝构建、要求显式注入身份，还是支持受控的无 commit 模式。
6. 私有 source map 的存储系统、访问控制、加密、保留周期和删除流程。
7. Collector／Loki／Tempo／Grafana 的字段映射和查询契约。
8. 正式启用 OTel 的环境、采样率、预算和 Collector 容量。

## 完成定义

只有同时满足以下条件，才能认为目标能力实现完成：

- 新实现直接基于最新 `main`，没有复制旧 stacked PR 的中心概念。
- 业务代码只通过新 capture API 表达故障，不直接依赖 OTel。
- `utils/error` 不再承担遥测发射、错误 DTO、跨层去重或 operation 联合类型。
- 请求、异常、上下文、聚合、构建身份和 source map 各有单一职责。
- 静态检查、真实构建、OTel 内存出口测试和运行态验收都有明确证据。
- 未验证的 Collector、Jenkins、OSS、ACL 和第三方运行环境不会被写成已通过。
