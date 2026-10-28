# 共享批注面板业务知识

> Canonical owner：`src/components/business/InlineComment`

## 范围

本文件拥有共享面板的选取、历史、删除入口与提交流程；数据规则由 [InlineComment domain](../../../domains/InlineComment/BUSINESS.md) 拥有。Note 专用的锚点、刷新与重试去重只由 [Note editor](../../editors/note/BUSINESS.md) 拥有。

## 选取与历史

- 未解决 thread 被选为 active 后，才显示回复 composer、resolve、新 emoji 与各 item 的删除入口；删除另要求目前用户是该 item 作者或 Resource owner。这只是操作可见性，不是后端授权。依据：[CommentThread](index.tsx)、[CommentItem](index.tsx)。
- 已有 reaction chip 的按钮未使用 active gate，未选取的未解决 thread 仍可经该入口调用 reaction；不能把 active 描述成所有 reaction 的强制前置条件。依据：[CommentItem](index.tsx)。
- resolved 历史没有回复 composer、新 emoji 或逐 item 删除入口；既有 reaction 仍展示，但回调是 no-op，不提交 reaction 变更。reopen 成功后关闭历史；历史删除入口只选最后一个 item，并以该作者或 Resource owner 判断显示，不是直接删整个 thread。依据：[ResolvedCommentThread](index.tsx)、[InlineComment](index.tsx)。
- 删除需确认，成功才清除 pendingDeletion 并提示；面板把 threadId／itemId 传给 consumer，不自行推论最后 item 的正式后端生命周期。依据：[InlineComment](index.tsx)、[InlineCommentDeletePayload](index.type.ts)。

## 图片与重试

- 文字 trim 后为空且有图片时，用 U+200B 作正文；图片先全部上传成功才调用 consumer。imageUpload 可禁用或指定场景，默认为公开用户图片。场景、地址及私有读取限制由 [Image](../../../domains/Image/BUSINESS.md) 拥有。依据：[CommentComposer](CommentComposer.tsx)、[InlineCommentProps](index.type.ts)。
- 上传或 consumer 提交失败会保留内容、待上传图片及同一 idempotencyKey；整次成功才清空并换 key。这个 key 是 consumer 的重试线索，不是通用后端幂等契约。重试仍会重新上传图片，没有跨图片／评论的事务或上传补偿保证。依据：[CommentComposer](CommentComposer.tsx)、[InlineCommentSubmitPayload](index.type.ts)。
