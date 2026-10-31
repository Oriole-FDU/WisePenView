# ResourceAccess 业务知识

> Canonical owner：`src/domains/ResourceAccess`

## 范围

ResourceAccess 负责资源权限概览、权限主体继承关系和资源权限写命令。它依赖 ResourceCore、Group、Tag 以及各类资源叶域提供的 `ResourceItemApi` 摘要；ResourceCore 和资源叶域不得反向依赖本域。

## 权限主体与继承

- 权限主体分为 owner、标签继承（`tag`）、资源覆盖（`resourceOverride`）和指定用户（`specifiedUser`）。owner 在配置面板只读；`p_` 个人群组不显示为可配置的小组主体。依据：[resourcePermission.mapper.ts](mapper/resourcePermission.mapper.ts)。
- 通用权限动作与隐含关系以 [AccessPolicy](../_shared/access/BUSINESS.md) 为准。配置面板按资源类型过滤动作；不能把 note、drawio、文档和 AI 资产视为完全相同的权限集合。后端请求发送枚举名称，不能发送前端数字位。依据：[权限动作过滤](enum/index.ts)、[权限请求映射](mapper/resourcePermission.mapper.ts)。
- `MARKET_VIEW` 由市场授予并隐含 `DISCOVER`，参与权限判断，但不能出现在普通资源、标签或小组权限编辑器中。依据：[AccessPolicy](../_shared/access/BUSINESS.md)。
- 权限更新必须保留三类值：`undefined` 表示不提供该配置，顶层 `null` 表示清空该组配置，空对象与空动作数组保持原样传递。小组覆盖项的 `null` 用于恢复标签继承，`[]` 保留为显式空动作。依据：[mapChangeResourceActionPermissionRequest](mapper/resourcePermission.mapper.ts)。
- 从主体列表保存时，标签主体发送该小组的 `null` 覆盖项；owner 等只读主体与个人群组跳过。没有指定用户主体时发送 `specifiedUsersGrantedActions: null`，避免旧的指定用户配置残留。依据：[mapChangeResourceActionPermissionRequestFromSubjects](mapper/resourcePermission.mapper.ts)。
- 权限补全是附加查询。小组资料或继承动作读取失败时，保留原主体与已有展示字段；没有补全结果不代表没有权限。已有资源覆盖与标签动作在当前资源的可支持动作集合内相等时，显示为标签继承。依据：[ResourceAccessServices](service/ResourceAccessServices.impl.ts)、[权限补全归并](mapper/resourcePermissionHydration.mapper.ts)。

## 当前后端边界

- 资源叶域详情仍分别返回 `ResourceItemResponse`，ResourceAccess 按资源类型选择 Note、Document、Skill、Agent 或 HtmlPage 的摘要读取入口，再统一构造权限概览。
- 当前仍存在小组资料和标签继承的并发补全查询。后端提供 Resource Access Overview 聚合 endpoint 后，应直接消费稳定 DTO，并删除补全 mapper 与 N+1 查询。
- 前端权限归一化只用于展示与配置，不代替后端授权。ResourceAccess 写命令最终调用 ResourceCore 的权限更新 Contract。
