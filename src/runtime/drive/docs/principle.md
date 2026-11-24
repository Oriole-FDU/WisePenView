# Drive Runtime 分层准则

## 问题

Drive 的目录读取、分页、展开恢复、选择、拖拽和多 service 写入曾同时散落在 domain service、页面级状态编排层与各树组件中。组件既负责交互，又拼装分页和刷新时序；domain service 同时承担查询、节点规则和跨 domain 写操作，导致任何一个目录行为都需要跨三层修改。

## 目标分层

```text
Component
  只负责渲染、动画、布局、虚拟列表与事件适配
        │
        ▼
DriveRuntime / DriveTreeRuntime
  节点集合生命周期、数据与 UI 状态、分页缓存、scope 隔离、业务操作编排
        │
        ▼
DriveService 与其它 Domain Service
  节点查询、节点语义、纯规则与原子数据能力
        │
        ▼
API 与 mapper
```

## 职责

| 层                   | 负责                                                                  | 不负责                                             |
| -------------------- | --------------------------------------------------------------------- | -------------------------------------------------- |
| Component            | 布局、样式、动画、虚拟列表、输入控件、把用户手势转成 runtime 意图     | 拼分页、恢复展开态、串联多个 service、操作全局刷新 |
| DriveTreeRuntime     | 一份按节点 key 归一化的集合、路径、分页、展开、选择、详情栏和拖拽状态 | 视觉组件、弹窗表单、按 scope 复制状态机            |
| DriveRuntime         | 多树池、数据缓存、scope 失效、创建/移动/删除/复制等业务操作           | API DTO、节点映射细节                              |
| Drive domain service | 目录查询、节点映射、系统目录和 scope 语义                             | 页面状态、缓存池、UI 提示、跨视图刷新              |
| 其它 Domain Service  | Tag、Resource、Note、Agent、Skill 等原子能力                          | Drive 树的先后顺序和生命周期                       |

## 约束

1. Component 不直接读取或写入 `IDriveService`。
2. 一个目录请求的生命周期由 runtime 持有，组件卸载不丢 scope 级展开缓存。
3. 分页缓存按 scope、父节点、cursor 与查询配置隔离，并受 TTL 控制。
4. 数据变更由 runtime 业务操作发出 scope 级失效，不再维护全局 refresh version。
5. 组件私有逻辑放在 `hooks/useXxx.ts`；跨组件状态和行为进入 runtime，不建立 controller 层。
6. 旧分页 hook 与刷新总线在迁移后删除，不保留兼容双路径。
7. 可见 UI 放在 `parts/PascalCase/index.tsx`，类型和样式与组件同级；只服务该 part 的 Hook 与 part 同级，Drive 共享 Hook 放在 `Drive/hooks`，共享部件放在 `Drive/parts`。
8. Navigator 不是独立 runtime：`scopeMode` 只决定进入同一 Node Store 的根节点数量，single/all/public 都是同一 `DriveTreeRuntime` 的配置。
9. 不建立 `DriveForestRuntime` 或 `DriveScopeRuntime`。多 scope 是节点来源，不是多套运行状态；分页、展开、选择和加载集合全部按节点 key 共用一张状态表。
10. 不按相似行数抽 common，按重复的不变量和操作后置条件识别：节点去重、作用域校验、资源/目录分组等纯规则进入 Drive domain；成功失效与批量结果等命令协议进入 `driveActionRules`；只出现一次的命令流程保持原处。
