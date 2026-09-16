import { apiGet, apiPost } from '@/apis/request';

import type {
  DocumentIdApiRequest,
  ForkDocumentApiRequest,
  GetDocInfoApiRequest,
  GetDocInfoApiResponse,
  GetOnlyOfficeEditorConfigApiRequest,
  ListPendingDocsApiResponse,
  OnlyOfficeEditorConfigApiResponse,
  PendingDocumentStatusApiResponse,
  UploadDocApiRequest,
  UploadDocApiResponse,
} from './DocumentApi.type';

function uploadDoc(req: UploadDocApiRequest): Promise<UploadDocApiResponse> {
  return apiPost('/document/uploadDoc', req, { timeout: 30_000 });
}

function listPendingDocs(): Promise<ListPendingDocsApiResponse> {
  return apiGet('/document/listPendingDocs');
}

function syncDocStatus(req: DocumentIdApiRequest): Promise<PendingDocumentStatusApiResponse> {
  return apiPost('/document/syncDocStatus', null, { params: req });
}

function retryDocProcess(req: DocumentIdApiRequest): Promise<void> {
  return apiPost('/document/retryDocProcess', null, { params: req });
}

function cancelDocProcess(req: DocumentIdApiRequest): Promise<void> {
  return apiPost('/document/cancelDocProcess', null, { params: req });
}

function getDocInfo(req: GetDocInfoApiRequest): Promise<GetDocInfoApiResponse> {
  return apiGet('/document/getDocInfo', { params: req });
}

function forkDocument(req: ForkDocumentApiRequest): Promise<string> {
  return apiPost('/document/forkDocument', req);
}

function getOnlyOfficeEditorConfig(
  req: GetOnlyOfficeEditorConfigApiRequest
): Promise<OnlyOfficeEditorConfigApiResponse> {
  return apiGet('/document/onlyoffice/editorConfig', { params: req });
}

export const DocumentApi = {
  uploadDoc,
  listPendingDocs,
  syncDocStatus,
  retryDocProcess,
  cancelDocProcess,
  getDocInfo,
  forkDocument,
  getOnlyOfficeEditorConfig,
};
