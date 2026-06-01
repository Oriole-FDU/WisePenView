import type { DocumentResourceType } from '@/domains/Document';
import type { ResourceItem } from '@/domains/Resource';

export interface UploadDocApiRequest {
  filename: string;
  extension: string;
  md5: string;
  expectedSize: number;
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

export interface DocMetaInfo {
  uploadMeta: DocumentUploadMeta;
  documentStatus: PendingDocumentStatus;
  maxPreviewPages: number | null;
}

export interface PendingDocItemApiResponse extends DocMetaInfo {
  documentId?: string;
}

export type ListPendingDocsApiResponse = PendingDocItemApiResponse[];

export interface GetDocInfoApiResponse {
  docMetaInfo: DocMetaInfo;
  resourceInfo: ResourceItem;
}
