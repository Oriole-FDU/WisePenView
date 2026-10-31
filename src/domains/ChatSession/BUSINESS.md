# ChatSession 领域业务知识

## 范围

本文件拥有 Chat 会话数据、历史消息投影与附件上传规则；模型、Provider、Tool、Agent／Skill 选项由 [ChatConfig](../ChatConfig/BUSINESS.md) 拥有。Chat 输入、传送、历史加载与工具审批的用户流程由 [Chat workflow](../../components/business/Chat/BUSINESS.md) 拥有；目前会话 ID 的路由来源由 [routing 规范](../../../agent/docs/routing.md) 说明。

## 规则

- 会话 API 将 ID、用户 ID、标题、建立／更新时间及 Agent ID／版本映射为 `ChatSession`。创建或切换 Agent 时请求只发送 `agent_id`，版本完全由后端按 Agent 主档决定；domain 的 session cache 只缓存服务器会话中继数据。依据：[Session Schema](apis/ChatSessionApi.schema.ts)、[ChatSessionServicesMap](mapper/ChatSessionServices.map.ts) 的 `mapSessionFromApi`、[session cache](session/sessionCache.ts) 的 `chatSessionCache`。
- 临时附件上传先计算文件 MD5 并向 ChatSession API 取得上传初始化结果，再依返回信息直传 OSS；`saveToLibrary` 只映射为初始化请求的 `enable_library`。前端不能据此保证后端保存、保留期限或文件处理结果。依据：[ChatSessionServices](service/ChatSessionServices.impl.ts) 的 `uploadAttachment`、[Session Schema](apis/ChatSessionApi.schema.ts) 的 `InitTemporaryAttachmentUploadApiResponse`。
- 会话历史由 ChatSession API 分页取得并映射为 UI message；mapper 略过没有字符串 ID 或 role 不属于 system／user／assistant 的消息，将非数组 parts 视为空集合，并略过无法映射的 part。这不构成完整响应的执行期契约验证，也不从开放型 metadata 与 tool payload 推导固定业务结构。依据：[ChatSessionServices](service/ChatSessionServices.impl.ts) 的 `listHistoryMessages`、[ChatSessionServicesMap](mapper/ChatSessionServices.map.ts) 的 `mapMessageFromApi`、`mapMessagePartFromApi`、`mapListHistoryMessagesFromApi`。

## 尚未由前端证明的事项

- 附件授权、保留期限、保存结果与历史 metadata 的长期持久化必须以后端契约为准；本文件不将上传初始化成功视为文件已保存。
