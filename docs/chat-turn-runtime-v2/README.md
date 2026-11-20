# ChatTurn Runtime V2 改造计划

> 状态：**已落地**（实现目录为 `src/domains/ChatTurn/runtime/`；本 docs 目录名保留改造过程）
> 协议权威：[respond / recover 时序](../chat-turn-respond-sequence.md)
> 业务边界：[ChatTurn BUSINESS](../../src/domains/ChatTurn/BUSINESS.md)

## 一句话

单 session → 可多实例的 **Runtime**；标签页内 **Router** 缓存多个 Instance（后台**持续拉流**），只 focus 一个给 UI。Session 切换只改 active 指针，不是 Runtime 内部 teardown。

## 三阶段

| 阶段                                          | 核心                        | 测试              | 交付                   |
| --------------------------------------------- | --------------------------- | ----------------- | ---------------------- |
| [1. 单 Runtime](./01-phase-single-runtime.md) | 单 session 生命周期         | 脚手架，完成后拆  | 代码 + 架构图 + 状态机 |
| [2. Router](./02-phase-router.md)             | 多实例 focus / 上限 dispose | 假 Runtime 脚手架 | Router                 |
| [3. 整合](./03-phase-integration.md)          | 组件消费                    | 运行态为主        | Hook + 切流            |

## 阅读顺序

1. [名词表](./00-glossary.md)
2. [已决](./99-open-questions.md)
3. 阶段 1 → 2 → 3

## 关键已决（摘录）

- 后台不停泵；用 `MAX_CACHED_RUNTIMES`（默认 5）限制 Instance 数
- 淘汰用语：dispose / unload
- UI 投影：Runtime View
- 子系统：connect / history / message / approval
- Pump 仍按次 arm（新开 SSE），与 focus 无关
