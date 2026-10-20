import { mockPage, mockResponse } from '@/domains/_shared/mock/response';
import { createMockUserDisplay } from '@/domains/_shared/mock/userDisplay';
import { addMockResource, getMockResource } from '@/domains/Resource/mock/resourceStore';

import type { NoteApi as NoteApiContract } from '../apis/NoteApi';
import type {
  GetDrawIoLatestSnapshotApiResponse,
  ListNoteVersionsApiResponse,
} from '../apis/NoteApi.type';

const snapshots = new Map<string, GetDrawIoLatestSnapshotApiResponse>();
export const NoteApi: typeof NoteApiContract = {
  addNote: async ({ title, resourceType, mountTargetTagId }) =>
    addMockResource(title, resourceType ?? 'NOTE', mountTargetTagId),
  getNoteInfo: ({ resourceId }) =>
    mockResponse({
      resourceInfo: getMockResource(resourceId),
      version: 0,
      updateTime: Date.parse('2026-03-01T00:00:00Z'),
      authorsDisplay: { '1': createMockUserDisplay() },
    }),
  getDrawIoLatestSnapshot: ({ resourceId }) =>
    mockResponse(
      snapshots.get(resourceId) ?? { resourceId, version: 0, fullSnapshot: null, deltas: [] }
    ),
  saveDrawIoSnapshot: async ({ resourceId, version, data }) => {
    snapshots.set(resourceId, { resourceId, version, fullSnapshot: data, deltas: [] });
  },
  forkNote: async ({ resourceId, forkedResourceName }) => {
    const source = getMockResource(resourceId);
    return addMockResource(
      forkedResourceName ?? source.resourceName,
      source.resourceType ?? 'NOTE'
    );
  },
  listNoteVersions: (params): Promise<ListNoteVersionsApiResponse> =>
    mockResponse(mockPage([], params)),
};
