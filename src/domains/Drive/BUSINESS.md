# Drive 业务知识

> Canonical owner：`src/domains/Drive`

## 范围

本文件拥有 Drive 的节点、scope、分页与操作意图。标签策略由 [Tag](../Tag/BUSINESS.md)、资源位置与权限由 [Resource](../Resource/BUSINESS.md) 拥有；界面组合仍由 [TableDrive](../../components/business/Drive/TableDrive/index.tsx) 负责。

## 节点与 scope

- scope 有 personal／group，个人兼容 group ID 经 Tag 正规化后归入 personal；group scope 带 groupId 与相应 rootId。不可仅凭 folder／resource ID 反推完整 scope：root ID 带群组，folder ID 只带 tagId，resource／link ID 带 resourceId 与 parentTagId。依据：[DriveNodeScope](entity/drive.ts)、[buildDriveNodeScope](model/driveNode.ts)、[decodeNodeId](model/driveNode.ts)。
- root、folder、resource、link 是不同语义；personal root 有真实 root tag，group root 为虚拟容器。个人或主挂载位置映射为 resource，小组其他挂载位置映射为 link；loading 仅为 UI 占位，不属于 domain 持久节点。依据：[DriveNode](entity/drive.ts)、[mapResourceItemToChildNode](model/driveNode.ts)、[toDriveTableRow](../../components/business/Drive/TableDrive/tableConfig.ts)。
- Drive 使用原始标签树；个人 root 的子文件夹取 `.Shared`、`.Note`、`.Page` 与 `/` 的 children，隐藏 `.Trash` 及其他点号前缀标签，`.Shared`、`.Note` 与 `.Page` 例外保留并按该顺序优先排列。不能替换成 Tag 普通可见树。依据：[getDirectFolderTags](service/DriveServices.impl.ts)、[isVisibleFolderTag](service/DriveServices.impl.ts)、[orderDriveFolderNodes](model/driveNode.ts)、[Tag](../Tag/BUSINESS.md)。
- `.Trash`／`.Shared`／`.Note`／`.Page` 在 model 映射为 systemType，修改、拖放与新建入口依 systemType 拒绝，而不是每个 view 自行按翻译名称判定。`.Note` 与 `.Page` 分别用于承载默认创建笔记和 AI HTML 页面。依据：[resolveSystemFolderType](model/driveNode.ts)、[assertNoSystemFolder](service/DriveServices.impl.ts)、[renameNode](service/DriveServices.impl.ts)。

## 操作与分页

- 批次操作先去重并移除已选文件夹的后代，同一操作必须同 scope；移动不可指向自己或后代，小组同一资源多挂载的移动会拒绝。这些前端限制不代替 Resource／Tag 的后端授权。依据：[normalizeActionNodes](service/DriveServices.impl.ts)、[assertActionScope](service/DriveServices.impl.ts)、[assertValidMoveTarget](service/DriveServices.impl.ts)、[assertSingleMountPerResource](service/DriveServices.impl.ts)。
- 个人回收站、小组移除与回收站永久删除是不同命令，依 scope 与选取位置调用 Resource／Tag；同一资源的小组卸载可能分轮送出。请求不构成跨资源／标签事务。依据：[moveNodesToTrash](service/DriveServices.impl.ts)、[removeNodesFromGroup](service/DriveServices.impl.ts)、[deleteTrashedNodes](service/DriveServices.impl.ts)、[Resource](../Resource/BUSINESS.md)。
- service 操作不更新界面数据；TableDrive 在成功回调刷新相关清单，其他 consumer 也需处理刷新，而不是把成功结果当完整新树。依据：[createDriveServices](service/DriveServices.impl.ts)、[useTableDriveActionsController](../../components/business/Drive/TableDrive/controllers/useTableDriveActionsController.tsx)。
- cursor 编码 parentId、page 与 pageSize；目前验证可解析结构、整数字段及 parentId 相同，不绑定资源筛选条件，也不承诺验证所有页码范围。文件夹只在无 cursor 时加载，小组虚拟 root 不直接载资源。依据：[decodeResourceCursor](service/DriveServices.impl.ts)、[loadNodeChildren](service/DriveServices.impl.ts)。
