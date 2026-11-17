# ChatTurn Runtime 重构方案：显式 status + 做薄 Message

> 状态：View 已落地；浏览器与真实后端联调待验证
>
> 相关：[`chat-turn-respond-sequence.md`](./chat-turn-respond-sequence.md)、[`ChatTurn/BUSINESS.md`](../src/domains/ChatTurn/BUSINESS.md)、[`Chat/BUSINESS.md`](../src/components/business/Chat/BUSINESS.md)

## 1. 目标

- **Runtime 显式拥有** turn / 本地流 / 续跑决策（不再用 AI SDK `ChatStatus` 做协议分支）。
- **Message 管线收紧做薄**：只做「泵 + UIMessage 缓冲 + 传输动作」。
- **行为对齐现有时序图**（respond / respond+resume / recover），本方案默认 **不改后端契约**。

一句话：

> SDK 可以拥有 messages；不能拥有「这一轮 turn 处于什么业务态」。

## 2. 目标架构

```
┌─────────────────────────────────────────────────────────┐
│ Chat UI / Controllers                                   │
│  发送门禁、审批弹窗、历史分页 UI、取消按钮                 │
└──────────────────────────┬──────────────────────────────┘
                           │ 只谈领域动作
┌──────────────────────────▼──────────────────────────────┐
│ ChatTurn Runtime（WisePen 显式拥有）                      │
│  · BackendTurnPresence: active | none                   │
│  · LocalStream: idle | connecting | open | closed       │
│  · Continuation: respond | respond_and_resume | recover │
│  · stop(前端) vs cancel(后端) 分开                       │
└─────────────┬─────────────────────────────┬─────────────┘
              │ 只当泵与消息缓冲              │ HTTP 契约
┌─────────────▼─────────────┐   ┌───────────▼─────────────┐
│ Message Pipeline          │   │ ChatTurn Service/API    │
│ （薄封装 useChat）         │   │ completions/respond/    │
│  messages 组装            │   │ stream/recover/active/  │
│  SSE 读写 + abort         │   │ cancel                  │
│  不参与协议决策            │   │                         │
└───────────────────────────┘   └─────────────────────────┘
```

### 2.1 三轴状态（禁止混用）

| 轴 | 枚举 / 形态 | Owner | 用途 | 禁止 |
|---|---|---|---|---|
| `localStream` | `idle \| connecting \| open \| closed` | Runtime | 本地 SSE 是否仍订阅；续跑是否可直接 respond | 猜后端 turn |
| `backendTurn` | `active \| none`（`active` 时带 `turnId`） | Runtime（查询 `/active`，不长期假装缓存为真相） | 断流后续跑分支 | 驱动打字机 UI |
| `uiBusy` | 派生布尔 / 窄枚举 | Runtime 派生或 Controller | 禁用输入、`generating`、跟滚 | 选 respond/recover |

`suspended` **不单独存**：无 active + 需要续跑 → `Continuation = recover`（与现时序图一致）。

对外若仍暴露 `status`，必须是 **WisePen 映射结果**（例如为兼容 UI 的 `ready | submitted | streaming | error`），**真源是 `localStream`（+ error 旗标）**，不是 `chat.status`。

### 2.2 模块切分（目标文件）

| 模块 | 建议路径 | 职责 |
|---|---|---|
| Message Pipeline | `domains/ChatTurn/runtime/useChatMessagePipeline.ts`（可由现 `useChatTurn` 拆出） | transport、`useChat`、`messages`/`setMessages`、`sendMessage`/`resumeStream`/`stop`；**不**导出 SDK `status`；**不**含 recover 路由 |
| Stream 适配 | 同文件或 `localStreamBridge.ts` | 在 send/resume/stop/onFinish/onError 时写入 Runtime 的 `localStream` |
| Continuation | `domains/ChatTurn/runtime/resolveContinuation.ts` | 纯函数：`(localStream, activeTurnId) → ContinuationAction` |
| Turn Runtime | `domains/ChatTurn/runtime/useChatTurnRuntime.ts` | 持有 `localStream`、resume 去重、`submitToolApprovals`、`resumeLocalStream`、`stopLocalStream`；组合 Message Pipeline + Service |
| Service/API | 现有 `apis/` + `service/` | 不变（契约层） |
| Controller | `components/business/Chat/_controllers/useChatTurnController.ts` | 组合 Runtime + history + approval + send 门禁 + cancel(后端) |
| Approval | `useChatToolApproval.ts` | 参数改为 `submitApprovals`，不再叫 `recover` |

Controller 建议对外分组（减少平面大袋子）：

```ts
{
  messages,
  stream: { status /* WisePen */, localStream, stopLocalStream, resumeLocalStream },
  turn: { send, submitToolApprovals, cancel, cancelling },
  history,
  approval,
  model: { currentModel, setCurrentModel },
  hasRenderableChatContent,
  isEmpty,
}
```

首期可保持现有扁平返回以降低改 UI 成本，但 **内部必须已分组**；扁平字段仅作适配层 alias。

## 3. Message 做薄：允许 / 禁止

### 允许（Message Pipeline）

- 持有 `useChat` / `DefaultChatTransport` / `chatSseNormalizer`
- 导出：`messages`、`setMessages`、`sendTurnMessage`（或更底层的 `pumpSend`）、`resumeStream`、`stop`
- 在传输边界回调里 **通知** Runtime 更新 `localStream`（通过注入的 `onLocalStreamChange`，或 Runtime 包一层再调 pump）

### 禁止（Message Pipeline）

- 读取 `chat.status` 做 respond/recover 分支
- `recoverTurn` / 任何 Continuation 路由
- `getActiveTurnId` 业务决策（查询可发生在 Runtime）
- 向 UI/`...chat` 整包泄漏 SDK 能力（尤其 `status`、`addToolApprovalResponse` 若未全链路采用）
- 会话身份、历史分页、审批 UI state

薄的验收句：

> 改「messages 怎么长」可以动 Message Pipeline；改「这一轮业务态 / 打哪条 API」不能进 Message Pipeline。

## 4. Runtime：status 如何显式维护

### 4.1 `localStream` 转移（由 Runtime 写，不由 SDK 当真相）

| 触发 | 下一态 |
|---|---|
| `sendTurnMessage` / `resumeLocalStream` / recover 开流 **之前** | `connecting` |
| Message Pipeline 首次确认流已建立（适配：SDK 进入 streaming，或自管「pump started」回调） | `open` |
| 流正常结束（`onFinish` 且非 error） | `idle` |
| `stopLocalStream` / abort | `closed`（或立刻回 `idle`；二选一写死并文档化，建议：`closed` 表示「主动或异常断开」，下次 send 前回到 `connecting`） |
| 流错误 `onError` | `closed` + `lastError` |
| 切 session / `invalidate` | 重置为 `idle`，并清空 resume 去重 ref |

首期允许 **从 SDK status 做单向投影** 作为实现细节：

```ts
// 仅允许存在于 bridge，禁止出现在 resolveContinuation / UI
function projectSdkStatusToLocalStream(sdk: ChatStatus): LocalStream { ... }
```

但 `resolveContinuation` **只接收 `localStream`**，这样以后可去掉对 SDK status 的依赖而不改协议层。

### 4.2 Continuation（纯函数）

```ts
type ContinuationAction = 'respond' | 'respond_and_resume' | 'recover';

function resolveContinuation(input: {
  localStream: LocalStream;
  activeTurnId: string | null;
}): ContinuationAction {
  if (localStream === 'open' || localStream === 'connecting') return 'respond';
  if (activeTurnId) return 'respond_and_resume';
  return 'recover';
}
```

与现逻辑对齐：`open|connecting` ≈ 今日 `streaming|submitted`。

### 4.3 `submitToolApprovals`（原 `recoverTurn`）

1. 组 `ChatRecoverApiRequest` body（schema 名可后续再改，行为不变）
2. `action = resolveContinuation({ localStream, activeTurnId })`
3. `respond` → `respondChatTurn`
4. `respond_and_resume` → `respondChatTurn` + `resumeLocalStream`
5. `recover` → Message Pipeline 开 recover SSE（今日 `sendMessage(undefined, { body })`）

命名：**公开 API 一律 `submitToolApprovals`**；删除或 deprecate `recoverTurn`。

### 4.4 stop vs cancel

| API | 含义 |
|---|---|
| `stopLocalStream` | 只 abort 前端泵（Message Pipeline `stop`）+ `localStream → closed` |
| `cancelBackendTurn` | Service `cancelTurn` |
| Controller `cancel` | 组合：`stopLocalStream` + `cancelBackendTurn`（保留今日用户取消语义） |

History 切会话 cleanup：**只** `stopLocalStream`，不 cancel 后端（与现 BUSINESS 一致）。

### 4.5 Resume 去重

仍由 Runtime 持有 `resumeRequestRef` / `resumedTurnRef`，但生命周期与文档对齐：

- 切 `sessionId` 或 `stopLocalStream` → `invalidateResumeState()`
- 禁止「同一 Chat 实例上 sessionId 曾 resume 过就永久粘住」

## 5. 与现代码的映射

| 今日 | 目标 |
|---|---|
| `useChatTurn` 整包 | 拆为 Message Pipeline + Turn Runtime |
| `chat.status` 决策 | `localStream` + `resolveContinuation` |
| `recoverTurn` | `submitToolApprovals` |
| `resumeTurnStream` | `resumeLocalStream` |
| `stop` | `stopLocalStream`（Controller cancel 再调后端） |
| `useChatToolApproval({ recover })` | `{ submitApprovals }` |
| UI `status === submitted\|streaming` | `uiBusy` / Runtime 映射的兼容 `status` |
| `...chat` 泄漏 | 白名单导出 |

## 6. 落地阶段（建议按 PR 切）

### Phase 0 — 文档与契约（无行为变化）

- 本方案入 `docs/`
- 更新 `ChatTurn/BUSINESS.md`、`Chat/BUSINESS.md`：三轴表、Message 薄边界、stop≠cancel
- 时序图文案：FE 角色改为 Runtime；`recoverTurn` 改为 `submitToolApprovals`

### Phase 1 — 抽纯函数 + 重命名（行为不变）

- 增加 `resolveContinuation.ts` + 单测（四象限：open/connecting/closed × active/none）
- `recoverTurn` → `submitToolApprovals`（可暂时保留 alias）
- Approval / observability operation 名从 `chat.recover` 改为更中性（如 `chat.submitApprovals`），避免误导

### Phase 2 — Runtime 显式 `localStream`（行为对齐，实现换真源）

- `useChatTurnRuntime` 持有 `localStream`
- Continuation **只读** `localStream`
- Message Pipeline 不再导出 SDK `status`；UI 改读 Runtime 映射
- `invalidateResumeState` 接到切 session / stop

### Phase 3 — Controller API 分组与扫尾

- 返回值按 `stream` / `turn` / `history` / `approval` 分组（或内部已分组、外部 alias 逐步删）
- Model：`currentModel` 文档化为 `lastSentModel`（或改名）
- `error`：要么 UI 消费，要么 bridge 归一成 `closed` + toast，避免幽灵第四态
- 评估 WisePenBot 同源 `useChatTurn` 是否同步（本方案默认 **View 先落地**，Bot 跟版本）

## 7. 验收标准

- [x] 业务代码（Controller / Approval / Conversation）**零处**直接读 SDK `chat.status` 做协议或 UI busy（测试可 grep）
- [x] `resolveContinuation` 与 [`chat-turn-respond-sequence.md`](./chat-turn-respond-sequence.md) 三条路径一致
- [x] Message Pipeline 文件内无 `respondChatTurn` / `getActiveTurnId` 分支
- [x] 切 session 后再回原 session，必要时仍可 resume（去重可失效）
- [x] 用户取消 = 前端 stop + 后端 cancel；切会话 = 仅前端 stop
- [x] 审批关闭仍不隐式决策；streaming/open 时可提交审批
- [ ] 现有发送 / 历史 / 流式渲染 / 审批主路径手测通过

## 8. 明确不做

- 不上 ChatTurn 全局 Zustand「大一统 store」
- 不重写 SSE→UIMessage 泵（继续用 AI SDK）
- 不半接入 `addToolApprovalResponse`（除非另开「整条审批改走 SDK 协议」专项）
- 不改后端 respond/recover/stream 契约（除非另开协议 PR）
- 不把历史分页、session 路由并进 Runtime

## 9. 风险与缓解

| 风险 | 缓解 |
|---|---|
| `localStream` 与 SDK 内部态短暂不一致 | bridge 单向投影 + 在 send/resume 入口先标 `connecting`；单测 continuation 不依赖真实 SSE |
| 重命名大面积改调用方 | Phase 1 保留 deprecate alias |
| Bot/View 分叉 | Phase 3 显式跟版或 issue 跟踪 |
| UI 仍依赖 `submitted/streaming` 字符串 | Runtime 提供兼容映射，直到 UI 改读 `uiBusy` |

## 10. 建议阅读顺序（落地后）

1. 本方案  
2. `chat-turn-respond-sequence.md`  
3. `resolveContinuation.ts`  
4. `useChatTurnRuntime.ts` → `submitToolApprovals`  
5. `useChatMessagePipeline.ts`  
6. `useChatTurnController.ts` / `useChatToolApproval.ts`

## 11. View 落地说明

- 已拆为 `useChatTurnRuntime` 与 `useChatMessagePipeline`，旧 `useChatTurn`、`recoverTurn`、`resumeTurnStream` 和 SDK 整包导出均已删除。
- 本地状态直接由开流入口、transport 建连与泵结束结果维护，无需 SDK status 投影。兼容 `status` 由 Runtime 映射，UI busy 统一消费 `uiBusy`。
- Controller 已分组，模型字段为 `model.lastSentModel`；审批提交态独立，流仍活跃时可提交，失败可重试。旧会话提交完成不能改写新会话审批态。
- `/respond` 在本分支补齐 checked JSON Contract，复用 recovery 请求 Schema，与本地后端 `chat/api/endpoints/chat.py` 的 `ChatRecoverRequest → R.success()` 对齐。
- 续跑状态组合与生命周期验证使用仓库外一次性脚本，不新增常驻测试；真实 AI SDK Chat/transport 配合模拟服务覆盖建连、取消、断流、迟到结果、会话往返与草稿升级。
- WisePenBot 仍有独立 `useChatTurn.ts`，本次按 View 优先范围不修改相邻仓库，需由 Bot 后续跟版。
- 未启动开发服务或浏览器，发送、分页、流式渲染和审批的真实服务端主路径仍需联调验收。
