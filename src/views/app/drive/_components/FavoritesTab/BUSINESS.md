# 收藏集合页业务知识

> Canonical owner：`src/views/app/drive/_components/FavoritesTab`

## 范围

本文件拥有收藏页的集合选择、集合管理与资源列操作；完整收藏归属及不可访问条目的数据语义由 [ResourceFavorite](../../../../../domains/ResourceFavorite/BUSINESS.md) 拥有，picker 由 [共享收藏流程](../../../../../components/business/Resource/BUSINESS.md) 拥有。

## 集合管理

- 未选取集合或选取项已不存在时，优先选 isDefault 集合，否则用第一个集合；没有集合时显示空状态，不自行建立默认集合。依据：[resolveDefaultCollection](index.tsx)、[FavoritesTab](index.tsx)。
- 默认集合在清单中不显示编辑／删除菜单，这只是 UI 限制，不证明 service 或后端禁止该操作。其他集合可新建／修改，名称须 trim 后非空，空说明送 null；成功后刷新集合。依据：[FavoriteCollectionList](components/FavoriteCollectionList.tsx)、[EditCollectionModal](EditCollectionModal/index.tsx)。
- 删除集合的「移至默认集合」选项初始为 false，将用户选择送为 keepResourcesToDefault；不应描述成删除时一律保留收藏或删除 Resource。只有请求成功才关闭并刷新。依据：[DeleteCollectionModal](DeleteCollectionModal/index.tsx)。

## 资源列与移除

- resourceInfo 缺失时不开启资源，也不进入收藏管理 picker，但仍可移除目前集合的收藏；不要以不可开启推论后端资源已删除。依据：[useFavoriteResourceTableController](hooks/useFavoriteResourceTableController.ts)。
- 从目前集合移除时先读取完整归属，再交由 ResourceFavorite 更新剩余集合；成功后刷新资源列及集合计数。这是两个请求，不承诺与其他同时修改原子合并。依据：[UnfavoriteResourceModal](components/UnfavoriteResourceModal.tsx)、[useFavoriteResourceTableController](hooks/useFavoriteResourceTableController.ts)、[完整归属规则](../../../../../domains/ResourceFavorite/BUSINESS.md)。
