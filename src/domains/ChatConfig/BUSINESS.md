# ChatConfig 领域业务知识

> Canonical owner：`src/domains/ChatConfig`

## 范围

本文件拥有 Chat 模型、Provider、Tool、Agent／Skill 输入能力与模型选择和计费展示语义。会话、历史消息和附件由 [Chat](../Chat/BUSINESS.md) 拥有；输入区与设置页的用户流程分别由 [Chat workflow](../../components/business/Chat/BUSINESS.md) 与对应 profile view 拥有。

## 模型与 Provider

- 模型选项来自启用中的 system／user 模型，并依启用的 provider mapping 展开；没有启用 mapping 时仍建立未指定 provider ID 的 fallback 选项，不代表该 provider 已可用。同一模型的不同 mapping 可形成不同选项，选项 `id` 可含 provider ID，发送请求则使用后端 `modelId`。依据：[ChatConfigServicesMap](mapper/ChatConfigServices.map.ts) 的 `getOrderedProviderOptions`、`createFallbackProviderOption`、`buildSelectionId`、`mapGetModelsFromApi`。
- 默认优先选第一个 system 免费选项，其 provider mapping 的输入、缓存输入及输出计费比例必须全为字符串 `'0'`；否则沿用第一个启用选项。依据：[ChatConfigServicesMap](mapper/ChatConfigServices.map.ts) 的 `isFreeModel`、`mapGetModelsFromApi`。
- Provider usage 使用后端 canonical 的 input、cached input、output 与 billable 字段；不能在 mapper 中重新解释成另一套计量对象。依据：[mapProviderFromApi](mapper/ChatConfigServices.map.ts)、[ChatModelApi schema](apis/ChatModelApi.schema.ts)。

## Agent、Skill 与 Tool

- Chat 可列出个人及群组资源中的 Agent／Skill；群组范围需有 `groupId`，否则返回空页。Agent 选项由 Resource item 映射，不代表 Agent API 或后端授权已通过。依据：[ChatConfigServices](service/ChatConfigServices.impl.ts) 的 `listChatInputAgents`、`listChatInputSkills`、[agent mapper](mapper/agent.mapper.ts)。
- 一般输入能力选项依所选 Agent 的群组来源决定 Skill 搜索范围；Tool picker 仅以已设置且名称符合 `_search` 结尾的 Tool 作为 Web Search 选项。这是前端当前分类方式，不是后端完整 Tool 分类或可用权限的证明。依据：[ChatConfigServices](service/ChatConfigServices.impl.ts) 的 `getChatInputCapabilityOptions`、[capability picker mapper](mapper/capabilityPicker.mapper.ts)。

## 证据限制

模型计费、Provider 凭证保管、Tool secret、Agent／Skill／Tool 的服务器端访问控制与正式业务语义，必须以后端契约为准；选项可见、配置更新成功或请求字段存在都不构成授权、计费或持久化承诺。
