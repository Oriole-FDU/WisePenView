/** `POST /document/upload/init` 请求体，与后端 DocumentUploadInitRequest 一致 */
export interface DocumentUploadInitRequestBody {
  filename: string;
  extension: string;
  md5: string;
  size: number;
}

/** `POST /document/upload/init` 的 `data`，与后端 DocumentUploadInitResponse 一致 */
export interface DocumentUploadInitResponse {
  documentId: string;
  putUrl: string | null;
  callbackHeader: string | null;
  objectKey: string;
  flashUploaded: boolean;
}

/** DocumentService：文档上传、重试转换、删除（路径与 docs/apis/document-frontend.md 一致） */
export interface IDocumentService {
  /** 计算 MD5 → 初始化上传 → 非秒传时 PUT 至 OSS，返回 documentId（即 resourceId） */
  uploadDocument(params: UploadDocumentParams): Promise<UploadDocumentResult>;
  /** 仅 FAILED 状态可调用 */
  retryConvert(documentId: string): Promise<void>;
  /** 取消上传或删除文档 */
  deleteDocument(documentId: string): Promise<void>;
  /** 文档预览 PDF 同源 URL（GET `/document/{id}/preview`；dev 下经 `/api` 代理） */
  getDocumentPreviewUrl(resourceId: string): string;
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
