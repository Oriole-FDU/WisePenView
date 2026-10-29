# AccessPolicy 业务知识

> Canonical owner：`src/domains/_shared/access`

## 范围

本文档维护 Resource、Tag、Group 共用的资源动作、动作依赖关系和访问控制范围。具体资源类型是否允许某项动作、标签预设和小组默认策略仍由各自领域维护。

## 资源动作

- 前端权限使用 `defineEnum` 定义的字符串动作集合，值与后端 JSON 中的枚举名称一致；后端位掩码只属于后端存储和 ACL 计算。
- `MARKET_VIEW` 只隐含 `DISCOVER`。它参与权限判断，但不能出现在普通资源、标签或小组权限编辑器中。
- 动作集合统一通过 `normalizeResourceActions` 展开隐含动作、去重并按固定顺序返回。未知名称不能静默进入领域集合。
- `AccessPolicy.schema.ts` 只声明 wire Shape；`parseResourceActions` 严格校验后端动作名称，请求侧直接归一化领域动作集合。
- Tag 树忽略后端 `taggedResourceGrantedActionsMask`，只读取 `grantedActions` 集合。

## 访问范围

- 访问控制范围统一为 `ALL`、`ONLY_ADMIN`、`WHITELIST`、`BLACKLIST`，前后端值一致。
- 标签可见性、标签自身挂载范围和标签内资源默认授权是不同维度，不能由访问范围推导资源动作。
