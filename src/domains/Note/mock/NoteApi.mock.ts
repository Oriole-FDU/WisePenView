import { addMockResource, getMockResource } from '@/domains/Resource/mock/resourceStore';
import { mockPage, mockResponse } from '@/domains/_shared/mock/response';
import type { NoteApi as NoteApiContract } from '../apis/NoteApi';
import type { GetDrawIoLatestSnapshotApiResponse } from '../apis/NoteApi.type';

const snapshots = new Map<string, GetDrawIoLatestSnapshotApiResponse>();
export const NoteApi: typeof NoteApiContract = {
  addNote: async ({ title, resourceType, mountTargetTagId }) =>
    addMockResource(title, resourceType ?? 'NOTE', mountTargetTagId),
  getNoteInfo: ({ resourceId }) =>
    mockResponse({
      resourceInfo: getMockResource(resourceId),
      version: 0,
      noteInfo: { authors: ['1'], lastUpdatedAt: '2026-03-01T00:00:00Z' },
      authorsDisplay: { '1': { nickname: '示例用户' } },
    }),
  getDrawIoLatestSnapshot: ({ resourceId }) =>
    mockResponse(
      snapshots.get(resourceId) ?? { resourceId, version: 0, fullSnapshot: null, deltas: null }
    ),
  saveDrawIoSnapshot: async ({ resourceId, version, data }) => {
    snapshots.set(resourceId, { resourceId, version, fullSnapshot: data, deltas: null });
  },
  forkNote: async ({ resourceId, forkedResourceName }) => {
    const source = getMockResource(resourceId);
    return addMockResource(
      forkedResourceName ?? source.resourceName,
      source.resourceType ?? 'NOTE'
    );
  },
  listNoteVersions: (params) => mockResponse(mockPage([], params)),
};
