import type { ResourceItem } from '@/domains/Resource';
import type { UserDisplayBase } from '@/domains/User';
import type { Config } from '@onlyoffice/doceditor-types';

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

interface DocumentUploadMeta {
  documentName: string;
  uploaderId: string | null;
  fileType: string;
  size: number;
}

export interface DocumentProcessStatus {
  status: string;
  errorMessage?: string | null;
}

/** 文档元信息（对齐后端 DocumentInfoBase） */
export interface DocMetaInfo {
  uploadMeta: DocumentUploadMeta;
  documentStatus: DocumentProcessStatus;
  maxPreviewPages: number | null;
  version?: number;
}

export interface PendingDocItem extends DocMetaInfo {
  /** 部分接口实现可能不返回该字段；缺失时前端仅展示，不允许重试/取消/sync */
  documentId?: string;
}

export interface DocDisplayInfoResponse {
  docMetaInfo: DocMetaInfo;
  resourceInfo: ResourceItem;
  authorsDisplay?: Record<string, UserDisplayBase>;
}

export type OnlyOfficeEditorConfig = Config;

export interface OnlyOfficeEditorConfigResponse {
  sessionId?: string;
  config?: OnlyOfficeEditorConfig | null;
}

/** DocumentService：文档上传、重试转换、删除（路径与当前后端 DocumentController 一致） */
export interface IDocumentService {
  /** 计算 MD5 → 初始化上传 → 非秒传时 PUT 至 OSS，返回 documentId（即 resourceId） */
  uploadDocument(params: UploadDocumentParams): Promise<string>;
  /** 拉取待处理文档队列 */
  listPendingDocs(): Promise<PendingDocItem[]>;
  /** 同步并返回单条文档处理状态 */
  syncPendingDocStatus(documentId: string): Promise<DocumentProcessStatus>;
  /** 重试待处理文档 */
  retryPendingDoc(documentId: string): Promise<void>;
  /** 取消待处理文档 */
  cancelPendingDoc(documentId: string): Promise<void>;
  /** 获取文档详情信息（用于预览页展示） */
  getDocInfo(resourceId: string): Promise<DocDisplayInfoResponse>;
  /** 复制已有文档，后端统一校验 FORK 权限。 */
  forkDocument(params: ForkDocumentRequest): Promise<string>;
  /** 获取 ONLYOFFICE 编辑器初始化配置 */
  getOnlyOfficeEditorConfig(resourceId: string): Promise<OnlyOfficeEditorConfigResponse>;
}

export interface ForkDocumentRequest {
  resourceId: string;
  forkedResourceName: string;
  forkedResourceVersion?: number;
}

export interface UploadDocumentParams {
  file: File;
  /** 上传完成后资源挂载的目标路径标签。 */
  pathTagId: string;
  /** 初始化上传成功后触发，供上传队列提前关联后端任务 */
  onUploadInitialized?: (payload: UploadDocumentInitializedPayload) => void;
  /** 直传 OSS 进度 0–100（秒传时不触发） */
  onUploadProgress?: (percent: number) => void;
}

export interface UploadDocumentInitializedPayload {
  documentId: string;
  flashUploaded: boolean;
}
