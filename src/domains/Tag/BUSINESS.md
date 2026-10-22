# Tag 业务知识

> Canonical owner：`src/domains/Tag`

## 范围

本文档维护标签 scope、原始树／可见树、排序与标签策略。资源上的权限主体和覆盖写入以 [Resource](../Resource/BUSINESS.md) 为准，Drive 将标签映射为文件夹的规则以 [Drive](../Drive/BUSINESS.md) 为准。

## 原始树与可见树

- `p_` 开头的 groupId 表示个人标签作用域，读取标签树时归一化为不传 groupId；真实小组 ID 必须保留，避免把个人标签和小组标签放入同一请求。依据：[normalizeTagGroupId](utils/normalizeTagGroupId.ts)、[mapGetTagTreeRequest](mapper/TagServices.map.ts)。
- `getRawTagTree` 保留路径型与系统标签。`getTagTree` 先排除名称以 `/` 开头的根节点，再递归排除 trim 后名称以 `.` 开头的系统节点及其子树。二者不能互换，Drive 与权限计算不能只依赖普通 Tag 视图的可见节点。依据：[TagServices](service/TagServices.impl.ts)。
- `getTagGrantedActions` 读取未过滤的标签树，按 tagId 收集动作，不能因标签未显示在普通 Tag 视图中就丢弃其权限策略。依据：[getTagGrantedActions](service/TagServices.impl.ts)、[mapTagGrantedActions](mapper/TagServices.map.ts)。
- 原始树、可见树与各自的扁平索引按归一化 groupId 隔离，TTL 为 15 秒；`getTagById`／`getRawTagById` 只读已有索引。标签写入成功后失效相关缓存，会话清理时全部清空。依据：[缓存与清理入口](service/TagServices.impl.ts)。

## 权限策略

- 标签可见性、标签自身挂载权限和标签内资源的默认授权是三个独立维度。不能用“标签可见”推导“允许挂载”或“资源可编辑”。依据：[TagTreeNode](entity/tag.ts)、[策略枚举](enum/index.ts)。
- 资源动作复用 Resource 的位定义与隐含动作规则，不维护第二套权限位。标签的 private／readonly／shared 预设作用于标签内资源，all／onlyAdmin／advanced 预设作用于标签自身挂载策略。依据：[预设与动作转换](enum/index.ts)。
- mapper 兼容历史动作数字、枚举名与 mask；visibilityMode 和 access scope 分别按其接口类型归一化。兼容逻辑留在 mapper，不能散落到权限面板中。依据：[TagServicesMap](mapper/TagServices.map.ts)。

## Metadata 与排序

- `tagMetaInfo` 是 JSON 字符串，解析后必须保留未知扩展字段。`schema` 只接受字符串，`sortOrder` 只接受有限数字；历史非 JSON 或非法结构按未设置处理，不能清空其他客户端写入的有效扩展字段。依据：[parseTagMetaInfo](mapper/TagServices.map.ts)、[TagMetaInfo](entity/tag.ts)。
- 有 sortOrder 的节点排在未设置的节点前，数值不同时升序；相同或均未设置时保留后端原顺序，子树采用相同规则。依据：[sortTagTreeNodes](mapper/TagServices.map.ts)。
- 排序只接受存在、无重复且属于同一父节点的标签，按 `(index + 1) * 1024` 顺序写入，并保留已有 metadata。当前没有批量原子排序接口，任一请求失败后也必须在 finally 中清缓存，反映已经成功的部分更新，不能声称整体回滚。依据：[reorderSiblingTags](service/TagServices.impl.ts)。
