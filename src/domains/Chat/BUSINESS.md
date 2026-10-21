# Chat 领域业务知识

## 范围

本文件拥有 Chat domain 的会话资料、模型／Provider／Tool 服务契约、资源选项与附件上传规则。Chat 输入、传送、历史载入与工具审批的使用者流程由 [Chat workflow](../../components/business/Chat/BUSINESS.md) 拥有；目前会话 ID 的路由来源由 [routing 规范](../../../agent/docs/routing.md) 说明。

## 规则

- 会话 API 目前只将 ID、使用者 ID、标题、建立／更新时间及 Agent ID／版本映射为 `ChatSession`。domain 的 session cache 只快取伺服器会话中继资料；目前选取 ID 不持久化，也不由 cache 驱动导航。依据：[ChatApi session DTO](apis/ChatApi.type.ts) 的 `ChatSession`、[ChatServicesMap](mapper/ChatServices.map.ts) 的 `mapSessionFromApi`、[session cache](session/sessionCache.ts) 的 `chatSessionCache`。
- 模型选项来自启用中的 system／user 模型，并依启用的 provider mapping 展开；没有启用 mapping 时仍建立未指定 provider ID 的 fallback 选项，不代表该 provider 已可用。同一模型的不同 mapping 可形成不同选项，选项 `id` 可含 provider ID，送出 request 则使用后端 `modelId`。预设优先选第一个 system 免费选项，其 provider mapping 的输入、快取输入及输出计费比例必须全为字串 `'0'`；否则沿用第一个启用选项。依据：[ChatServicesMap](mapper/ChatServices.map.ts) 的 `getOrderedProviderOptions`、`createFallbackProviderOption`、`buildSelectionId`、`isFreeModel`、`mapGetModelsFromApi`。
- Chat 可列出个人及群组资源中的 Agent／Skill；群组范围需有 `groupId`，否则回传空页。Agent 选项由 Resource item 映射，不代表 Agent API／后端授权已通过。依据：[ChatServices](service/ChatServices.impl.ts) 的 `listChatInputAgents`、`listChatInputSkills`、[agent mapper](mapper/agent.mapper.ts) 的 `buildAgentFromResourceItem`。
- 一般输入能力选项依所选 Agent 的群组来源决定 Skill 搜寻范围；Tool picker 仅以已设定且名称符合 `_search` 结尾的 Tool 作为 Web Search 选项。这是前端当前分类方式，不是后端完整 Tool 分类或可用权限的证明。依据：[ChatServices](service/ChatServices.impl.ts) 的 `getChatInputCapabilityOptions`、[capability picker mapper](mapper/capabilityPicker.mapper.ts) 的 `selectChatInputWebSearchTools`。
- 临时附件上传先计算档案 MD5 并向 Chat API 取得上传初始化结果，再依回传资讯直传 OSS；`saveToLibrary` 只映射为初始化请求的 `enable_library`。前端不能据此保证后端保存、保留期限或档案处理结果。依据：[ChatServices](service/ChatServices.impl.ts) 的 `uploadAttachment`、[ChatApi.type](apis/ChatApi.type.ts) 的 `InitTemporaryAttachmentUploadApiResponse`。
- 会话历史由 Chat Session API 分页取得并映射为 UI message；mapper 略过没有字串 ID 或 role 不属于 system／user／assistant 的讯息，将非阵列 parts 视为空集合，并略过无法映射的 part。这不构成完整回应的执行期契约验证，也不从开放型 metadata 与 tool payload 推导固定业务结构。依据：[ChatServices](service/ChatServices.impl.ts) 的 `listHistoryMessages`、[ChatServicesMap](mapper/ChatServices.map.ts) 的 `mapMessageFromApi`、`mapMessagePartFromApi`、`mapListHistoryMessagesFromApi`。

## 尚未由前端证明的事项

- 模型计费、Provider 凭证保管、附件授权／保存期限、Agent／Skill／Tool 的伺服器端存取控制与正式业务语义，必须以后端契约为准；本文件不将选项可见或请求栏位视为授权、计费或持久化承诺。
