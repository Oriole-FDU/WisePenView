import type { JavaLongApiValue } from '@/apis/api.type';
import type { ResourceItemApiResponse } from '@/domains/Resource/apis/ResourceApi.type';
import type { UserDisplayBaseApiResponse } from '@/domains/User/apis/UserApi.type';
import type { Config } from '@onlyoffice/doceditor-types';

export interface UploadDocApiRequest {
  filename: string;
  extension: string;
  md5: string;
  expectedSize: number;
  pathTagId: string;
}

export interface UploadDocApiResponse {
  documentId: string;
  putUrl: string | null;
  callbackHeader: string | null;
  objectKey: string;
  flashUploaded: boolean;
}

export interface DocumentIdApiRequest {
  documentId: string;
}

export interface GetDocInfoApiRequest {
  resourceId: string;
  targetVersion?: number;
}

export interface ForkDocumentApiRequest {
  resourceId: string;
  forkedResourceVersion?: number;
  forkedResourceName: string;
}

export interface GetOnlyOfficeEditorConfigApiRequest {
  resourceId: string;
}

export type OnlyOfficeEditorConfig = Config;

export interface OnlyOfficeEditorConfigApiResponse {
  sessionId?: string;
  config?: OnlyOfficeEditorConfig | null;
}

interface DocumentUploadMetaApiResponse {
  documentName: string;
  uploaderId?: string | number;
  fileType: string;
  size: JavaLongApiValue;
}

export interface PendingDocumentStatusApiResponse {
  status: string;
  errorMessage?: string | null;
}

export interface DocMetaInfoApiResponse {
  uploadMeta: DocumentUploadMetaApiResponse;
  documentStatus: PendingDocumentStatusApiResponse;
  maxPreviewPages: number | null;
}

interface DocumentVersionInfoApiResponse extends DocMetaInfoApiResponse {
  version: number;
}

export interface PendingDocItemApiResponse extends DocMetaInfoApiResponse {
  documentId?: string;
}

export type ListPendingDocsApiResponse = PendingDocItemApiResponse[];

export interface GetDocInfoApiResponse {
  resourceInfo: ResourceItemApiResponse;
  documentVersionInfo?: DocumentVersionInfoApiResponse;
  authorsDisplay?: Record<string, UserDisplayBaseApiResponse> | null;
}
