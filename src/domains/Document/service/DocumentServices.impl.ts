import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';
import { computeFileMd5 } from '@/utils/oss/computeFileMd5';
import { putOssPresignedUrl } from '@/utils/oss/ossPresignedPut';
import { parseExtension } from '@/utils/parser/extensionParser';
import { DocumentApi } from '../apis/DocumentApi';
import type { UploadDocApiRequest, UploadDocApiResponse } from '../apis/DocumentApi.type';
import { DocumentServicesMap } from '../mapper/DocumentServices.map';
import type {
  DocDisplayInfoResponse,
  DocumentAllowedExtension,
  IDocumentService,
  PendingDocItem,
  UploadDocumentParams,
} from './index.type';
import { DOCUMENT_ALLOWED_EXTENSIONS } from './index.type';

const ALLOWED_EXT_SET = new Set<string>(DOCUMENT_ALLOWED_EXTENSIONS);

const isAllowedExtension = (ext: string): ext is DocumentAllowedExtension =>
  ALLOWED_EXT_SET.has(ext);

const DOCUMENT_MAX_FILE_BYTES = 100 * 1024 * 1024;

const assertDocumentUploadAllowed = (file: File): void => {
  if (file.size > DOCUMENT_MAX_FILE_BYTES) {
    throw createClientError(FRONTEND_CLIENT_ERROR.DOCUMENT_FILE_TOO_LARGE);
  }
  const ext = parseExtension(file.name);
  if (!isAllowedExtension(ext)) {
    throw createClientError(FRONTEND_CLIENT_ERROR.DOCUMENT_UNSUPPORTED_TYPE);
  }
};

const initUpload = async (body: UploadDocApiRequest): Promise<UploadDocApiResponse> => {
  const res = await DocumentApi.uploadDoc(body);
  if (res == null) {
    throw createClientError(FRONTEND_CLIENT_ERROR.DOCUMENT_UPLOAD_INIT_EMPTY);
  }
  return res;
};

const uploadDocument = async (params: UploadDocumentParams): Promise<string> => {
  const { file, pathTagId, onUploadInitialized, onUploadProgress } = params;
  assertDocumentUploadAllowed(file);

  const md5 = await computeFileMd5(file);
  const extension = parseExtension(file.name);

  const init = await initUpload(
    DocumentServicesMap.mapUploadDocToApi({
      filename: file.name,
      extension,
      md5,
      expectedSize: file.size,
      pathTagId,
    })
  );

  onUploadInitialized?.({
    documentId: init.documentId,
    flashUploaded: init.flashUploaded,
  });

  if (init.flashUploaded) {
    return init.documentId;
  }

  if (
    init.putUrl == null ||
    init.putUrl === '' ||
    init.callbackHeader == null ||
    init.callbackHeader === ''
  ) {
    throw createClientError(FRONTEND_CLIENT_ERROR.DOCUMENT_UPLOAD_URL_INVALID);
  }

  await putOssPresignedUrl({
    putUrl: init.putUrl,
    body: file,
    callbackHeader: init.callbackHeader,
    onProgress: onUploadProgress,
  });

  return init.documentId;
};

const listPendingDocs = async (): Promise<PendingDocItem[]> => {
  const data = await DocumentApi.listPendingDocs();
  return DocumentServicesMap.mapListPendingDocsFromApi(data);
};

const syncPendingDocStatus: IDocumentService['syncPendingDocStatus'] = async (documentId) => {
  const data = await DocumentApi.syncDocStatus({ documentId });
  return DocumentServicesMap.mapDocumentProcessStatusFromApi(data);
};

const retryPendingDoc = async (documentId: string): Promise<void> => {
  await DocumentApi.retryDocProcess({ documentId });
};

const cancelPendingDoc = async (documentId: string): Promise<void> => {
  await DocumentApi.cancelDocProcess({ documentId });
};

const getDocInfo = async (resourceId: string): Promise<DocDisplayInfoResponse> => {
  const data = await DocumentApi.getDocInfo({ resourceId });
  return DocumentServicesMap.mapGetDocInfoFromApi(data);
};

const forkDocument: IDocumentService['forkDocument'] = async (params) => {
  return DocumentApi.forkDocument(params);
};

const getOnlyOfficeEditorConfig = async (resourceId: string) => {
  return await DocumentApi.getOnlyOfficeEditorConfig({ resourceId });
};

export const createDocumentServices = (): IDocumentService => ({
  uploadDocument,
  listPendingDocs,
  syncPendingDocStatus,
  retryPendingDoc,
  cancelPendingDoc,
  getDocInfo,
  forkDocument,
  getOnlyOfficeEditorConfig,
});
