# ResourceComment 领域业务知识

> Canonical owner：`src/domains/ResourceComment`

## 范围

本文件拥有一般 Resource 根评论、回复与评论点赞的数据语义。面板的排序、展开、删除确认与 composer 流程由 [资源互动面板](../../components/business/Resource/ResourceInteractionPanel/BUSINESS.md) 拥有；锚点批注与 resolved thread 由 [InlineComment](../InlineComment/BUSINESS.md) 拥有。

## 评论模型

- 根评论按 Resource ID 查询，回复按 `rootCommentId` 分页；新增回复的 `replyTo` 是一次点击所回复的具体项目 ID，可以是根评论或另一条回复。依据：[ResourceCommentServices](service/ResourceCommentServices.impl.ts)、[ResourceCommentApi](apis/CommentApi.contract.ts)。
- 评论类型区分根评论、回复评论与回复中的回复；此模型没有锚点或 resolved thread 语义，不能替代 InlineComment。依据：[CommentApi schema](apis/CommentApi.schema.ts)。
- 当前 Contract 将正文、图片、计数、删除状态与评论类型都声明为必填。mapper 只为作者展示生成姓名和头像降级，不替缺失协议字段制造默认值。依据：[ResourceCommentServicesMap](mapper/ResourceCommentServices.map.ts)。

## 点赞语义

- 评论点赞不提交目标状态，以 API 返回的 boolean 作为切换结果；不能复用资源点赞的请求或本地取反策略。依据：[ResourceCommentServices](service/ResourceCommentServices.impl.ts)、[ToggleCommentLikeApiContract](apis/CommentApi.contract.ts)。

## 证据限制

mock 同时维护评论内容与点赞集合，供多个互动 API 读取；这只用于离线联调，不证明正式后端的数据一致性、软删除或授权策略。依据：[CommentApi mock](mock/CommentApi.mock.ts)、[共享点赞状态 mock](../_shared/mock/commentLikeState.mock.ts)。
