import { addMockResource, getMockResource } from '@/domains/Resource/mock/resourceStore';
import { mockResponse } from '@/domains/_shared/mock/response';
import type { DocumentApi as DocumentApiContract } from '../apis/DocumentApi';

export const DocumentApi: typeof DocumentApiContract = {
  uploadDoc: async ({ filename, extension, mountTargetTagId, expectedSize }) => {
    const documentId = addMockResource(filename, extension, mountTargetTagId);
    getMockResource(documentId).size = expectedSize;
    return {
      documentId,
      objectKey: `mock/${documentId}`,
      putUrl: null,
      callbackHeader: null,
      flashUploaded: true,
    };
  },
  listPendingDocs: async () => [],
  syncDocStatus: async () => ({ status: 'READY' }),
  retryDocProcess: async () => undefined,
  cancelDocProcess: async () => undefined,
  getDocInfo: ({ resourceId }) => {
    const resourceInfo = getMockResource(resourceId);
    return mockResponse({
      resourceInfo,
      documentVersionInfo: {
        version: 1,
        uploadMeta: {
          documentName: resourceInfo.resourceName,
          uploaderId: resourceInfo.ownerId,
          fileType: resourceInfo.resourceType ?? 'pdf',
          size: resourceInfo.size ?? 1024,
        },
        documentStatus: { status: 'SUCCESS' },
        maxPreviewPages: 20,
      },
    });
  },
  forkDocument: async ({ resourceId, forkedResourceName }) =>
    addMockResource(forkedResourceName, getMockResource(resourceId).resourceType ?? 'pdf'),
  getOnlyOfficeEditorConfig: async ({ resourceId }) => ({
    sessionId: `mock-office-${resourceId}`,
    config: null,
  }),
};
