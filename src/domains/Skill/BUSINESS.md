# Skill 业务知识

> Canonical owner：`src/domains/Skill`

## 范围

本文件拥有 Skill 的版本与 asset 服务契约；工作区、保存伫列与退出互动由 [Skill editor](../../components/editors/skill/BUSINESS.md) 拥有，资源权限由 [Resource](../Resource/BUSINESS.md) 拥有。

## 版本与编辑资格

- mapper 以 Skill version 作已发布版本，draftVersion 为该版本加一。owner 预设载入 draft，非 owner 载入 published；前端只有 isOwner 且目前版本等于 draftVersion 才可写。这不是后端授权或版本不可变性的证据。依据：[mapSkillDetail](mapper/SkillServices.map.ts)、[useSkillResourceController](../../components/editors/skill/controllers/useSkillResourceController.ts)、[canEditSkill](../../components/editors/skill/model.ts)。
- 指定版本的 bundle 与正文读取是不同步骤，正文的 targetVersion 必须传至 STS client 的 scope，不能自行 fallback 到其他版本。STS client 以 resourceId 及 targetVersion／published 分开快取。依据：[getSkillVersionFiles](service/SkillServices.impl.ts)、[readAssetContent](service/SkillServices.impl.ts)、[createSkillServices](service/SkillServices.impl.ts)。

## Asset 身分与保存

- path、name、assetId 与 objectKey 是不同资讯；mapper 可为缺 ID 的显示节点合成 ID，但不代表该值可当作后端 asset identity。上传结果以 clientId 关联输入，再提供 ticket assetId／objectKey 或 error。依据：[assetToFileNode](mapper/SkillServices.map.ts)、[uploadAssets](service/SkillServices.impl.ts)。
- upload 初始化分批取得 ticket，再依 ticket PUT；失败时只以该 ticket assetId 做 best-effort 删除，不是无条件删除呼叫方全部资产。前端无法单独证明复盖时 ticket ID／物件与先前成功内容必然分离，不能承诺最后成功内容一定保全。依据：[uploadAssets](service/SkillServices.impl.ts)。
- move 先读取或使用 caller 提供的内容，上传新位置，确认结果的 ID／objectKey 齐全后才删旧资产；失败尝试清理本次成功建立的候选。这不是后端原子 move，清理或删除也可能失败。依据：[moveAssets](service/SkillServices.impl.ts)。
- 批次 upload 会把各项错误放在结果中，并非遇到任何失败都只抛出单一错误；其他 API 请求可直接拒绝。workspace 必须检查结果再更新 persisted baseline，不能把 Promise resolve 当全档成功。依据：[uploadAssets](service/SkillServices.impl.ts)、[useSkillSaveController](../../components/editors/skill/controllers/useSkillSaveController.ts)。

## 服务边界

- 建立、fork、更新基本资料、上传、移动、删除与发布是不同服务能力；view 取得正文或 Blob，不取得 STS 凭证。OSS client 与 token 由 domain 管理；这不等于正式 OSS 的权限、保留期限与覆盖行为已验证。依据：[createSkillServices](service/SkillServices.impl.ts)、[ISkillService](service/index.type.ts)。
