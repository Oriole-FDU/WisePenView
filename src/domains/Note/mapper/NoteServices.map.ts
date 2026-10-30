import {
  parseResourceActions,
  RESOURCE_ACTION,
  resourceActionsInclude,
} from '@/domains/_shared/access';
import type {
  AddNoteApiContractRequest,
  GetDrawIoLatestSnapshotApiContractResponse,
  GetNoteInfoApiContractResponse,
  ListNoteVersionsApiContractResponse,
  SaveDrawIoSnapshotApiContractRequest,
} from '@/domains/Note/apis/NoteApi.contract';
import type { ResourcePermissionOverview } from '@/domains/Resource';
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

const mapCreateNoteRequest = (params: CreateNoteRequest): AddNoteApiContractRequest => ({
  title: params.title,
  ...(params.resourceType ? { resourceType: params.resourceType } : {}),
  ...(params.pathTagId ? { mountTargetTagId: params.pathTagId } : {}),
});

const mapForkNoteFromApi = (resourceId: string): ForkNoteResponse => ({
  resourceId: resourceId || undefined,
});

const mapAuthorDisplay = (
  authorId: string,
  author:
    | {
        nickname?: string | null;
        realName?: string | null;
        avatar?: string | null;
      }
    | null
    | undefined
): NoteInfoDisplayAuthor => ({
  id: normalizeId(authorId),
  name: author?.nickname || author?.realName || normalizeId(authorId),
  avatar: author?.avatar ?? undefined,
});

const mapNoteInfoDisplayFromApi = (data: GetNoteInfoApiContractResponse): NoteInfoDisplayData => {
  const resourceInfo = ResourceServicesMap.mapResourceItemFromApi(data.resourceInfo);
  const ownerId = normalizeId(resourceInfo.ownerId) || undefined;
  const currentActions = parseResourceActions(resourceInfo.currentActions);
  const canCollaborativeEdit = resourceActionsInclude(currentActions, RESOURCE_ACTION.EDIT);
  const authorsDisplay = data.authorsDisplay ?? {};
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
  data: GetNoteInfoApiContractResponse,
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
  raw: GetDrawIoLatestSnapshotApiContractResponse,
  _fallbackResourceId: string
): DrawIoLatestSnapshotData => ({
  resourceId: raw.resourceId,
  version: raw.version,
  fullSnapshot: raw.fullSnapshot,
  deltas: raw.deltas,
});

const mapSaveDrawIoSnapshotRequest = (
  params: SaveDrawIoSnapshotRequest
): SaveDrawIoSnapshotApiContractRequest => ({
  resourceId: params.resourceId,
  version: params.version,
  data: encodeBase64Utf8(params.xml),
  plainText: params.plainText,
});

const mapNoteVersionListPageFromApi = (
  data: ListNoteVersionsApiContractResponse
): NoteVersionListPage => data;

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
