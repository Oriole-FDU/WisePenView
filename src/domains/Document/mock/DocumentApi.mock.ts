import { mockResponse } from '@/domains/_shared/mock/response';
import { addMockResource, getMockResource } from '@/domains/Resource/mock/resourceStore';

import type { DocumentApi as DocumentApiContract } from '../apis/DocumentApi';
import type { OnlyOfficeEditorConfigApiResponse } from '../apis/DocumentApi.type';

export const DocumentApi: typeof DocumentApiContract = {
  uploadDoc: async ({ filename, extension, mountTargetTagId, expectedSize }) => {
    const documentId = addMockResource(filename, extension, mountTargetTagId);
    getMockResource(documentId).size = expectedSize.toString();
    return {
      documentId,
      objectKey: `mock/${documentId}`,
      putUrl: null,
      callbackHeader: null,
      flashUploaded: true,
    };
  },
  listPendingDocs: async () => [],
  syncDocStatus: async () => ({ status: 'READY', errorMessage: null }),
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
          fileType: resourceInfo.resourceType ?? 'PDF',
          size: (resourceInfo.size ?? 1024).toString(),
        },
        documentStatus: { status: 'SUCCESS', errorMessage: null },
        maxPreviewPages: 20,
      },
      updateTime: Date.now(),
      authorsDisplay: {},
    });
  },
  forkDocument: async ({ resourceId, forkedResourceName }) =>
    addMockResource(forkedResourceName, getMockResource(resourceId).resourceType ?? 'pdf'),
  getOnlyOfficeEditorConfig: async ({ resourceId }) => ({
    sessionId: `mock-office-${resourceId}`,
    config: {} as OnlyOfficeEditorConfigApiResponse['config'],
  }),
};
