import { executeApiContract } from '@/apis/executeApiContract';

import {
  CancelDocProcessApiContract,
  type CancelDocProcessApiContractRequest,
  type CancelDocProcessApiContractResponse,
  ForkDocumentApiContract,
  type ForkDocumentApiContractRequest,
  type ForkDocumentApiContractResponse,
  GetDocInfoApiContract,
  type GetDocInfoApiContractRequest,
  type GetDocInfoApiContractResponse,
  GetOnlyOfficeEditorConfigApiContract,
  type GetOnlyOfficeEditorConfigApiContractRequest,
  type GetOnlyOfficeEditorConfigApiContractResponse,
  ListPendingDocsApiContract,
  type ListPendingDocsApiContractResponse,
  RetryDocProcessApiContract,
  type RetryDocProcessApiContractRequest,
  type RetryDocProcessApiContractResponse,
  SyncDocStatusApiContract,
  type SyncDocStatusApiContractRequest,
  type SyncDocStatusApiContractResponse,
  UploadDocApiContract,
  type UploadDocApiContractRequest,
  type UploadDocApiContractResponse,
} from './DocumentApi.contract';

function uploadDoc(req: UploadDocApiContractRequest): Promise<UploadDocApiContractResponse> {
  return executeApiContract(UploadDocApiContract, req, { timeout: 30_000 });
}

function listPendingDocs(): Promise<ListPendingDocsApiContractResponse> {
  return executeApiContract(ListPendingDocsApiContract, undefined);
}

function syncDocStatus(
  req: SyncDocStatusApiContractRequest
): Promise<SyncDocStatusApiContractResponse> {
  return executeApiContract(SyncDocStatusApiContract, req);
}

function retryDocProcess(
  req: RetryDocProcessApiContractRequest
): Promise<RetryDocProcessApiContractResponse> {
  return executeApiContract(RetryDocProcessApiContract, req);
}

function cancelDocProcess(
  req: CancelDocProcessApiContractRequest
): Promise<CancelDocProcessApiContractResponse> {
  return executeApiContract(CancelDocProcessApiContract, req);
}

function getDocInfo(req: GetDocInfoApiContractRequest): Promise<GetDocInfoApiContractResponse> {
  return executeApiContract(GetDocInfoApiContract, req);
}

function forkDocument(
  req: ForkDocumentApiContractRequest
): Promise<ForkDocumentApiContractResponse> {
  return executeApiContract(ForkDocumentApiContract, req);
}

function getOnlyOfficeEditorConfig(
  req: GetOnlyOfficeEditorConfigApiContractRequest
): Promise<GetOnlyOfficeEditorConfigApiContractResponse> {
  return executeApiContract(GetOnlyOfficeEditorConfigApiContract, req);
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
