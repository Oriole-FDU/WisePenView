# Resource 互动面板业务知识

> Canonical owner：`src/components/business/Resource/ResourceInteractionPanel`

## 范围

本文件拥有资源点赞、收藏、阅读统计与一般根评论、回复、评论点赞、删除显示及 composer。资料语义由 [Interact](../../../../domains/Interact/BUSINESS.md) 拥有；收藏只使用 [共享收藏流程](../BUSINESS.md)，不与锚点批注混用。

锚点批注的互动另见 [共享批注面板](../../InlineComment/BUSINESS.md)。

## 呈现与动作

- 根评论可按时间或赞数排序，切换资源／排序会清空旧清单；回复展开时才载入，以根评论 ID 分页，回复任一项时送该项 commentId 为 replyTo。提交回复后展开并刷新回复与根清单。依据：[ResourceInteractionPanel](index.tsx)、[ResourceCommentThread](ResourceCommentThread.tsx)。
- deleted 项目显示 tombstone，隐藏正文、图片、回复、点赞与删除操作；不自行删除整条 thread，既有回复仍可透过根项的回复数入口展开。不能推论后端是硬删除还是软删除。依据：[ResourceCommentItem](ResourceCommentItem.tsx)、[ResourceCommentThread](ResourceCommentThread.tsx)。
- 未删除项目的删除入口只对作者或 Resource owner 显示；确认后呼叫删除 API，按需刷新回复，再刷新根清单与资源资讯。这是前端 gate，不是后端授权证据。依据：[ResourceCommentItem](ResourceCommentItem.tsx)、[ResourceInteractionPanel](index.tsx)。
- Resource 赞数先做本地乐观显示，失败清除乐观值，成功通知资源刷新并重读互动；评论则依回传 liked 更新 ID 集合与计数，同项 pending 时不重送。两者的请求语义只由 Interact 定义。依据：[ResourceInteractionPanel](index.tsx)、[ResourceCommentThread](ResourceCommentThread.tsx)、[点赞规则](../../../../domains/Interact/BUSINESS.md)。

## 图片提交与限制

- 一般评论 composer 使用公开图片场景；全部待上传图片失败时不提交评论，部分成功时可用成功图片提交。提交 callback 完成后清空文字，将失败图片留在本地状态；此保留只适用于仍挂载的 composer。纯图片使用 U+200B 作正文，与共享批注面板的全数图片成功才提交策略不同。依据：[CommentComposer](CommentComposer.tsx)。
- 上传或向 composer 传递的提交错误会保留仍挂载的输入。根评论等待建立与根清单刷新；资源资讯的非同步刷新由 `notifyResourceChanged` 自行捕捉错误，不会因此让 composer 保留已成功提交的内容。依据：[CommentComposer](CommentComposer.tsx)、[ResourceInteractionPanel](index.tsx) 的 `refreshComments`、`notifyResourceChanged`。
- 回复 API 成功后立即清除 replyTarget、卸载 composer，再刷新回复与根清单；因此部分上传失败的图片及后续刷新失败都不保证恢复输入。图片上传、评论建立与刷新不是交易，也没有跨重试的评论幂等保证。依据：[ResourceCommentThread](ResourceCommentThread.tsx) 的 `handleReplySubmit`。
- 图片场景、连结与私有图片读取规则由 [Image](../../../../domains/Image/BUSINESS.md) 拥有，不从 `<img>` 或 URL 存在推论可读性。
