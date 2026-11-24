# Drive Runtime 业务模型

分层准则见 [principle.md](./principle.md)。

## 节点集合模型

- 每个运行实例由 `surface + mode + scopeMode + scope + kinds + resourceType + pageSize` 唯一标识。
- `surface` 区分主浏览、侧栏树与选择器；`mode` 区分浏览与选择语义。
- `scopeMode` 为 `single` 时只装载当前 scope；`all` 装载个人盘与所有可访问小组盘；`public` 只装载小组盘。
- 同一运行实例中的节点统一使用 `scopeRootId + nodeId` 作为 key；scope 只解释节点来自哪里，不再拥有独立 runtime。
- runtime 池只回收没有订阅者的树；已挂载树不会因容量淘汰而突然失效。

## 数据缓存

- 子节点页缓存键包含 root scope、父节点、cursor、类型过滤、资源类型与页大小。
- 缓存 TTL 为 30 秒；显式刷新绕过缓存。
- 写操作按 scope 精确失效；登录会话结束时清空全部 runtime 与缓存。
- 展开节点 ID 按 `scope.rootId` 持久化到 session storage；不同个人盘与小组盘互不覆盖。

## 状态

`DriveTreeRuntime` 维护一个节点集合，不区分调用方最终画出来是一棵树还是多棵树，也不按 scope 拆分状态机：

- 当前目录、完整路径与已加载节点索引；
- 每个父节点的已加载子节点与下一页 cursor；
- 展开集合、行选择、批量勾选、详情栏折叠；
- 拖拽源、当前拖拽节点、节点加载与加载更多集合；
- 初始化、错误与最后操作状态。

Table、Sidebar 与 Navigator 共用同一个 `DriveTreeRuntime`。single 只放入当前 scope 的根；all/public 放入多个 scope 的根，并在同一张表中维护 scope 分页、跨 scope 选择与展开。节点 key 由 scope root 与 node ID 组成，避免并列多个云盘时节点 ID 冲突。

## 业务操作

`DriveRuntime` 编排以下跨 service 操作，并在成功后通知受影响 scope：

- 创建文件夹、Note、Drawio、Agent 与 Skill；
- 重命名资源或文件夹；
- 在同一 scope 内移动资源与文件夹；
- 移到个人回收站、从小组卸载、永久删除；
- 把个人资源挂载到小组，或调整个人资源位置。

节点去重、系统目录保护、同 scope 约束与防环规则由 Drive domain 的纯规则模块拥有；具体 Tag、Resource、Note、Agent、Skill 调用时序由 runtime 拥有。
