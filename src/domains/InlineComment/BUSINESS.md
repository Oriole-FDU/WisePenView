# InlineComment 领域业务知识

> Canonical owner：`src/domains/InlineComment`

## 范围

本文件拥有通用锚点批注数据边界；面板操作由 [共享批注面板](../../components/business/InlineComment/BUSINESS.md) 拥有，Note 专用 session、mapper 与 Yjs 锚点整体由 [Note editor](../../components/editors/note/BUSINESS.md) 拥有。一般 Resource 评论由 [Interact](../Interact/BUSINESS.md) 拥有，不共用 thread 生命周期。

## 锚点与版本

- anchorPayload 是 opaque record，通用层不解析 Note start／end，也不保证 anchor 可定位；缺少 anchorRef 时可降级为空 payload、external ID 与引文。依据：[InlineCommentAnchor](entity/inlineComment.ts)、[mapThread](mapper/InlineCommentServices.map.ts)。
- list／create／add 的 contentVersion 仅在非 null 时送出；create 的 applicableFromVersion／applicableToVersion 同样透传，响应缺值则为 undefined。这不是后端版本范围有效性、不可变性或并发检查的证明。依据：[mapListRequest](mapper/InlineCommentServices.map.ts)、[mapCreateRequest](mapper/InlineCommentServices.map.ts)、[mapAddItemRequest](mapper/InlineCommentServices.map.ts)、[mapThread](mapper/InlineCommentServices.map.ts)。

## 必要数据与显示降级

- thread 的 inlineCommentId、resourceId、creatorId，item 的 itemId、authorId 都是必要身份，正规化后缺失即拒绝；thread／item 的建立与更新时间须为有限数字，不能为了显示降级而容忍缺主键。建立返回 ID 也会检查非空。依据：[requiredId](mapper/InlineCommentServices.map.ts)、[requiredTimestamp](mapper/InlineCommentServices.map.ts)、[mapCreatedId](mapper/InlineCommentServices.map.ts)。
- 显示信息另有降级：作者优先 nickname、再 realName，最后用 ID；缺少 avatar、reaction 用户展示或 optional 时间不等于缺少作者身份。空 emoji 会过滤，正文／图片／mentions 可使用空值。依据：[mapUserDisplay](mapper/InlineCommentServices.map.ts)、[mapAuthor](mapper/InlineCommentServices.map.ts)、[mapReactionGroups](mapper/InlineCommentServices.map.ts)、[mapItem](mapper/InlineCommentServices.map.ts)。

## 服务边界

- 通用服务提供 item 增删改、reaction 与 resolved 状态请求，不提供前端直接删除 thread 的方法。最后 item 删除后正式 thread 如何处理，不能由 mock 的行为推论；UI gate 也不代替后端授权。依据：[createInlineCommentServices](service/InlineCommentServices.impl.ts)、[InlineCommentApi](mock/InlineCommentApi.mock.ts)。
