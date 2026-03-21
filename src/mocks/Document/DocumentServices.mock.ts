import type { IDocumentService, UploadDocumentParams, UploadDocumentResult } from '@/services/Document';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const uploadDocument = async (params: UploadDocumentParams): Promise<UploadDocumentResult> => {
  await delay(400);
  const name = params.file.name.replace(/\s+/g, '-');
  return {
    documentId: `mock-doc-${Date.now()}`,
    objectKey: `mock/private/doc/${Date.now()}-${name}`,
    flashUploaded: false,
  };
};

const retryConvert = async (_documentId: string): Promise<void> => {
  await delay(200);
};

const deleteDocument = async (_documentId: string): Promise<void> => {
  await delay(200);
};

const getDocumentPreviewUrl = (resourceId: string): string => {
  const path = `/api/document/${encodeURIComponent(resourceId)}/preview`;
  return new URL(path, window.location.origin).href;
};

export const DocumentServicesMock: IDocumentService = {
  uploadDocument,
  retryConvert,
  deleteDocument,
  getDocumentPreviewUrl,
};
