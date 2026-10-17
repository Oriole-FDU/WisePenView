# Skill 业务知识

> Canonical owner：`src/domains/Skill`

## 范围

本文档涵盖 Skill domain 的版本、owner、asset 与 service／API 边界。编辑器工作区的 UI 状态与离开流程另见 `src/components/editors/skill/BUSINESS.md`。

## 核心规则

- Skill 有 draft version 与 published version；owner 可编辑 draft，非 owner 预设读取 published version。
- 编辑权限由 owner 与目前载入版本共同决定；只有 `isOwner` 且目前版本等于 draft version 时可写入。
- asset 的 `path`、`name`、`objectKey` 与 asset identity 必须保持可追踪；服务层负责将 API／OSS 回应映射成稳定的前端 asset 结果。
- 覆盖保存不得因候选上传失败删除最后一次成功内容；失败清理只能针对本次候选对象。
- 读取指定版本的文件时，版本参数必须沿着 service 到 asset client 传递，不能由 view 自行 fallback 到其他版本。

## 权限与生命周期

- 创建、fork、更新基本数据、上传、移动、删除与发布是不同的 service 能力；UI 不直接组合 API request。
- draft asset 更改先经过 service 的 upload／move 契约，再由 workspace 更新本地 persisted baseline。
- service 只抛出 `WisePenError`／client error，不负责 toast、modal 或路由。

## 特殊判断与禁止事项

- 不把 OSS presigned URL、STS token 或 raw API response 暴露给 view。
- 不以文件名称或 view 的暂存 ID 取代后端 asset identity。
- 不在 Skill view 复制版本、owner 或 asset upload 的业务判断；这些规则由 domain service／mapper 拥有。

## 历史决策

| 决策                                             | 原因与证据                                               | 来源                                              |
| ------------------------------------------------ | -------------------------------------------------------- | ------------------------------------------------- |
| Skill service 透过 OSS client manager 读写 asset | 将 STS client、版本 scope 与 object access 集中在 domain | `src/domains/Skill/service/SkillServices.impl.ts` |
| 覆盖上传失败只取消候选 object                    | 保留既有成功正文，避免共用 asset identity 被错误删除     | `fix/skill-upload-preservation` PR／回归脚本      |

## 相关代码

- `src/domains/Skill/entity/skill.ts`
- `src/domains/Skill/service/SkillServices.impl.ts`
- `src/domains/Skill/mapper/SkillServices.map.ts`
- `src/components/editors/skill`
