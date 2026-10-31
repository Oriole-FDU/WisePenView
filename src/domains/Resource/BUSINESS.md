# Resource 业务知识

> Canonical owner：`src/domains/Resource`

## 范围

本文档维护资源位置、列表筛选和资源摘要规则。通用资源动作、动作依赖与访问范围以 [AccessPolicy](../_shared/access/BUSINESS.md) 为唯一 owner；权限概览与授权命令归 [ResourceAccess](../ResourceAccess/BUSINESS.md)；Drive 节点语义见 [Drive](../Drive/BUSINESS.md)，标签树与标签策略见 [Tag](../Tag/BUSINESS.md)，具体文档处理见 [Document](../Document/BUSINESS.md)。

## 资源与位置

- 一个资源可以有多个 `tagBinds`。指定小组时，`currentTags` 与 `mainTagId` 优先取该小组的绑定；个人视角优先取 `p_` 开头的绑定，找不到匹配绑定时保留首个绑定。`primaryTagId` 优先于 tags 的首个 key，不能由展示层重新猜测当前位置。依据：[mapResourceItemFromApi](mapper/resource.mapper.ts)。
- 列表 mapper 省略空字符串 `resourceType` 与空数组 `tagIds`，不把空值当成筛选参数；标签查询逻辑默认 OR。`includeMyInteraction: false` 是有效输入，不能因布林值为 false 而省略。小组查询由 service 注入 `groupId`。依据：[mapListResourceItemsRequest](mapper/resource.mapper.ts)、[ResourceServices](service/ResourceServices.impl.ts)。
- 资源列表、搜索、重命名、删除及底层权限写请求由 checked Contract 校验。响应中的 `resourceType`、权限动作、排序参数使用精确 wire 枚举，`size` 必须是 Long 字符串，搜索 `updateTime` 必须是毫秒时间戳；`size` 转数字和搜索类型归一化只发生在 mapper。依据：[ResourceCore Schema](apis/ResourceCoreApi.schema.ts)、[ResourceCore Contract](apis/ResourceCoreApi.contract.ts)。
- 当前后端 `ResourceItemResponse` 不包含 `resourceAccessRole`、`path` 等历史字段；前端 Resource 实体与列表 mapper 已移除这些字段，不根据列表项推导访问角色。依据：[ResourceCoreApi.schema.ts](apis/ResourceCoreApi.schema.ts)、[resource.mapper.ts](mapper/resource.mapper.ts)。
- 个人路径标签、普通标签与小组挂载是不同操作：`setPersonalResourcesPathTag` 设置个人位置，`replacePersonalNormalTags` 替换普通标签，`mountResourcesToGroup` 建立小组挂载。小组移动／卸载必须保留 `resourceSourceTagMap` 的来源位置；不能用个人移动接口代替。依据：[位置请求契约](service/index.type.ts)、[ResourcePlacementApi](apis/ResourcePlacementApi.ts)。
- `movePersonalResourcesToTrash`、`unmountResourcesToGroup` 与 `removeResources` 分别对应个人回收站、小组卸载和资源删除接口，调用方必须根据意图选择，不能把所有删除按钮都映射为删除资源。依据：[ResourceServices](service/ResourceServices.impl.ts)。
- 重命名只在后端请求成功后更新资源名称缓存。缓存属于 session，不充当永久资源数据；会话清理时必须重置。依据：[renameResource](service/ResourceServices.impl.ts)、[resourceDisplayNameCache](session/resourceDisplayNameCache.ts)。

## 特殊判断与禁止事项

- ResourceCore 不拥有权限概览，也不认识任一资源叶域；跨域权限编排只能位于 [ResourceAccess](../ResourceAccess/BUSINESS.md)。
- 前端权限归一化用于展示与配置，不能代替后端操作接口的权限校验；API、service 与 mapper 的契约不可由 view 中的 fallback 改写。

## 历史决策

| 决策                           | 原因                                                          | 来源                                                                  |
| ------------------------------ | ------------------------------------------------------------- | --------------------------------------------------------------------- |
| 资源名称同步归入 session cache | 避免资源 service 依赖 React store，并在会话结束时清理名称缓存 | [2132b219](https://github.com/Oriole-FDU/WisePenView/commit/2132b219) |
