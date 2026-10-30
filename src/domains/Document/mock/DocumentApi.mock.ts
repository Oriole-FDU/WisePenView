import { mockResponse } from '@/domains/_shared/mock/response';
import { addMockResource, getMockResource } from '@/domains/Resource/mock/resourceStore';

import type { DocumentApi as DocumentApiContract } from '../apis/DocumentApi';

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
  retryDocProcess: async () => null,
  cancelDocProcess: async () => null,
  getDocInfo: ({ resourceId }) => {
    const resourceInfo = getMockResource(resourceId);
    return mockResponse({
      resourceInfo,
      documentVersionInfo: {
        version: 1,
        uploadMeta: {
          documentName: resourceInfo.resourceName,
          uploaderId: resourceInfo.ownerId,
          fileType: resourceInfo.resourceType ?? 'UNKNOWN',
          size: (resourceInfo.size ?? 1024).toString(),
          mountTargetTagId: resourceInfo.tagBinds?.[0]?.primaryTagId ?? null,
        },
        documentStatus: { status: 'READY', errorMessage: null },
        maxPreviewPages: 20,
      },
      updateTime: Date.parse('2026-03-01T00:00:00Z'),
      authorsDisplay: null,
    });
  },
  forkDocument: async ({ resourceId, forkedResourceName }) =>
    addMockResource(forkedResourceName, getMockResource(resourceId).resourceType ?? 'pdf'),
  getOnlyOfficeEditorConfig: async ({ resourceId }) => ({
    sessionId: `mock-office-${resourceId}`,
    config: null,
  }),
};
