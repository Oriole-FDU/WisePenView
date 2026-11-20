# 待对齐 / 已决

> 拍板结论以 [名词表](./00-glossary.md) 为准。本文件保留已决摘要与剩余少量开放项。

---

## 已决（2026-11-20）

| #              | 结论                                                                            |
| -------------- | ------------------------------------------------------------------------------- |
| 前台/后台      | 失焦 = 进 **background**；本阶段**不停泵**。进行中 / 待审批的会话栏展示后续另做 |
| 再 focus       | 缓存命中且一直在拉 ⇒ messages 已在增长，**不必**为补齐再 resume                 |
| Send           | 经 Router 落到 **当前 focus** 的唯一实例；无跨 Runtime 的 sessionId 覆盖问题    |
| Bootstrap 失败 | **报错 + dispose 清理干净**，不留半残实例                                       |
| 测试           | TDD 为**脚手架**；实现完成后拆掉，不进常驻 CI                                   |
| 子系统命名     | 沿用 `connect` / `history` / `message` / `approval`，不叫 Controller            |
| UI 投影        | 叫 **Runtime View**（不用 Snapshot）                                            |
| 缓存上限       | `MAX_CACHED_RUNTIMES` **3–5**（含 active）；后台可持续拉流，用个数限资源        |
| 目录/类名      | `runtimeV2/`、`ChatTurnRuntime`、`useChatRuntimeV2`                             |
| 淘汰用语       | 用 **dispose / unload**，不用 evict                                             |
| Pump           | 仍按次 arm（新开 SSE 时）；与 focus 切换无关                                    |

---

## 仍可微调（不挡开工）

| #   | 问题                                              | 当前默认                                                               |
| --- | ------------------------------------------------- | ---------------------------------------------------------------------- |
| 1   | `MAX_CACHED` 取 3 还是 5                          | 先用 **5**，常量可调                                                   |
| 2   | Lifecycle 是否保留短暂 `failed`                   | **不保留**：bootstrap 失败直接 dispose                                 |
| 3   | 超限 dispose 是否避开正在 streaming 的 background | 先 **LRU 非 active 即可**（可 dispose 正在拉流的后台）；若体验差再收紧 |
| 4   | 切流后 hook 是否改回 `useChatRuntime`             | 阶段 3 再定；现阶段用 `useChatRuntimeV2`                               |
