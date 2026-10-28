# Message 领域业务知识

## 范围

Message domain 拥有登录用户的通知消息分页与已读 API 映射；通知清单及互动流程由 [notifications workflow](../../views/app/notifications/BUSINESS.md) 拥有。此 domain 不代表 Chat 对话消息或历史。

## 规则

- 用户消息由 Message API 分页取得，domain 映射 ID、收件范围、类型、标题、内容、跳转 URL、额外数据、建立时间与已读状态。`read` 以 `Boolean(readTime)` 计算，非空字符串会成为已读，不验证时间字符串是否有效。依据：[MessageApi.type](apis/MessageApi.type.ts) 的 `UserMessageApiModel`、[MessageServicesMap](mapper/MessageServices.map.ts) 的 `mapUserMessageApiModelToEntity`。
- 已读操作按消息 ID 清单提交；domain 不负责推导未加载页面或全账号的消息状态。依据：[MessageServices](service/MessageServices.impl.ts) 的 `readMessages`、[MessageServicesMap](mapper/MessageServices.map.ts) 的 `mapReadMessagesRequest`。
- Message `UserMessage` 与 Chat 的 `WisePenUIMessage` 是不同 entity、不同 API／service；通知消息不应被当作会话中的 Chat turn。依据：[Message entity](entity/message.ts)、[Chat message entity](../Chat/entity/message.ts)、[Chat history API mapping](../Chat/mapper/ChatServices.map.ts) 的 `mapMessageFromApi`。
