# Image 业务知识

> Canonical owner：`src/domains/Image`

## 范围

本文档维护图床代理上传、存储场景与图片地址的使用约束。头像保存由 [User](../User/BUSINESS.md) 流程负责，小组封面保存由 [Group](../Group/BUSINESS.md) 流程负责；[Document](../Document/BUSINESS.md) 的 MD5、秒传与文档处理队列不属于图床流程。

## 上传与业务场景

- 图床请求必须带 scene，目前支持 `PUBLIC_IMAGE_FOR_USER`、`PUBLIC_IMAGE_FOR_GROUP`、`PRIVATE_IMAGE_FOR_NOTE`。`bizTag` 用于进一步区分业务路径，只有不为 undefined 且不为空字符串时才加入 FormData；不能从文件名推导 scene。依据：[ImageUploadRequest](service/index.type.ts)、[mapImageUploadRequest](mapper/ImageServices.map.ts)。
- 当前前端代理上限为 5 MiB（`5 * 1024 * 1024` 字节），等于上限允许，大于上限在 service 中拒绝。UI 校验不能替代 service 校验；该值与后端实际部署配置的一致性仍需部署侧确认。依据：[上传限制常量](../../utils/image/uploadLimit.ts)、[uploadImage](service/ImageServices.impl.ts)。
- 图床上传使用 60 秒请求超时，成功返回存储记录与拼接地址，不会自动更新用户头像或小组封面字段。图片上传成功后，业务实体更新仍可能失败，不能提前显示整个业务操作成功。依据：[ImageServices](service/ImageServices.impl.ts)、[头像保存调用链](../../views/app/profile/_components/Account/AccountHeader/index.tsx)、[小组封面保存调用链](../../views/app/group/GroupDetail/_components/GroupProfileSection/index.tsx)。

## 地址与权限边界

- `publicUrl` 由返回记录的 domain 和 objectKey 拼接，去掉相接位置多余的 `/`；不要丢失 objectKey 或把临时上传地址持久化为图片地址。依据：[buildImagePublicUrl](service/index.type.ts)。
- 拼出 URL 不代表对象允许匿名读取。公开头像／封面可以按相应存储策略使用该地址；私有 Note 图片不能依赖拼接 URL 长期有效，必须使用后端授权的访问方式。当前 Image service 不提供私有读取授权或预签名读取能力。依据：[ImageUploadResult、IImageService](service/index.type.ts)。
- 上传失败由 service 向上抛错，UI 在所属业务流程中处理提示；Image 不负责业务实体更新、删除补偿或文档处理状态。依据：[ImageServices](service/ImageServices.impl.ts)。
