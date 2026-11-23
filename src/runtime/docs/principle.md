# Runtime 层准则

## 问题

Chat 的 Component 侧本应只看到一份窄的 chat 抽象，并只通过这份抽象操作 domain 能力。现状里简单的 component / service 切分扛不住复杂度，逻辑进了 component / `_controllers`，层与模块边界失控：View 乱窜 Service、自编 create↔send、持有不该持有的状态。

对复杂业务，解法是引入 runtime 层，而不是再堆兼容层。后端已经有一层；前端再叠一层「既是 controller + model + data 的类MVC层」解决不了边界问题。要做的是业务建模和模块边界划分。

## 目标分层

```text
Component (view = f(state) react设计哲学)
        │  只经 Router 窄门
        ▼
ChatRouter (runtime layer)
        │
        ├── SessionCoordinator   （session 池与生命周期）
        └── SessionRuntime*      （单会话状态与控制流 / 数据流）
                │
                ▼
            Services（domain layer 无状态，贴 BE 的原子能力）
```

Component 是薄视图。ChatRouter 是对话 UI 的唯一入口。Coordinator 管池。Runtime 持状态并跑流。Service 不做编排。

## 窄门

对话相关的 Component **只**通过 ChatRouter 消费能力：

- 读：当前前台会话的消息流、产品态（phase / status 投影）
- 写：意图命令（如 send、cancel、approve）

禁止：

- Component 直接调用 Service
- Component 持有或多路订阅 SessionRuntime
- 在 `_controllers` 里串联 create、send、鉴权、审批等跨层时序

列表删除、会话元数据等非「当前对话面」入口，不走 ChatRouter 的对话窄门；见 [biz.md](./biz.md)。

## 各层职责

| 层                 | 职责                                                            | 不做什么                                              |
| ------------------ | --------------------------------------------------------------- | ----------------------------------------------------- |
| Component          | 渲染投影；把用户操作变成对 Router 的意图                        | 不持业务状态；不编排多 Service；不碰 Runtime 池       |
| ChatRouter         | 暴露前台对话钩子；收口 send / cancel 等意图；切换前台时替换句柄 | 不实现 BE 原子调用；不做 LFU 淘汰策略本身             |
| SessionCoordinator | runtime 池：创建、驱逐、cleanup；与 create / delete 相关的调度  | 不跑单会话流状态机；不把对话消息投影直接摊给任意 View |
| SessionRuntime     | 单会话状态、bootstrap、控制流与数据流；内部可持 AI SDK `Chat`   | 不直接给 Component 当万能 API；不管全池               |
| Service            | 无状态、按 BE 能力切分的原子操作                                | 不持会话状态；不做跨请求编排                          |

## 状态归属与流解耦

- **状态**在 Runtime（及 Coordinator 对池的元数据）里，不在 Component。
- **控制流**（发问、取消、审批、切前台）与 **数据流**（SSE / 消息增量）在 Runtime 内协同，对外经 Router 以意图 + 投影出现。
- Service 只提供原子能力；谁在何时调用，由 Runtime / Coordinator 决定。

Runtime 与 Service 的形态必须能分清：两层不都扮演「controller + model + capability」。层堆层不是解法。

## 沿用原则

后续同类重构沿用这些约束：

1. 组件职责变薄，不持有业务状态
2. Runtime 持有状态
3. Runtime 内控制流与数据流解耦于对外契约（对外是意图与投影）
4. Service 保持无状态
5. 禁止用更多兼容层代替边界划分
6. Component 只经窄门消费，禁止乱窜

产品态、状态机、Router / Coordinator 契约的细则见 [biz.md](./biz.md)。
