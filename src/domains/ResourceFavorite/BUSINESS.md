# ResourceFavorite 领域业务知识

> Canonical owner：`src/domains/ResourceFavorite`

## 范围

本文件拥有收藏归属、收藏集合与收藏条目数据边界。收藏按钮和 picker 流程由 [共享收藏流程](../../components/business/Resource/BUSINESS.md) 拥有，收藏集合页流程由 [收藏集合页](../../views/app/drive/_components/FavoritesTab/BUSINESS.md) 拥有。

## 收藏归属

- 更新收藏提交完整 `collectionIds`，不是单集合增量命令。正规化后非空即 `favorite: true`；空集合即 `favorite: false` 且不提交 collectionIds。移除单一集合前必须保留其他归属。依据：[mapUpdateFavoriteCollectionsRequest](mapper/ResourceFavoriteServices.map.ts)、[updateFavoriteCollections](service/ResourceFavoriteServices.impl.ts)。
- 从目前集合移除需要先读取完整归属，再写回剩余集合。这是两个请求，前端没有跨请求原子性保证。依据：[UnfavoriteResourceModal](../../views/app/drive/_components/FavoritesTab/components/UnfavoriteResourceModal.tsx)。

## 条目与集合

- 收藏条目与 Resource 可访问性是不同生命周期：`accessible: false` 时不提供 resourceInfo，但仍保留条目 ID 与收藏时间；`resourceInfo: null` 不证明资源已删除或权限可以恢复。依据：[mapFavoriteItemFromApi](mapper/ResourceFavoriteServices.map.ts)、[FavoriteItem](entity/favorite.ts)。
- 默认集合只按 `isDefault` 识别。当前 API Contract 将集合名称声明为非空字符串，不应再以空名称推断默认集合；entity 的旧可空类型只用于兼容既有 UI，不构成新的 wire 契约。依据：[FavoriteApi schema](apis/FavoriteApi.schema.ts)、[mapFavoriteCollectionFromApi](mapper/ResourceFavoriteServices.map.ts)。
- 收藏条目内嵌的 Resource 摘要、权限和可访问性规则沿用 [Resource](../Resource/BUSINESS.md)，不在收藏域另订。依据：[mapFavoriteItemFromApi](mapper/ResourceFavoriteServices.map.ts)。

## 证据限制

mock 可模拟集合计数和条目变更，不证明正式后端更新原子性、删除策略或权限恢复行为。依据：[FavoriteApi mock](mock/FavoriteApi.mock.ts)。
