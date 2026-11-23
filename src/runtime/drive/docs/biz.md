# Drive Runtime 业务模型

分层准则见 [principle.md](./principle.md)。

## 多树模型

- 每棵树由 `surface + mode + scope + kinds + resourceType + pageSize` 唯一标识。
- `surface` 区分主浏览、侧栏树与选择器；`mode` 区分浏览与选择语义。
- 同一 scope 的树共享展开缓存，但各自的当前路径、选择、详情栏和拖拽会话独立。
- runtime 池只回收没有订阅者的树；已挂载树不会因容量淘汰而突然失效。

## 数据缓存

- 子节点页缓存键包含 root scope、父节点、cursor、类型过滤、资源类型与页大小。
- 缓存 TTL 为 30 秒；显式刷新绕过缓存。
- 写操作按 scope 精确失效；登录会话结束时清空全部 runtime 与缓存。
- 展开节点 ID 按 `scope.rootId` 持久化到 session storage；不同个人盘与小组盘互不覆盖。

## 状态

单棵树维护：

- 当前目录、完整路径与已加载节点索引；
- 每个父节点的已加载子节点与下一页 cursor；
- 展开集合、行选择、批量勾选、详情栏折叠；
- 拖拽源、当前拖拽节点、节点加载与加载更多集合；
- 初始化、错误与最后操作状态。

Navigator 额外维护 scope 列表、scope 分页、跨树 key 与跨树选择。树 key 由 scope root 与 node ID 组成，避免并列多个云盘时节点 ID 冲突。

## 业务操作

`DriveRuntime` 编排以下跨 service 操作，并在成功后通知受影响 scope：

- 创建文件夹、Note、Drawio、Agent 与 Skill；
- 重命名资源或文件夹；
- 在同一 scope 内移动资源与文件夹；
- 移到个人回收站、从小组卸载、永久删除；
- 把个人资源挂载到小组，或调整个人资源位置。

节点去重、系统目录保护、同 scope 约束与防环规则由 Drive domain 的纯规则模块拥有；具体 Tag、Resource、Note、Agent、Skill 调用时序由 runtime 拥有。
