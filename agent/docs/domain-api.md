# Domain API 规范

API 层是后端协议的薄封装，位于 `src/domains/<Domain>/apis`。它只表达“如何请求后端”，不表达“业务如何展示”。

## 一、职责

API 层只负责：

- 定义后端 URL、method、query/body 位置。
- 调用 `apiGet`、`apiPost`、`apiPut`、`apiDelete`。
- 使用请求/响应 DTO 类型。
- 返回已经由 `src/apis/request.ts` 解包后的 `data`。
- 做极轻协议适配，例如 GET 参数放入 `params`、POST 空 body 使用 `null` 或 `undefined`。

`src/apis/request.ts` 在解包前会运行期校验统一 response envelope：`code` 必须是有限数字，必须存在 `data`；Python response 的 `msg` 必须是字符串，带 `key` 的 Java response 允许 `msg` 为字符串或 `null`，`key` 只能是字符串或 `null`。envelope 不符合契约时抛出传输层 `WisePenError`，不会把未验证的响应继续交给领域 API。

API 层禁止：

- 做业务字段映射。
- 做 fallback、枚举转换、ID 归一化、时间格式化。
- 读写 store、缓存、session。
- 做 UI 提示。
- 直接处理 React 生命周期或组件状态。
- 直接 import service、mapper、view、component。

Chat 的 Session、history、Model、Provider、Tool 和活动 turn 响应，以及 Admin 用户详情，在 mapper 入口校验必要字段和容器；失败统一抛出 `INVALID_RESPONSE`。可选字段异常由 mapper 省略，未知 Chat part 跳过，已知 part 的必要字段缺失则拒绝整笔响应。类型声明不能替代这些运行期检查。

`pnpm check:api-contract` 同时执行 envelope 与领域 mapper 的正反例，并解析全部领域 API 的实际返回类型，拒绝顶层 `unknown`、`any` 或宽泛记录响应。Chat 的 tool input/output、metadata、工具配置 schema、runtime options，以及 InlineComment anchor payload 是明确允许的开放 JSON；Group/Course metadata 在 wire DTO 中为 JSON 字符串，由现有 mapper 解析，不建立虚假的固定 schema。其他领域的明确 DTO 通过静态审计，不代表所有字段已有运行期校验。

## 二、手写 DTO

- 新增或改造 API 类型时，在同域 `apis/*Api.type.ts` 手写 request/response DTO。
- DTO 字段必须与后端接口文档对齐，不做字段重命名或展示语义加工。
- 如果接口字段、枚举或响应结构不确定，先向用户确认接口文档，不要盲猜。
- API DTO 只作为后端协议类型，不允许泄漏到组件展示层。
- API 方法必须返回明确的 DTO 类型；禁止使用 `Promise<unknown>` 或 `Promise<Record<string, unknown>>` 作为领域 API 的返回契约。协议中确实开放的 JSON 字段可以在 DTO 内显式使用 `Record<string, unknown>`，并由 mapper 决定如何消费。

命名建议：

```text
src/domains/<Domain>/apis/
├── <Domain>Api.ts
└── <Domain>Api.type.ts
```

- 请求类型：`XxxApiRequest`
- 响应类型：`XxxApiResponse`
- API 对象：`XxxApi`、`XxxMemberApi`、`XxxConfigApi`

## 三、依赖方向

允许：

```text
service -> @domain-apis -> domain api -> src/apis/request -> src/apis/Axios
```

禁止：

```text
api -> service
api -> mapper
api -> store
api -> hooks
api -> views/components
```

同一 URL 只在一个 API 文件中定义一次。其它业务需要复用时，优先在 service 层编排已有 API。

## Mock API

- `mock/*Api.mock.ts` 使用對應真實 API 的 `typeof` 型別約束方法、參數與回應。
- fixture 採用 API DTO；前端映射、校驗、快取與跨 service 編排共用正式實作。
- mock 記憶體資料僅模擬後端讀寫，重新整理頁面後重置。不同 API 操作同一份資源資料，避免各自維護副本。
- 編輯器內容、PDF 預覽等展示 fixture 放在 view 的 mock 目錄，不塞入後端 DTO。

## 四、错误边界

- 网络、HTTP、业务响应解包由 `src/apis/Axios.ts` 与 `src/apis/request.ts` 统一处理。
- API 层不捕获错误用于改写 UI 文案。
- API 层不调用 `message.*`。
- 客户端业务校验错误放到 service 层，通过 `createClientError` 抛出。

## 五、F13 覆盖矩阵

| 领域                    | 已覆盖的稳定响应                                                   |
| ----------------------- | ------------------------------------------------------------------ |
| Chat                    | history、session、model、provider、tool、SSE 已知事件              |
| Admin                   | 用户分页、用户资料、公告消息分页                                   |
| Agent／Skill            | 资源信息、版本 bundle、完整策略 spec、资产列表与上传回执           |
| Document                | 待处理文档、文档详情、资源引用                                     |
| Group                   | 小组详情、分页列表、成员分页、配置                                 |
| Image／Speech           | 图片上传回执、语音凭据                                             |
| InlineComment／Interact | 批注列表、评论分页、收藏夹与收藏资源分页                           |
| Message／User           | 用户消息分页、邀请记录、用户资料、任务状态和签到                   |
| Resource／Tag           | 资源详情和分页、搜索分页、标签树                                   |
| 共享资产                | 版本资源信息、Agent／Skill 版本 bundle、资产上传票据、OSS STS 凭据 |

上述 mapper 在入口拒绝缺失的必要记录、数组或分页容器，并统一抛出 `INVALID_RESPONSE`。可选字段类型错误会被省略；未知 Chat part 和未知但带有合法 `type` 的 SSE 事件继续透传。

明确保留开放 JSON 的字段：Chat 工具 `input`／`output`／`metadata`、工具 schema、runtime options、OnlyOffice vendor config、Group／Tag metadata 字符串、InlineComment `anchorPayload`，以及按 ID 索引的权限映射。它们不建立虚假固定结构。

`check:api-contract` 会执行各领域 mapper 的有效和缺失字段样例，同时用 TypeScript AST 检查领域 API 不得新增 `Promise<unknown>`、`Promise<any>` 或顶层宽泛记录响应；开放字段必须登记在脚本豁免表中。

## 六、检查清单

- [ ] API 文件只做请求薄封装。
- [ ] API DTO 手写在同域 `apis/*Api.type.ts`，字段与后端接口文档对齐。
- [ ] API DTO 未泄漏到组件展示层。
- [ ] API 方法返回明确 DTO，不以 `unknown` 作为未分层的响应出口。
- [ ] 未新增 `any`。
- [ ] 未在 API 层做 fallback、字段映射、UI 提示或缓存。
- [ ] 同一 URL 没有重复定义。
