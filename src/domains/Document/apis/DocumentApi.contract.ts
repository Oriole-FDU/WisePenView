import {
  type ApiContractRequest,
  type ApiContractResponse,
  defineApiContract,
} from '@/apis/contract';
import { EmptyApiRequestSchema, EmptyApiResponseSchema } from '@/apis/schema';

import {
  DocumentIdApiRequestSchema,
  ForkDocumentApiRequestSchema,
  ForkDocumentApiResponseSchema,
  GetDocInfoApiRequestSchema,
  GetDocInfoApiResponseSchema,
  GetOnlyOfficeEditorConfigApiRequestSchema,
  GetOnlyOfficeEditorConfigApiResponseSchema,
  ListPendingDocsApiResponseSchema,
  SyncDocStatusApiResponseSchema,
  UploadDocApiRequestSchema,
  UploadDocApiResponseSchema,
} from './DocumentApi.schema';

export const UploadDocApiContract = defineApiContract({
  name: 'UploadDocApi',
  method: 'POST',
  endpoint: '/document/uploadDoc',
  requestPlacement: 'body',
  transport: 'json',
  request: UploadDocApiRequestSchema,
  response: UploadDocApiResponseSchema,
});

export const ListPendingDocsApiContract = defineApiContract({
  name: 'ListPendingDocsApi',
  method: 'GET',
  endpoint: '/document/listPendingDocs',
  requestPlacement: 'none',
  transport: 'json',
  request: EmptyApiRequestSchema,
  response: ListPendingDocsApiResponseSchema,
});

export const SyncDocStatusApiContract = defineApiContract({
  name: 'SyncDocStatusApi',
  method: 'POST',
  endpoint: '/document/syncDocStatus',
  requestPlacement: 'query',
  transport: 'json',
  request: DocumentIdApiRequestSchema,
  response: SyncDocStatusApiResponseSchema,
});

export const RetryDocProcessApiContract = defineApiContract({
  name: 'RetryDocProcessApi',
  method: 'POST',
  endpoint: '/document/retryDocProcess',
  requestPlacement: 'query',
  transport: 'json',
  request: DocumentIdApiRequestSchema,
  response: EmptyApiResponseSchema,
});

export const CancelDocProcessApiContract = defineApiContract({
  name: 'CancelDocProcessApi',
  method: 'POST',
  endpoint: '/document/cancelDocProcess',
  requestPlacement: 'query',
  transport: 'json',
  request: DocumentIdApiRequestSchema,
  response: EmptyApiResponseSchema,
});

export const GetDocInfoApiContract = defineApiContract({
  name: 'GetDocInfoApi',
  method: 'GET',
  endpoint: '/document/getDocInfo',
  requestPlacement: 'query',
  transport: 'json',
  request: GetDocInfoApiRequestSchema,
  response: GetDocInfoApiResponseSchema,
});

export const ForkDocumentApiContract = defineApiContract({
  name: 'ForkDocumentApi',
  method: 'POST',
  endpoint: '/document/forkDocument',
  requestPlacement: 'body',
  transport: 'json',
  request: ForkDocumentApiRequestSchema,
  response: ForkDocumentApiResponseSchema,
});

export const GetOnlyOfficeEditorConfigApiContract = defineApiContract({
  name: 'GetOnlyOfficeEditorConfigApi',
  method: 'GET',
  endpoint: '/document/onlyoffice/editorConfig',
  requestPlacement: 'query',
  transport: 'json',
  request: GetOnlyOfficeEditorConfigApiRequestSchema,
  response: GetOnlyOfficeEditorConfigApiResponseSchema,
});

export type UploadDocApiContractRequest = ApiContractRequest<typeof UploadDocApiContract>;
export type UploadDocApiContractResponse = ApiContractResponse<typeof UploadDocApiContract>;
export type ListPendingDocsApiContractResponse = ApiContractResponse<
  typeof ListPendingDocsApiContract
>;
export type SyncDocStatusApiContractRequest = ApiContractRequest<typeof SyncDocStatusApiContract>;
export type SyncDocStatusApiContractResponse = ApiContractResponse<typeof SyncDocStatusApiContract>;
export type RetryDocProcessApiContractRequest = ApiContractRequest<
  typeof RetryDocProcessApiContract
>;
export type RetryDocProcessApiContractResponse = ApiContractResponse<
  typeof RetryDocProcessApiContract
>;
export type CancelDocProcessApiContractRequest = ApiContractRequest<
  typeof CancelDocProcessApiContract
>;
export type CancelDocProcessApiContractResponse = ApiContractResponse<
  typeof CancelDocProcessApiContract
>;
export type GetDocInfoApiContractRequest = ApiContractRequest<typeof GetDocInfoApiContract>;
export type GetDocInfoApiContractResponse = ApiContractResponse<typeof GetDocInfoApiContract>;
export type ForkDocumentApiContractRequest = ApiContractRequest<typeof ForkDocumentApiContract>;
export type ForkDocumentApiContractResponse = ApiContractResponse<typeof ForkDocumentApiContract>;
export type GetOnlyOfficeEditorConfigApiContractRequest = ApiContractRequest<
  typeof GetOnlyOfficeEditorConfigApiContract
>;
export type GetOnlyOfficeEditorConfigApiContractResponse = ApiContractResponse<
  typeof GetOnlyOfficeEditorConfigApiContract
>;
