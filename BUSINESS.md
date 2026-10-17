# 业务知识索引

本文档只做索引，不承载模块细节。业务规则、状态转换、权限判断与历史决策应放在最接近其唯一拥有者的 `BUSINESS.md`。

## 业务域索引

| 业务域／流程          | 代码根目录                     | 唯一知识文档                                                                           |
| --------------------- | ------------------------------ | -------------------------------------------------------------------------------------- |
| Drive                 | `src/domains/Drive`            | [`src/domains/Drive/BUSINESS.md`](src/domains/Drive/BUSINESS.md)                       |
| Resource              | `src/domains/Resource`         | [`src/domains/Resource/BUSINESS.md`](src/domains/Resource/BUSINESS.md)                 |
| Tag                   | `src/domains/Tag`              | [`src/domains/Tag/BUSINESS.md`](src/domains/Tag/BUSINESS.md)                           |
| Image                 | `src/domains/Image`            | [`src/domains/Image/BUSINESS.md`](src/domains/Image/BUSINESS.md)                       |
| Document              | `src/domains/Document`         | [`src/domains/Document/BUSINESS.md`](src/domains/Document/BUSINESS.md)                 |
| Skill domain          | `src/domains/Skill`            | [`src/domains/Skill/BUSINESS.md`](src/domains/Skill/BUSINESS.md)                       |
| Skill editor workflow | `src/components/editors/skill` | [`src/components/editors/skill/BUSINESS.md`](src/components/editors/skill/BUSINESS.md) |

其他业务域在完成知识盘点、确定唯一 owner 后，再加入本索引；不要为尚未确认的模块创建空文档。

治理规则、迁移方式与 5 轮覆盖路线见 [`agent/docs/business-knowledge.md`](agent/docs/business-knowledge.md)。
