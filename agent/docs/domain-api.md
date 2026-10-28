# Domain API 规范

API 层是后端协议的薄封装，位于 `src/domains/<Domain>/apis`。它只表达“如何请求后端”，不表达“业务如何展示”。

## 一、职责

API 层只负责：

- 通过 `ApiContract` 定义后端 `name`、`endpoint`、请求 Schema 和响应 Schema。
- 调用传输层 API，并把 query/body 放入正确位置。
- 在发送前和响应解包后执行 Contract 校验。
- 只向 service 返回已经解包、校验并完成类型推导的响应。
- 做极轻协议适配，例如 GET 参数放入 `params`、POST 空 body 使用 `null` 或 `undefined`。

`src/apis/request.ts` 在解包前会运行期校验统一 response envelope：`code` 必须是有限数字，必须存在 `data`；Python response 的 `msg` 必须是字符串，带 `key` 的 Java response 允许 `msg` 为字符串或 `null`，`key` 只能是字符串或 `null`。envelope 不符合契约时抛出传输层 `WisePenError`，不会把未验证的响应继续交给领域 API。

API 层禁止：

- 做业务字段映射。
- 做 fallback、枚举转换、ID 归一化、时间格式化。
- 读写 store、缓存、session。
- 做 UI 提示。
- 直接处理 React 生命周期或组件状态。
- 直接 import service、mapper、view、component。

## 二、API DTO 与前端消费契约

- 新增或改造 API 契约时，优先在同域 `apis/*Api.schema.ts` 使用 Zod 定义 request/response Schema，再由 `apis/*Api.contract.ts` 暴露 API 层使用的请求/响应类型。
- API Schema 是前端消费契约，只声明前端实际发送和消费的字段；不得 import 后端 Entity、共享 Base 或 Swagger 生成类型。
- 响应字段必须存在时不要使用 `.optional()`；值可为 `null` 时使用 `.nullable()`。请求字段的 `.optional()` 只表示允许省略，`.nullable()` 表示允许显式传 `null`，两者不能混用。
- Zod 只约束 wire 结构与 primitive 类型。ID、时间、枚举和数值范围按后端真实序列化规则声明，不使用 `z.coerce()` 掩盖类型漂移。
- 不使用 `.catch()`、`.default()` 或 `z.strictObject()` 静默兼容违约或拒绝后端新增字段；默认 `z.object()` 丢弃未声明字段。
- 每个 API 使用一个 `ApiContract` 描述 `name`、`endpoint`、`request` 和 `response`；即使没有请求体或返回数据，也必须显式绑定 `z.undefined()`、`z.null()` 等空 Schema。请求发送前与响应解包后分别调用 `parseApiRequest`、`parseApiResponse`，两者直接复用该 Contract。解析失败必须 fail-fast，不把缺失字段、错误类型或意外 `null` 继续传给 mapper 或 service。
- 非泛型 `apiGet`、`apiPost`、`apiPut`、`apiDelete` 只解包 envelope，payload 在 Contract 解析前保持 `unknown`；未迁移契约的旧接口只能使用显式标注的 `apiGetUnchecked<T>`、`apiPostUnchecked<T>`、`apiPutUnchecked<T>`、`apiDeleteUnchecked<T>` 兼容入口，不得在新接口中新增这些调用。
- 契约违约诊断只记录 endpoint、contract、字段路径和 issue code，不记录原始请求或响应正文。
- 未迁移的领域可以继续使用手写 `apis/*Api.type.ts`，但同一声明只能有一个事实源。
- 接口字段、枚举或响应结构需要结合 Java 实现、mapper 与业务语义确认；无法从代码得到稳定结论时，先向用户确认，不要盲猜。
- API DTO 只作为后端协议类型，不允许泄漏到组件展示层。
- API 方法必须返回明确的 DTO 类型；禁止使用 `Promise<unknown>` 或 `Promise<Record<string, unknown>>` 作为领域 API 的返回契约。协议中确实开放的 JSON 字段可以在 DTO 内显式使用 `Record<string, unknown>`，并由 mapper 决定如何消费。

命名建议：

```text
src/domains/<Domain>/apis/
├── <Domain>Api.schema.ts
├── <Domain>Api.contract.ts
└── <Domain>Api.ts
```

- 请求 Schema：`XxxApiRequestSchema`
- 响应 Schema：`XxxApiResponseSchema`
- 接口契约：`XxxApiContract`
- 请求/响应类型：由对应 `XxxApiContract` 使用 `ApiContractRequest`、`ApiContractResponse` 推导
- API 对象：`XxxApi`、`XxxMemberApi`、`XxxConfigApi`

### POST 标准写法

Schema 文件只声明 wire shape，不声明 endpoint：

```ts
// ExampleApi.schema.ts
export const GetExampleApiRequestSchema = z.object({
  exampleId: z.string(),
});

export const GetExampleApiResponseSchema = z.object({
  exampleId: z.string(),
  description: z.string().nullable(),
});

export const EmptyApiRequestSchema = z.undefined();
export const EmptyApiResponseSchema = z.null();
```

Contract 文件绑定接口身份和两侧 Schema，并导出 API 层使用的类型：

```ts
// ExampleApi.contract.ts
export const GetExampleApiContract = defineApiContract({
  name: 'GetExampleApi',
  endpoint: '/example/getExample',
  request: GetExampleApiRequestSchema,
  response: GetExampleApiResponseSchema,
});

export type GetExampleApiRequest = ApiContractRequest<typeof GetExampleApiContract>;
export type GetExampleApiResponse = ApiContractResponse<typeof GetExampleApiContract>;
```

API 方法只执行固定四步，不读取 `data.xxx`：

```ts
// ExampleApi.ts
async function getExample(req: GetExampleApiRequest): Promise<GetExampleApiResponse> {
  const request = parseApiRequest(GetExampleApiContract, req);
  const data = await apiPost(GetExampleApiContract.endpoint, request);
  return parseApiResponse(GetExampleApiContract, data);
}
```

GET、PUT、DELETE 使用同一模式，只在放置 query/body 时不同：

```ts
// 以下示例省略 UpdateExample、RemoveExample 的 Schema 与 Contract 声明。
async function getExample(req: GetExampleApiRequest): Promise<GetExampleApiResponse> {
  const request = parseApiRequest(GetExampleApiContract, req);
  const data = await apiGet(GetExampleApiContract.endpoint, { params: request });
  return parseApiResponse(GetExampleApiContract, data);
}

async function updateExample(req: UpdateExampleApiRequest): Promise<UpdateExampleApiResponse> {
  const request = parseApiRequest(UpdateExampleApiContract, req);
  const data = await apiPut(UpdateExampleApiContract.endpoint, request);
  return parseApiResponse(UpdateExampleApiContract, data);
}

async function removeExample(req: RemoveExampleApiRequest): Promise<RemoveExampleApiResponse> {
  const request = parseApiRequest(RemoveExampleApiContract, req);
  const data = await apiDelete(RemoveExampleApiContract.endpoint, { params: request });
  return parseApiResponse(RemoveExampleApiContract, data);
}
```

没有请求或响应体时也必须显式声明和解析：

```ts
export const RemoveExampleApiContract = defineApiContract({
  name: 'RemoveExampleApi',
  endpoint: '/example/removeExample',
  request: EmptyApiRequestSchema,
  response: EmptyApiResponseSchema,
});

export type RemoveExampleApiResponse = ApiContractResponse<typeof RemoveExampleApiContract>;

async function removeExample(): Promise<RemoveExampleApiResponse> {
  const request = parseApiRequest(RemoveExampleApiContract, undefined);
  const data = await apiPost(RemoveExampleApiContract.endpoint, request);
  return parseApiResponse(RemoveExampleApiContract, data);
}
```

稳定依赖方向为：

```text
ExampleApi.schema -> ExampleApi.contract -> ExampleApi
```

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
- Axios 最终 5xx 由 `@/observability/httpFailure` 记录；API 层不得直接调用 capture 或 OTel。
- 4xx、无响应网络错误和 HTTP 200 业务失败尚未由请求层统一生成错误遥测。
- 客户端业务校验错误放到 service 层，通过 `createClientError` 抛出。

## 五、检查清单

- [ ] API 文件只做请求薄封装。
- [ ] 新增 API 契约使用同域 Zod Schema，Req/Res 类型由 Contract 推导。
- [ ] 响应契约未使用 optional；真实空值使用 nullable。
- [ ] 每个 API 的 Contract 都显式包含 name、endpoint、request 和 response。
- [ ] API 请求发送前和响应解包后均通过同一个 Contract 执行解析。
- [ ] 新接口未使用 `apiGetUnchecked<T>`、`apiPostUnchecked<T>`、`apiPutUnchecked<T>` 或
      `apiDeleteUnchecked<T>`。
- [ ] API DTO 未泄漏到组件展示层。
- [ ] API 方法返回明确 DTO，不以 `unknown` 作为未分层的响应出口。
- [ ] 未新增 `any`。
- [ ] 未在 API 层做 fallback、字段映射、UI 提示或缓存。
- [ ] 同一 URL 没有重复定义。
