# ResourceInteraction 领域业务知识

> Canonical owner：`src/domains/ResourceInteraction`

## 范围

本文件拥有单个 Resource 的阅读记录、资源点赞与评分命令，以及读取当前用户互动摘要的语义。一般评论由 [ResourceComment](../ResourceComment/BUSINESS.md) 拥有，收藏由 [ResourceFavorite](../ResourceFavorite/BUSINESS.md) 拥有；面板展示流程由 [资源互动面板](../../components/business/Resource/ResourceInteractionPanel/BUSINESS.md) 拥有。

## 阅读、点赞与评分

- `recordResourceRead` 只提交 Resource ID，表示当前用户打开过资源；课程如何把已读记录折算为学习进度由 [Course](../Course/BUSINESS.md) 拥有。依据：[recordResourceRead](service/ResourceInteractionServices.impl.ts)、[ResourceInteractionApi](apis/ResourceInteractionApi.ts)。
- 资源点赞命令同样只提交 Resource ID，由后端执行切换；调用端的目标 `liked` 只用于本地乐观显示，不能据此推断请求携带了目标状态。依据：[toggleResourceLike](service/ResourceInteractionServices.impl.ts)、[ChangeResourceLikeApiContract](apis/ResourceInteractionApi.contract.ts)。
- 互动摘要返回资源点赞、评分与评论点赞 ID 集合。评论点赞 ID 只用于恢复面板状态，评论切换行为与返回值由 [ResourceComment](../ResourceComment/BUSINESS.md) 拥有。依据：[mapResourceInteractionRecordFromApi](mapper/ResourceInteractionServices.map.ts)。
- 评分命令与 Service 类型已存在，但当前没有额外前端评分政策或已接线的业务流程；不能因方法存在就视为产品功能已上线。依据：[rateResource](service/ResourceInteractionServices.impl.ts)。

## 证据限制

mock 只模拟离线 API 行为，不证明正式后端的权限、计数一致性或并发语义。依据：[ResourceInteractionApi mock](mock/ResourceInteractionApi.mock.ts)。
