# Group 业务知识

> Canonical owner：`src/domains/Group`

## 范围

本文档维护小组类型、成员角色、数据读取、成员配额与建组流程。小组资源权限规则以 [Resource](../Resource/BUSINESS.md) 与 [Tag](../Tag/BUSINESS.md) 为唯一 owner；封面上传规则见 [Image](../Image/BUSINESS.md)。

## 类型、角色与读取

- 小组类型为普通组（`NORMAL`）、高级组（`ADVANCED`）与集市组（`PUBLIC`）；成员角色为组长 `OWNER`、管理员 `ADMIN` 与成员 `MEMBER`。映射入口是 Group enum 与 mapper，未知角色码在成员列表展示时回退为 `MEMBER`。依据：[Group enum](enum/index.ts)、[Group mapper](mapper/GroupServices.map.ts)、[member mapper](mapper/groupMember.mapper.ts)。
- `fetchGroupBaseInfo()` 始终读取基础资料接口；`fetchGroupInfo()` 先查当前用户角色，`MEMBER` 读取基础资料，组长与管理员读取详细资料。成员分页来自 `/group/member/list`，领域结果保留后端 `total`。依据：[GroupServices](service/GroupServices.impl.ts)、[Group API](apis/GroupApi.ts)。
- 前端 `GroupDisplayConfig` 根据小组类型与角色控制 Tab、按钮、可选角色及表格列；这些是 UI 展示与输入限制，不构成后端授权证明。具体资源和标签访问权仍由对应 owner 描述，服务端授权行为须以服务端契约或运行证据核实。依据：[GroupDisplayConfig](../../components/business/Group/GroupDisplayConfig.ts)、[GroupRoute](../../views/app/group/GroupRoute/index.tsx)。

## 建组、资源配置与配额

- 创建小组是两阶段调用：先添加小组取得 `groupId`，再为其写入默认成员资源动作。第二步失败时，前端不会撤销第一步创建；不要将其描述成原子事务或自动回滚。依据：[createGroup](service/GroupServices.impl.ts)、[GroupApi](apis/GroupApi.ts)。
- 小组资源配置通过独立配置 API 读取与更新；Group 负责请求编排，标签动作的归一化与资源权限语义分别以 Tag、Resource 文档为准。依据：[GroupServices](service/GroupServices.impl.ts)、[GroupServicesMap](mapper/GroupServices.map.ts)。
- 高级组配额列表先按页读取，再由前端筛选 `ADVANCED` 类型；返回的 `total` 仍是接口映射的总数，不是筛选后当前页记录数，也不保证等于所有高级组数量。页码与页大小在 service 内钳制为至少 1。依据：[fetchUserGroupQuotas](service/GroupServices.impl.ts)、[GroupQuotaMap](mapper/groupQuota.mapper.ts)。
- 单组配额读取 `tokenUsed` 与 `tokenLimit`；分配或调整成员配额使用独立请求。角色相关的输入限制由前端配置控制，后端是否拒绝越权请求不能由该配置推断。依据：[GroupQuotaMap](mapper/groupQuota.mapper.ts)、[GroupApi](apis/GroupApi.ts)、[GroupDisplayConfig](../../components/business/Group/GroupDisplayConfig.ts)。
