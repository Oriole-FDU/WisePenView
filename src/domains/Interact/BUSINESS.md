# Interact 领域业务知识

> Canonical owner：`src/domains/Interact`

## 范围

本文件拥有收藏归属、收藏条目与一般评论的共用语义；私有互动分别由 [收藏集合页](../../views/app/drive/_components/FavoritesTab/BUSINESS.md)、[共享收藏流程](../../components/business/Resource/BUSINESS.md) 与 [一般评论面板](../../layouts/Resource/ResourceLayout/ResourceSidePanel/ResourceCommentPanel/BUSINESS.md) 拥有。

锚点批注的资料与 resolved 状态由 [InlineComment](../InlineComment/BUSINESS.md) 拥有。

## 收藏与可存取性

- 更新收藏送的是完整 `collectionIds`，不是增量新增／移除。正规化后非空即 `favorite: true`，空集合即 `favorite: false` 且不送 collectionIds；移除单一集合前必须保留其他归属。依据：[mapUpdateFavoriteCollectionsRequest](mapper/InteractServices.map.ts)、[updateFavoriteCollections](service/InteractServices.impl.ts)、[UnfavoriteResourceModal](../../views/app/drive/_components/FavoritesTab/components/UnfavoriteResourceModal.tsx)。
- 收藏条目与 Resource 可存取性是不同生命周期：`accessible: false` 时不提供 resourceInfo，但仍保留条目 ID 与收藏时间；未提供 accessible 时以可映射的资源资料判断。`resourceInfo: null` 不证明资源已删除或权限可以恢复。依据：[mapFavoriteItemFromApi](mapper/InteractServices.map.ts)、[FavoriteItem](entity/favorite.ts)。
- 集合名称可为 null；预设集合的识别使用 `isDefault`，不以空名称自行推导可否修改。共用资源资料与权限沿用 [Resource](../Resource/BUSINESS.md)，不在 Interact 另订。依据：[mapFavoriteCollectionFromApi](mapper/InteractServices.map.ts)。

## 点赞、一般评论与跨域边界

- Resource 点赞送明确的目标 liked；评论点赞不送目标状态，而以 API 回传 boolean 更新，不可用相同的本地反转策略混用。依据：[setResourceLike](service/InteractServices.impl.ts)、[toggleCommentLike](service/InteractServices.impl.ts)。
- 一般评论依 resource 取得根评论，依 rootCommentId 取得回复；新增回复的 replyTo 是被回复项目 ID。此模型没有锚点或 resolved thread 语义，不能代替 InlineComment。deleted、正文及显示资料由 mapper 保留／降级，删除方式不能仅由栏位推论。依据：[ListRepliesRequest](service/index.type.ts)、[CreateReplyRequest](service/index.type.ts)、[mapCommentFromApi](mapper/InteractServices.map.ts)。
- `recordResourceRead` 只送 read 请求；课程如何使用已读纪录计算学习进度由 [Course](../Course/BUSINESS.md) 拥有。评分方法与型别存在不代表有额外的前端评分政策或已接线的流程。依据：[recordResourceRead](service/InteractServices.impl.ts)、[rateResource](service/InteractServices.impl.ts)。

## 证据限制

上述是前端服务与 mapper 边界，不证明后端集合更新的原子性、存取权限或删除策略。mock 可作离线实作对照，不能当成正式收藏／评论的验收。依据：[FavoriteApi](mock/FavoriteApi.mock.ts)、[CommentApi](mock/CommentApi.mock.ts)。
