import type { ResourceItem } from '@/domains/Resource';

/** 小写扩展名，不含点 */
export const DOCUMENT_ALLOWED_EXTENSIONS = [
  'pdf',
  'doc',
  'docx',
  'ppt',
  'pptx',
  'xls',
  'xlsx',
] as const;

export type DocumentAllowedExtension = (typeof DOCUMENT_ALLOWED_EXTENSIONS)[number];

/** 文档资源类型（与后端 ResourceType 枚举序列化值对齐） */
export const DOCUMENT_RESOURCE_TYPES = [...DOCUMENT_ALLOWED_EXTENSIONS, 'unknown'] as const;

export type DocumentResourceType = (typeof DOCUMENT_RESOURCE_TYPES)[number];

/** `POST /document/initDocUpload` 请求体，与后端 DocumentUploadInitRequest 一致 */
export interface DocumentUploadInitRequestBody {
  filename: string;
  extension: string;
  md5: string;
  expectedSize: number;
}

/** `POST /document/initDocUpload` 的 `data`，与后端 DocumentUploadInitResponse 一致 */
export interface DocumentUploadInitResponse {
  documentId: string;
  putUrl: string | null;
  callbackHeader: string | null;
  objectKey: string;
  flashUploaded: boolean;
}

export interface DocumentUploadMeta {
  documentName: string;
  uploaderId: number | null;
  fileType: DocumentResourceType;
  size: number;
}

export interface PendingDocumentStatus {
  status: string;
}

/** 文档元信息（对齐后端 DocumentInfoBase） */
export interface DocMetaInfo {
  uploadMeta: DocumentUploadMeta;
  documentStatus: PendingDocumentStatus;
  maxPreviewPages: number | null;
}

export interface PendingDocItem extends DocMetaInfo {
  /** 部分接口实现可能不返回该字段；缺失时前端仅展示，不允许重试/取消/sync */
  documentId?: string;
}

export interface DocDisplayInfoResponse {
  docMetaInfo: DocMetaInfo;
  resourceInfo: ResourceItem;
}

/** DocumentService：文档上传、重试转换、删除（路径与当前后端 DocumentController 一致） */
export interface IDocumentService {
  /** 计算 MD5 → 初始化上传 → 非秒传时 PUT 至 OSS，返回 documentId（即 resourceId） */
  uploadDocument(params: UploadDocumentParams): Promise<UploadDocumentResult>;
  /** 仅 FAILED 状态可调用 */
  retryConvert(documentId: string): Promise<void>;
  /** 取消上传或删除文档 */
  deleteDocument(documentId: string): Promise<void>;
  /** 拉取待处理文档队列 */
  listPendingDocs(): Promise<PendingDocItem[]>;
  /** 触发单条文档状态同步 */
  syncPendingDocStatus(documentId: string): Promise<void>;
  /** 重试待处理文档 */
  retryPendingDoc(documentId: string): Promise<void>;
  /** 取消待处理文档 */
  cancelPendingDoc(documentId: string): Promise<void>;
  /** 获取文档详情信息（用于预览页展示） */
  getDocInfo(resourceId: string): Promise<DocDisplayInfoResponse>;
}

export interface UploadDocumentParams {
  file: File;
  /** MD5 分块计算进度 0–100 */
  onHashProgress?: (percent: number) => void;
  /** 直传 OSS 进度 0–100（秒传时不触发） */
  onUploadProgress?: (percent: number) => void;
}

export interface UploadDocumentResult {
  documentId: string;
  objectKey: string;
  flashUploaded: boolean;
}
