# Resource 业务知识

> Canonical owner：`src/domains/Resource`

## 范围

本文档维护资源位置、列表筛选和资源权限的跨页面规则。Drive 节点语义见 [Drive](../Drive/BUSINESS.md)，标签树与标签策略见 [Tag](../Tag/BUSINESS.md)，具体文档处理见 [Document](../Document/BUSINESS.md)。

## 资源与位置

- 一个资源可以有多个 `tagBinds`。指定小组时，`currentTags` 与 `mainTagId` 优先取该小组的绑定；个人视角优先取 `p_` 开头的绑定，找不到匹配绑定时保留首个绑定。`primaryTagId` 优先于 tags 的首个 key，不能由展示层重新猜测当前位置。依据：[mapResourceItemFromApi](mapper/resource.mapper.ts)。
- 列表 mapper 省略空字符串 `resourceType` 与空数组 `tagIds`，不把空值当成筛选参数；标签查询逻辑默认 OR。`includeMyInteraction: false` 是有效输入，不能因布林值为 false 而省略。小组查询由 service 注入 `groupId`。依据：[mapListResourceItemsRequest](mapper/resource.mapper.ts)、[ResourceServices](service/ResourceServices.impl.ts)。
- 个人路径标签、普通标签与小组挂载是不同操作：`setPersonalResourcesPathTag` 设置个人位置，`replacePersonalNormalTags` 替换普通标签，`mountResourcesToGroup` 建立小组挂载。小组移动／卸载必须保留 `resourceSourceTagMap` 的来源位置；不能用个人移动接口代替。依据：[位置请求契约](service/index.type.ts)、[ResourcePlacementApi](apis/ResourcePlacementApi.ts)。
- `movePersonalResourcesToTrash`、`unmountResourcesToGroup` 与 `removeResources` 分别对应个人回收站、小组卸载和资源删除接口，调用方必须根据意图选择，不能把所有删除按钮都映射为删除资源。依据：[ResourceServices](service/ResourceServices.impl.ts)。
- 重命名只在后端请求成功后更新资源名称缓存。缓存属于 session，不充当永久资源数据；会话清理时必须重置。依据：[renameResource](service/ResourceServices.impl.ts)、[resourceDisplayNameCache](session/resourceDisplayNameCache.ts)。

## 权限主体与继承

- 权限主体分为 owner、标签继承（`tag`）、资源覆盖（`resourceOverride`）和指定用户（`specifiedUser`）。owner 在配置面板只读；`p_` 个人群组不显示为可配置的小组主体。依据：[mapResourcePermissionOverviewFromApi](mapper/resourcePermission.mapper.ts)。
- 权限动作存在隐含关系，例如 EDIT 包含 VIEW 与 DISCOVER。配置面板还会按资源类型过滤动作；不能把 note、drawio、文档和 AI 资产视为完全相同的权限集合。后端请求发送枚举名称，不能发送前端数字位。依据：[权限动作与类型过滤](enum/index.ts)、[权限请求映射](mapper/resourcePermission.mapper.ts)。
- `SINGLE_HTML_PAGE`（扩展名 `html`）归一化为 `html` 资源类型，仅支持 `DISCOVER / VIEW / EDIT`；下载、批注、评论、Fork 与 AI 装载动作不展示。其权限概览归 HtmlPage 领域所有，读取正文与保留交互脚本的安全边界见 [HtmlPage](../HtmlPage/BUSINESS.md)。依据：[资源类型归一化](model/resourceTarget.ts)、[权限动作过滤](enum/index.ts)、[权限服务装配](service/ResourcePermissionServices.impl.ts)。
- 权限更新必须保留三类值：`undefined` 表示不提供该配置，顶层 `null` 表示清空该组配置，空对象与空动作数组保持原样传递；不能统一转成“空值”。小组覆盖项的 `null` 用于恢复标签继承，`[]` 保留为显式空动作。依据：[mapChangeResourceActionPermissionRequest](mapper/resourcePermission.mapper.ts)、[API 请求类型](apis/ResourceApi.type.ts)。
- 从主体列表保存时，标签主体发送该小组的 `null` 覆盖项；owner 等只读主体与个人群组跳过。没有指定用户主体时发送 `specifiedUsersGrantedActions: null`，避免旧的指定用户配置残留。依据：[mapChangeResourceActionPermissionRequestFromSubjects](mapper/resourcePermission.mapper.ts)。
- 权限补全是附加查询。小组资料或继承动作读取失败时，保留原主体与已有展示字段；没有补全结果不代表没有权限。已有资源覆盖与标签动作在当前资源的可支持动作集合内相等时，显示为标签继承。依据：[createResourcePermissionServices](service/ResourcePermissionServices.impl.ts)、[权限补全归并](mapper/resourcePermissionHydration.mapper.ts)。

## 特殊判断与禁止事项

- 资源记录、权限概览与权限补全使用不同的 mapper 模块，统一入口是 `ResourceServicesMap`。子模块不得反向依赖该组合入口。依据：[ResourceServicesMap](mapper/ResourceServices.map.ts)。
- 前端权限归一化用于展示与配置，不能代替后端操作接口的权限校验；API、service 与 mapper 的契约不可由 view 中的 fallback 改写。依据：[资源 API](apis/ResourceApi.ts)、[权限 service](service/ResourcePermissionServices.impl.ts)。

## 历史决策

| 决策                           | 原因                                                          | 来源                                                                  |
| ------------------------------ | ------------------------------------------------------------- | --------------------------------------------------------------------- |
| 资源名称同步归入 session cache | 避免资源 service 依赖 React store，并在会话结束时清理名称缓存 | [2132b219](https://github.com/Oriole-FDU/WisePenView/commit/2132b219) |
