# Drive 业务知识

> Canonical owner：`src/domains/Drive`

## 范围

本文档涵盖 Drive domain 的节点模型、scope、tag／resource 组合、权限与节点生命周期。TableDrive 的画面互动流程另见 `src/components/business/Drive/TableDrive` 的代码与后续流程文档。

## 核心规则

- Drive 有 personal 与 group 两种 scope；group scope 必须带有效 `groupId`，root identity 由 scope 决定。
- root、folder、resource、link 是不同节点语义；loading node 是 UI 分页占位，不属于 domain service 的持久化节点。
- folder 主要由 tag tree 映射；resource 与 link 由资源及其所在 tag／parent 映射。节点 ID 编码必须保留足以反解 scope 与 parent 的信息。标签树过滤规则以 [Tag](../Tag/BUSINESS.md) 为准，资源绑定与位置操作以 [Resource](../Resource/BUSINESS.md) 为准。
- `.Trash` 与 `.Shared` 是系统文件夹语义，不当作普通用户文件夹处理。
- 个人 root 由 personal root、shared root 与普通标签节点组合；Drive 对原始标签树的节点分类由 `model/driveNode.ts` 维护，不能直接替换成普通 Tag 视图的过滤结果。

## 权限与生命周期

- Drive 操作需遵守节点的 scope 与类型限制；标签策略的唯一来源是 [Tag](../Tag/BUSINESS.md)，资源权限主体与继承的唯一来源是 [Resource](../Resource/BUSINESS.md)。
- Drive 将节点意图映射为个人回收站或小组移除等命令；这些资源操作的区别见 [Resource](../Resource/BUSINESS.md)，不要在 Drive 另建一套资源位置语义。
- rename、move、mount、unmount 与 permission 更新成功后，调用方必须刷新受影响的 Drive view。
- cursor 只对创建它的 parent 与 page scope 有效；非法或跨 parent 使用必须回传 validation error。

## 特殊判断与禁止事项

- 不在 view 重新实现 node ID、scope、system folder 或可见 tag 判断；统一使用 `src/domains/Drive/model` 与 service。
- 不把 loading node、翻译文案或选取 UI 状态写入 domain 持久化模型。
- 不以节点名称单独判定所有系统文件夹；系统类型与既有兼容名称都必须按 model 规则处理。

## 历史决策

| 决策                                                    | 原因与证据                                       | 来源                                                      |
| ------------------------------------------------------- | ------------------------------------------------ | --------------------------------------------------------- |
| 以 `DriveNodeScope` 区分 personal／group                | 避免跨 scope 重用 root、tag 与 resource identity | `src/domains/Drive/entity/drive.ts`、`model/driveNode.ts` |
| Drive service 透过注入的 Resource／Tag service 组合节点 | 保持跨 domain 依赖可测试且不直接依赖实现         | `src/domains/Drive/service/DriveServices.impl.ts`         |

## 相关代码

- `src/domains/Drive/entity/drive.ts`
- `src/domains/Drive/model/driveNode.ts`
- `src/domains/Drive/service/DriveServices.impl.ts`
- `src/components/business/Drive/TableDrive`
