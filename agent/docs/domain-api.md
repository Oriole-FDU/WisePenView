# Domain API 规范

API 层是后端协议的薄封装，位于 `src/domains/<Domain>/apis`。它只表达“如何请求后端”，不表达“业务如何展示”。

## 一、职责

API 层只负责：

- 定义后端 URL、method、query/body 位置。
- 调用 `apiGet`、`apiPost`、`apiPut`、`apiDelete`。
- 使用请求/响应 DTO 类型。
- 返回已经由 `src/apis/request.ts` 解包后的 `data`。
- 做极轻协议适配，例如 GET 参数放入 `params`、POST 空 body 使用 `null` 或 `undefined`。

API 层禁止：

- 做业务字段映射。
- 做 fallback、枚举转换、ID 归一化、时间格式化。
- 读写 store、缓存、session。
- 做 UI 提示。
- 直接处理 React 生命周期或组件状态。
- 直接 import service、mapper、view、component。

## 二、手写 DTO

- 新增或改造 API 类型时，在同域 `apis/*Api.type.ts` 手写 request/response DTO。
- DTO 字段必须与后端接口文档对齐，不做字段重命名或展示语义加工。
- 如果接口字段、枚举或响应结构不确定，先向用户确认接口文档，不要盲猜。
- API DTO 只作为后端协议类型，不允许泄漏到组件展示层。

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

## 五、检查清单

- [ ] API 文件只做请求薄封装。
- [ ] API DTO 手写在同域 `apis/*Api.type.ts`，字段与后端接口文档对齐。
- [ ] API DTO 未泄漏到组件展示层。
- [ ] 未新增 `any`。
- [ ] 未在 API 层做 fallback、字段映射、UI 提示或缓存。
- [ ] 同一 URL 没有重复定义。
