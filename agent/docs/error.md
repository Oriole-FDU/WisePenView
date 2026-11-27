# 前端错误契约

本文阐述如何在前端创建、处理、消费、上报错误。请严格按照本文编写错误相关代码。

## 1. 设计原则

1. **一种错误**：业务面只有 `WisePenError`；可预期失败不用原生 `Error`。
2. **两个入口**：`createError` 只负责创建和规范化，不上报；`reportError` 唯一负责上报和用户提示（toast）。
3. **抛与报互斥**：要么 `throw`，要么 `reportError`。不要 report 完再 throw，也不要中间层报一次、外层再弹 toast。
4. **在消费边界报**：谁发起对用户可见的操作（保存 / 发送 / 上传 / 点击），谁在自己的 catch 终点调用 `reportError`。不要在出错语句旁就近报，也不要丢给 App 根 Boundary；Service / API / 工具只抛不报。
5. **文案与诊断分离**：用户文案只走 `parseErrorMessage`；`message` 只作诊断。

## 2. 契约规范

### `WisePenError`

| 字段        | 说明                                                          |
| ----------- | ------------------------------------------------------------- |
| `code`      | 网络 10–99，客户端 100–999，后端业务码原样带入                |
| `source`    | `'network' \| 'http' \| 'api' \| 'client'`（不再另设 `type`） |
| `message`   | 诊断文案；不是用户文案                                        |
| `serverMsg` | 后端原文（若有）                                              |
| `meta`      | 结构化上下文，可参与 i18n 插值                                |
| `cause`     | 原始异常                                                      |

`parseErrorMessage`：`i18n(code+meta) → serverMsg → 未知`。

### API

```ts
createError(options: WisePenErrorOptions): WisePenError
createError(error: unknown, defaults?: Omit<WisePenErrorOptions, 'cause'>): WisePenError

type ReportToast = 'warning' | 'error' | 'info' | 'silence'
reportError(error: WisePenError, toast?: ReportToast): string // 默认 'error'；返回 support ID
```

| API                               | 规则                                                                                            |
| --------------------------------- | ----------------------------------------------------------------------------------------------- |
| `createError(options)`            | 主动创建；按真实来源填 `source`                                                                 |
| `createError(unknown, defaults?)` | 已是 `WisePenError` → 原样返回；否则 `client` + `UNKNOWN`（可被 defaults 覆盖），`cause` 为原值 |
| `reportError`                     | 只接受 `WisePenError`；`'silence'` 只上报；同一对象多次 report 去重；无 `message` 覆盖参数      |

### 分层

| 层                             | 做                               | 不做                                |
| ------------------------------ | -------------------------------- | ----------------------------------- |
| Service / Mapper / 工具 / API  | `createError` + `throw`          | `reportError`、toast                |
| View / Controller / `useApi`   | 消费边界 `reportError` + 更新 UI | 手写 toast、直接 `captureException` |
| 根 Boundary / `window.onerror` | 仅兜底无人 catch 的意外          | 业务主路径                          |

禁止：`createClientError`；业务侧 `new WisePenError` / `captureException` / `toast.*(parseErrorMessage)`；Domain、API、共享工具内 `reportError`。

已收口：`createClientError` / `notifyError` / 错误 toast 旁路、业务侧 `application-handled` 与直接 `new WisePenError`。

## 3. 写法示范

主动创建并上抛（Service / API）：

```ts
const error = createError({
  code: FRONTEND_CLIENT_ERROR.DRIVE_NODE_NOT_FOUND,
  source: 'client',
  meta: { nodeId },
});
throw error;
```

消费边界 catch（View / Controller）：

```ts
try {
  await save();
} catch (err) {
  const error = createError(err);
  reportError(error);
}

// 需要更具体的码或 toast 级别：
const error = createError(err, {
  code: FRONTEND_CLIENT_ERROR.DRAWIO_SAVE_FAILED,
  source: 'client',
  meta: { detail: '...' },
});
reportError(error, 'warning');
reportError(error, 'silence'); // 只要上报
```

## 4. Lint 检查

只跑错误契约相关规则：

```bash
pnpm lint:error
```

有命中时退出码为 1。规则实现见 [`lint/error.js`](../../lint/error.js)。
