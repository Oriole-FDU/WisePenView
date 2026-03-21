import Axios from '@/utils/Axios';
import {
  DOCUMENT_ALLOWED_EXTENSIONS,
  DOCUMENT_MAX_FILE_BYTES,
  type DocumentAllowedExtension,
} from '@/constants/document';
import { checkResponse } from '@/utils/response';
import type { ApiResponse } from '@/types/api';
import { computeFileMd5 } from '@/utils/computeFileMd5';
import { putOssPresignedUrl } from '@/utils/ossPresignedPut';
import type {
  DocumentUploadInitRequestBody,
  DocumentUploadInitResponse,
  IDocumentService,
  UploadDocumentParams,
  UploadDocumentResult,
} from './index.type';

const DOCUMENT_UPLOAD_INIT_TIMEOUT_MS = 30_000;

const parseExtension = (fileName: string): string => {
  const i = fileName.lastIndexOf('.');
  if (i <= 0 || i === fileName.length - 1) {
    throw new Error('文件名须包含扩展名');
  }
  return fileName.slice(i + 1).toLowerCase();
};

const ALLOWED_EXT_SET = new Set<string>(DOCUMENT_ALLOWED_EXTENSIONS);

const isAllowedExtension = (ext: string): ext is DocumentAllowedExtension =>
  ALLOWED_EXT_SET.has(ext);

const assertDocumentUploadAllowed = (file: File): void => {
  if (file.size > DOCUMENT_MAX_FILE_BYTES) {
    throw new Error('文件大小超过 100MB 限制');
  }
  const ext = parseExtension(file.name);
  if (!isAllowedExtension(ext)) {
    throw new Error('不支持的文件类型，仅支持 doc/docx/ppt/pptx/xls/xlsx/pdf');
  }
};

const initUpload = async (body: DocumentUploadInitRequestBody): Promise<DocumentUploadInitResponse> => {
  const res = (await Axios.post('/document/upload/init', body, {
    timeout: DOCUMENT_UPLOAD_INIT_TIMEOUT_MS,
  })) as ApiResponse<DocumentUploadInitResponse>;
  checkResponse(res);
  if (res.data == null) {
    throw new Error('上传初始化无数据');
  }
  return res.data;
};

const uploadDocument = async (params: UploadDocumentParams): Promise<UploadDocumentResult> => {
  const { file, onHashProgress, onUploadProgress } = params;
  assertDocumentUploadAllowed(file);

  const md5 = await computeFileMd5(file, onHashProgress);
  const extension = parseExtension(file.name);

  const init = await initUpload({
    filename: file.name,
    extension,
    md5,
    size: file.size,
  });

  if (init.flashUploaded) {
    return {
      documentId: init.documentId,
      objectKey: init.objectKey,
      flashUploaded: true,
    };
  }

  if (init.putUrl == null || init.putUrl === '' || init.callbackHeader == null || init.callbackHeader === '') {
    throw new Error('上传初始化未返回有效的直传地址');
  }

  await putOssPresignedUrl({
    putUrl: init.putUrl,
    body: file,
    callbackHeader: init.callbackHeader,
    onProgress: onUploadProgress,
  });

  return {
    documentId: init.documentId,
    objectKey: init.objectKey,
    flashUploaded: false,
  };
};

const retryConvert = async (documentId: string): Promise<void> => {
  const res = (await Axios.post(`/document/${documentId}/retry`)) as ApiResponse<unknown>;
  checkResponse(res);
};

const deleteDocument = async (documentId: string): Promise<void> => {
  const res = (await Axios.delete(`/document/${documentId}`)) as ApiResponse<unknown>;
  checkResponse(res);
};

/** dev：/api/document/... 经 Vite 剥离 /api → 网关 /document/... */
const getDocumentPreviewUrl = (resourceId: string): string => {
  const path = `/api/document/${encodeURIComponent(resourceId)}/preview`;
  return new URL(path, window.location.origin).href;
};

export const DocumentServicesImpl: IDocumentService = {
  uploadDocument,
  retryConvert,
  deleteDocument,
  getDocumentPreviewUrl,
};
