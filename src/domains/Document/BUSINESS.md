# Document 业务知识

> Canonical owner：`src/domains/Document`

## 范围

本文档维护文档上传、后端处理生命周期与文档权限读取。通用资源位置和权限规则见 [Resource](../Resource/BUSINESS.md)，上传队列的画面布局与交互由对应 UI 流程维护。

## 上传生命周期

- 当前允许 pdf、doc、docx、ppt、pptx、xls、xlsx，扩展名按小写解析；文件上限为 100 MiB，等于上限允许，大于上限拒绝。格式与容量在计算 MD5 和初始化请求前校验。依据：[允许格式](service/index.type.ts)、[assertDocumentUploadAllowed](service/DocumentServices.impl.ts)。
- 上传顺序是校验、计算 MD5、初始化上传、必要时 PUT 至 OSS。`pathTagId` 映射到初始化请求的 `mountTargetTagId`，不能在上传后另猜目标文件夹。依据：[uploadDocument](service/DocumentServices.impl.ts)、[mapUploadDocToApi](mapper/DocumentServices.map.ts)。
- 初始化成功即调用 `onUploadInitialized`，让调用方关联后端 documentId。秒传直接返回 documentId，不执行 OSS PUT 或上传进度回调；非秒传必须具备有效 putUrl 与 callbackHeader 才可上传。依据：[uploadDocument](service/DocumentServices.impl.ts)、[UploadDocumentParams](service/index.type.ts)。
- `uploadDocument` 返回只表示前端完成秒传分支或档案传输，不证明解析、资源注册完成；目前上传队列在传输后继续同步处理状态，收到 READY 才走完成回呼。这是前端判定，不是对正式后端持久化或可用性的独立验证。依据：[DOCUMENT_PROCESS](enum/index.ts)、[useDriveDocumentUpload](../../components/business/Drive/common/useDriveDocumentUpload.ts) 的 `settleQueuedUpload`。

## 状态与允许操作

以下集合以 [Document 枚举](enum/index.ts) 为唯一代码入口，不能在 UI 中按标签文案重新判断：

| 行为   | 状态集合与含义                                                                                                                                |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 终态   | READY、TRANSFER_TIMEOUT、REGISTERING_RES_TIMEOUT、FAILED；终态包含失败，不能都按成功处理。                                                    |
| 可重试 | REGISTERING_RES_TIMEOUT、FAILED；TRANSFER_TIMEOUT 不在当前重试集合中。                                                                        |
| 可取消 | UPLOADING、UPLOADED、REGISTERING_RES、TRANSFER_TIMEOUT、REGISTERING_RES_TIMEOUT、FAILED；CONVERTING_AND_PARSING 与 READY 不在当前取消集合中。 |

- 待处理记录可以缺少 documentId；此时仅展示，不能发起重试、取消或同步单项状态请求。不要使用名称或前端队列 ID 替代后端 ID。依据：[PendingDocItem](service/index.type.ts)、[上传队列操作条件](../../views/app/drive/_components/UploadQueueTab/uploadQueueModel.ts)。
- 同步、重试与取消调用各自的后端能力，不能仅更新前端队列就当作后端状态已经变化。依据：[DocumentServices](service/DocumentServices.impl.ts)。

## 详情与权限

- 完整详情需要 documentVersionInfo，缺失时 mapper 抛出明确错误；资源权限概览只从 resourceInfo 构造，不依赖文件版本或预览元数据。不可为了读取权限而强制调用完整详情映射。依据：[mapGetDocInfoFromApi、mapDocPermissionOverviewFromApi](mapper/DocumentServices.map.ts)。
- 文档复制透过独立 `forkDocument` 请求传送资源 ID、新名称与可选版本，不能把本地档案复制或重新挂载等同于后端 fork。service 型别注解将 FORK 校验交给后端，但本仓前端来源不能证明正式后端已实施该校验。依据：[forkDocument](service/DocumentServices.impl.ts)、[ForkDocumentRequest](service/index.type.ts)、[DocumentApi](apis/DocumentApi.ts)。
