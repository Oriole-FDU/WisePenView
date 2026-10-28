# 共用 Resource 收藏流程业务知识

> Canonical owner：`src/components/business/Resource`

## 范围

本文件只拥有跨页共用的收藏按钮与集合 picker；不另订 Resource 权限规则。共享数据由 [Interact](../../../domains/Interact/BUSINESS.md) 与 [Resource domain](../../../domains/Resource/BUSINESS.md) 拥有，集合页私有流程由 [收藏集合页](../../../views/app/drive/_components/FavoritesTab/BUSINESS.md) 拥有。

## 按钮与确认流程

- 收藏状态加载中、取消请求中或尚未取得状态时停用按钮。按下时只有一个集合会直接取消全部收藏；零个或多个集合才开 picker，不是有收藏就一律直接取消。依据：[ResourceFavoriteAction](ResourceFavoriteAction/index.tsx)。
- picker 同时取得集合清单与既有归属；切换只改本地 selectedIds，确认才提交完整归属。成功后读回目前归属、通知调用端并关闭；更新成功但读回失败仍属未完成流程，不可宣称回滚了前一次写入。依据：[useFavoriteCollectionPickerController](FavoriteCollectionPicker/useFavoriteCollectionPickerController.ts)、[完整归属规则](../../../domains/Interact/BUSINESS.md)。
- 新建集合名称须 trim 后非空；建立成功先把集合加入本地选取并刷新清单，尚未替资源更新收藏。之后取消 picker 不会回滚已建立的集合。依据：[useFavoriteCollectionPickerController](FavoriteCollectionPicker/useFavoriteCollectionPickerController.ts)。
- 确认或新建集合期间不接受关闭；直接取消收藏成功后也会读回归属。调用端后续刷新失败会显示错误，不等于收藏写入失败或可撤销。依据：[useFavoriteCollectionPickerController](FavoriteCollectionPicker/useFavoriteCollectionPickerController.ts)、[ResourceFavoriteAction](ResourceFavoriteAction/index.tsx)。
