# 前端可观测性

第一批能力包括公共上下文、近期事件、请求失败分类与重复聚合。OTel 地址沿用
`VITE_OTEL_ENDPOINT`；未配置地址或处于 mock 模式时，不启动采集和浏览器事件监听。

## 模块与接入点

```text
src/telemetry/
├── index.ts       # 应用安装、用户身份与认证边界
├── http.ts        # 逻辑请求 span、HTTP 现场和失败分类
└── _internal/     # 状态、近期事件、聚合、生命周期及 OTel 实现
scripts/telemetry/
├── harness.mjs    # 构建真实请求链路、内存 SDK 出口及浏览器替身
├── context.test.mjs
├── lifecycle.test.mjs
├── requests.test.mjs
└── traces.test.mjs
```

应用与守卫只从 `@/telemetry` 导入；请求基础设施从 `@/telemetry/http` 导入。
其他模块不直接依赖 `_internal`。没有旧路径的兼容导出。

`main.tsx` 通过一次 `installTelemetry(router)` 安装出口和浏览器监听，HMR 时统一清理。
`App` 在认证事件发生时结束旧会话并清空现场。用户身份由普通、根路由及管理员守卫已有的
`getUserInfo` 查询提供，不额外请求用户信息。遥测层不依赖业务组件或 domain store。

## 公共字段

| 字段                                             | 含义                                       |
| ------------------------------------------------ | ------------------------------------------ |
| `deployment.environment.name`、`service.version` | 环境与前端版本                             |
| `client.id`                                      | 可重置的匿名浏览器实例标识，不代表物理电脑 |
| `client.type`                                    | `web` 或 `electron`                        |
| `browser.name`、`browser.version`、`os.type`     | 浏览器和系统类别；不上传原始 User-Agent    |
| `session.id`                                     | 标签页会话；登录、登出和认证失效时轮换     |
| `page.instance.id`                               | 当前页面加载实例，刷新后变化               |
| `user.id`                                        | 已确认的登录用户 ID；匿名状态不设置        |
| `page.path`、`page.route`                        | 路由模板，不包含动态邀请参数、查询串和锚点 |
| `resource.id`、`editor.type`                     | 资源路由允许携带的业务标识                 |
| `page.visibility`、`network.online`              | 事件发生时的页面可见性与浏览器联网状态     |
| `operation.name`                                 | 请求方法和 API 路径，不包含查询串          |
| `wisepen.request_id`                             | 服务端响应中的 `x-request-id`，若存在      |
| `telemetry.breadcrumbs`                          | JSON 格式的近期事件                        |

客户端标识存入 `STORAGE_KEYS.telemetryClient`，有效期 90 天，过期或数据无效时替换。
它属于匿名客户端范围，不随账号退出清理；用户可通过清理站点存储重置。
会话标识存入 `STORAGE_KEYS.telemetrySession`，属于标签页范围，账号边界主动轮换。
页面实例和近期事件只存内存；存储不可用时仅维持当前页面标识，不阻断业务。

请求在开始时保存账号、认证版本、会话和页面。后续登录态变化不会重新归属旧请求；
旧用户查询结果不能更新新版本的身份；旧请求完成后的近期事件不能进入新账号的现场。
自动 HTTP 子 span 优先继承逻辑请求保存的现场，账号切换后的重试也保持原账号归属。

## 事件与请求分类

| 事件                     | 独立日志             | 近期事件                       |
| ------------------------ | -------------------- | ------------------------------ |
| 会话启动、识别用户、结束 | INFO                 | —                              |
| 导航完成                 | INFO，关联导航 span  | 保留路由现场                   |
| 页面显示／隐藏           | 无                   | 保留可见性；隐藏时刷新错误摘要 |
| 断网／恢复联网           | 无                   | 保留联网状态                   |
| 请求成功、主动取消       | 无                   | 保留方法、路径、结果及耗时     |
| 请求失败、运行时异常     | 按失败类别发送并聚合 | 保留错误现场                   |

可见性和联网变化提供错误发生前的背景，不作为独立正常日志发送。
正常请求仍有 trace，但不逐次产生成功日志。

| 失败类型                     | `error.kind` | 日志级别                 |
| ---------------------------- | ------------ | ------------------------ |
| HTTP 5xx                     | `http`       | ERROR                    |
| HTTP 400／401／422           | `http`       | INFO                     |
| 其它 HTTP 4xx                | `http`       | WARN                     |
| 无响应的网络故障             | `network`    | ERROR                    |
| Axios 超时                   | `timeout`    | ERROR                    |
| HTTP 成功但业务码失败        | `business`   | WARN                     |
| 响应 envelope 或文本契约无效 | `contract`   | ERROR                    |
| 主动取消                     | `canceled`   | 只记近期事件，无错误日志 |

以上业务级别是首版默认规则；只有契约明确的业务码才应进一步细分。
请求重试的中间失败不单独上报，最终失败包含总耗时、状态、业务码、重试次数和请求 ID。
传输失败在 Axios 最终失败处记录，业务与契约失败在 `request.ts` 解包处记录。
异常继续按原协议抛给业务；已上报异常再次进入全局监听时不会重复产生错误日志。

## Trace 与日志关联

每次经过 `request.ts` 的逻辑请求创建一个 `api.request METHOD /path` span，覆盖地址等待、
全部重试与响应解包，并在 `finally` 中结束。Axios adapter 在实际传输时显式恢复它的上下文，
使 Fetch／XHR 自动插桩产生的 HTTP span 成为子 span，不依赖原生 async/await 的隐式传播。
已有自动插桩继续按配置的 API Origin 白名单传播 W3C `traceparent`。

请求失败日志使用逻辑请求 span 的 context，OTel LogRecord 的标准 `traceId`／`spanId`
因此与请求对应，不再另建脱离原请求的错误 span。重复错误摘要保留首次请求的 context，
不使用摘要定时器当时的活动 span。没有请求现场的运行时异常仍可创建独立错误 span。

导航从观察到 router 的非 idle 状态开始，到新的 location 完成时结束；初始路由与直接完成的
导航在收到状态时记录。导航日志关联该 span；它不代表完整首屏绘制耗时，也不自动涵盖页面内
全部请求。取消或清理时关闭未完成的导航 span。

会话与身份日志可以没有 trace，使用 `session.id`／`page.instance.id` 关联。
不为这些事件创建没有操作语义的 span，也不创建横跨整个标签页生命周期的长 trace。

## 近期事件、聚合与数据边界

近期事件保留最多 50 条、最多两分钟，仅允许固定技术字段。账号变化时清空；
`telemetry.breadcrumbs_dropped` 表示因容量淘汰的条数。
不采集请求正文、响应正文、DOM 文本、Cookie、认证头、查询参数或原始 User-Agent。
API 错误日志不复制服务端文案；运行时诊断文本会清理 URL 参数、Bearer 令牌和邮箱并限制长度。
原始异常仍由业务处理，不修改展示文案。

重复聚合键由错误指纹、版本、路由模板、操作、资源、用户及会话构成。
首次完整发送，窗口为 60 秒；最多保留 100 组，满时结束最旧分组。
每十秒检查窗口，到期发送 `frontend.error_summary`；页面隐藏、离开、账号切换或卸载监听时
尝试提前发送摘要。

- `error.occurrence_count`：本条首次记录或摘要新增代表的次数；统计总发生量应对它求和。
- `error.total_count`：该窗口累计次数，供查看摘要，不能再次累加。
- `error.first_seen`、`error.last_seen`：摘要覆盖的首次、末次发生时间。

每分钟最多发送 200 条事件；超过上限的条数通过 `telemetry.events_dropped` 报告。
重复摘要及丢弃摘要也占用同一预算；满额后的强制刷新保留丢弃计数，等待下一窗口报告。
这是事件出口的应用侧预算；SDK 仍保留独立的批处理队列上限。
遥测出口异常只累计丢弃数，不抛回业务，也不递归记录错误。

摘要进入 SDK 队列不代表立即送达服务端；页面被强制终止、网络中断等情况下可能丢失尾部数据。
当前未增加持久化离线队列、成功率分母、性能指标、业务操作 trace 和 source map 还原。

## 日志后台使用

### 构建与源码定位

Vite 在一次配置求值中生成唯一构建身份：版本、完整 commit、UUID build ID、模式、release 和 dirty。
同一 commit 重建产生不同 release。bundle、事件的 `service.version/commit/release/build_id/build_mode/dirty`、
复制的错误详情、公开 `build-info.json` 和发布 manifest 使用这一份身份；发布阶段不重新生成。
Jenkins 容器标签也读取该 release；`build-info.json` 使用 no-cache，避免缓存旧身份。

HTTP 仍以构建身份、端点、request ID 和 trace 定位，不额外捕获业务调用 stack。
运行时保留有效 stack；缺少 stack 坐标时，只有 ErrorEvent 提供文件名及正整数行列，才携带
`code.file.path/line.number/column.number` 备援。`error.location_status` 为 `stack`、`event` 或
`unavailable`；最后一种表示没有可用位置，不能承诺源码行列。本增量不生成 source map。

构建身份是公开诊断信息，不含凭据、业务正文或本机路径。dirty 表示构建时 Git 工作区状态，
不代表运行时修改；不能仅凭 commit 相同选用另一次重建的附件。

按环境、版本确定发布范围，再用 `user.id`、`session.id`、`page.instance.id` 缩小会话。
先看 `frontend.request_failure` 的 `error.kind`、`api.endpoint`、状态码和业务码，
再查看同一现场的 `telemetry.breadcrumbs` 及后端 `wisepen.request_id`。
如果只显示 ERROR 等级，会隐藏正常生命周期、预期认证失败和 WARN 业务失败。

Loki 索引标签保持服务、环境等有限维度；用户、会话、资源及 trace ID 保持 structured metadata。
Collector／Loki 的映射配置不在本仓库，本次没有修改。
请求和导航 trace 从 `/v1/traces` 独立导出。Loki 中的 `trace_id`／`span_id` 来自标准日志上下文，
不能仅凭日志入库判断 trace 已进入 Tempo 等数据源。Grafana 从日志跳到 trace 还需要配置数据源关联；
前后端共用 trace 则要求后端继续接收并使用 `traceparent`。这些服务端配置不在本仓库。

## 离线验证

`pnpm check:telemetry` 是统一入口，测试按上下文、生命周期、请求行为与 trace 关联拆分。
测试使用真实请求包装、Axios 拦截器和 OTel TracerProvider／LoggerProvider，以可控 adapter、
内存 processor 和浏览器替身代替网络与页面；验证分类、重试、取消、去重、账号竞态、聚合、字段
过滤和监听清理，以及父子 span、W3C traceparent、失败日志和延迟摘要的 trace 归属，不发网络请求。
运行态回归仍需用户明确授权；发布后应验证 collector 入库和查询结果。
