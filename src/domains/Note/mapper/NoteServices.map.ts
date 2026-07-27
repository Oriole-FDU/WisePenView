import type {
  AddNoteApiRequest,
  GetNoteInfoApiResponse,
  SaveDrawIoSnapshotApiRequest,
} from '@/domains/Note/apis/NoteApi.type';
import { coerceResourceActions, RESOURCE_ACTION, resourceActionsInclude } from '@/domains/Resource';
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
  const authorsDisplay = data.authorsDisplay ?? {};
  const authorIds =
    data.noteInfo?.authors && data.noteInfo.authors.length > 0
      ? data.noteInfo.authors
      : Object.keys(authorsDisplay);
  const authorsById = Object.fromEntries(
    authorIds.map((authorId) => [authorId, mapAuthorDisplay(authorId, authorsDisplay[authorId])])
  );
  const lastEditedAtText = data.noteInfo?.lastUpdatedAt
    ? formatTimestampToDateTime(data.noteInfo.lastUpdatedAt)
    : '';

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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const readNumber = (value: unknown, fallback = 0): number =>
  typeof value === 'number' ? value : fallback;

const mapNoteVersionListPageFromApi = (raw: unknown): NoteVersionListPage => {
  const page = isRecord(raw) ? raw : {};
  const list = Array.isArray(page.list) ? page.list : [];

  return {
    list: list.filter(isRecord).map((item) => ({
      version: typeof item.version === 'number' ? item.version : undefined,
      type: typeof item.type === 'string' ? item.type : undefined,
      createdBy: Array.isArray(item.createdBy)
        ? item.createdBy.filter((value): value is number => typeof value === 'number')
        : undefined,
    })),
    total: readNumber(page.total),
    page: readNumber(page.page, 1),
    size: readNumber(page.size, 20),
    totalPage: readNumber(page.totalPage),
  };
};

export const NoteServicesMap = {
  mapSyncTitleRequest,
  mapCreateNoteRequest,
  mapCreateNoteFromApi,
  mapForkNoteFromApi,
  mapNoteInfoDisplayFromApi,
  mapDrawIoLatestSnapshotFromApi,
  mapSaveDrawIoSnapshotRequest,
  mapNoteVersionListPageFromApi,
};
