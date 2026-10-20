import type {
  AddNoteApiRequest,
  GetNoteInfoApiResponse,
  ListNoteVersionsApiResponse,
  SaveDrawIoSnapshotApiRequest,
} from '@/domains/Note/apis/NoteApi.type';
import {
  coerceResourceActions,
  RESOURCE_ACTION,
  resourceActionsInclude,
  type ResourcePermissionOverview,
} from '@/domains/Resource';
import { ResourceServicesMap } from '@/domains/Resource/mapper/ResourceServices.map';
import { formatTimestampToDateTime } from '@/utils/format/formatTime';
import { normalizeId } from '@/utils/normalize/normalizeId';

import type {
  CreateNoteRequest,
  CreateNoteResponse,
  DrawIoLatestSnapshotData,
  ForkNoteResponse,
  NoteInfoDisplayAuthor,
  NoteInfoDisplayData,
  NoteVersionListPage,
  SaveDrawIoSnapshotRequest,
  SyncTitleRequest,
} from '../service/index.type';

const mapSyncTitleRequest = (
  params: SyncTitleRequest
): { resourceId: string; newName: string } => ({
  resourceId: params.resourceId,
  newName: params.newName,
});

const mapCreateNoteFromApi = (resourceId: string): CreateNoteResponse => ({
  resourceId: resourceId || undefined,
});

const mapCreateNoteRequest = (params: CreateNoteRequest): AddNoteApiRequest => ({
  title: params.title,
  ...(params.resourceType ? { resourceType: params.resourceType } : {}),
  ...(params.pathTagId ? { mountTargetTagId: params.pathTagId } : {}),
});

const mapForkNoteFromApi = (resourceId: string): ForkNoteResponse => ({
  resourceId: resourceId || undefined,
});

const mapAuthorDisplay = (
  authorId: string,
  author?: {
    nickname?: string | null;
    realName?: string | null;
    avatar?: string | null;
  }
): NoteInfoDisplayAuthor => ({
  id: normalizeId(authorId),
  name: author?.nickname || author?.realName || normalizeId(authorId),
  avatar: author?.avatar ?? undefined,
});

const mapNoteInfoDisplayFromApi = (data: GetNoteInfoApiResponse): NoteInfoDisplayData => {
  const resourceInfo = ResourceServicesMap.mapResourceItemFromApi(data.resourceInfo);
  const ownerId = normalizeId(resourceInfo.ownerId) || undefined;
  const currentActions = coerceResourceActions(
    resourceInfo.currentActions as unknown[] | undefined
  );
  const canCollaborativeEdit = resourceActionsInclude(currentActions, RESOURCE_ACTION.EDIT);
  const authorsDisplay = data.authorsDisplay;
  const authorIds = Object.keys(authorsDisplay);
  const authorsById = Object.fromEntries(
    authorIds.map((authorId) => [authorId, mapAuthorDisplay(authorId, authorsDisplay[authorId])])
  );
  const lastEditedAtText = formatTimestampToDateTime(data.updateTime);

  return {
    noteTitle: resourceInfo.resourceName,
    ownerId,
    authors: authorIds.map((authorId) => authorsById[authorId]),
    lastEditedAtText,
    resourceInfo,
    version: data.version,
    canCollaborativeEdit,
  };
};

const mapNotePermissionOverviewFromApi = (
  data: GetNoteInfoApiResponse,
  resourceId: string
): ResourcePermissionOverview =>
  ResourceServicesMap.mapResourcePermissionOverviewFromApi(data.resourceInfo, resourceId);

const encodeBase64Utf8 = (value: string): string => {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return window.btoa(binary);
};

const mapDrawIoLatestSnapshotFromApi = (
  raw: Partial<DrawIoLatestSnapshotData> | null | undefined,
  fallbackResourceId: string
): DrawIoLatestSnapshotData => ({
  resourceId: raw?.resourceId || fallbackResourceId,
  version: raw?.version ?? 0,
  fullSnapshot: raw?.fullSnapshot ?? null,
  deltas: raw?.deltas ?? null,
});

const mapSaveDrawIoSnapshotRequest = (
  params: SaveDrawIoSnapshotRequest
): SaveDrawIoSnapshotApiRequest => ({
  resourceId: params.resourceId,
  version: params.version,
  data: encodeBase64Utf8(params.xml),
  plainText: params.plainText,
});

const mapNoteVersionListPageFromApi = (data: ListNoteVersionsApiResponse): NoteVersionListPage => {
  return {
    list: data.list.map((item) => ({
      version: item.version,
      type: item.type,
      createdBy: item.createdBy ?? undefined,
    })),
    total: data.total,
    page: data.page,
    size: data.size,
    totalPage: data.totalPage,
  };
};

export const NoteServicesMap = {
  mapSyncTitleRequest,
  mapCreateNoteRequest,
  mapCreateNoteFromApi,
  mapForkNoteFromApi,
  mapNoteInfoDisplayFromApi,
  mapNotePermissionOverviewFromApi,
  mapDrawIoLatestSnapshotFromApi,
  mapSaveDrawIoSnapshotRequest,
  mapNoteVersionListPageFromApi,
};
