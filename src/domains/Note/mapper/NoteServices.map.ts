import {
  parseResourceActions,
  RESOURCE_ACTION,
  resourceActionsInclude,
} from '@/domains/_shared/access';
import type {
  AddNoteApiContractRequest,
  GetNoteInfoApiContractResponse,
  SaveDrawIoSnapshotApiContractRequest,
} from '@/domains/Note/apis/NoteApi.contract';
import { ResourceServicesMap } from '@/domains/Resource/mapper/ResourceServices.map';
import { formatTimestampToDateTime } from '@/utils/format/formatTime';
import { normalizeId } from '@/utils/normalize/normalizeId';

import type {
  CreateNoteRequest,
  NoteInfoDisplayAuthor,
  NoteInfoDisplayData,
  SaveDrawIoSnapshotRequest,
} from '../service/index.type';

const mapCreateNoteRequest = (params: CreateNoteRequest): AddNoteApiContractRequest => ({
  title: params.title,
  ...(params.resourceType ? { resourceType: params.resourceType } : {}),
  ...(params.pathTagId ? { mountTargetTagId: params.pathTagId } : {}),
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

const encodeBase64Utf8 = (value: string): string => {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return window.btoa(binary);
};

const mapSaveDrawIoSnapshotRequest = (
  params: SaveDrawIoSnapshotRequest
): SaveDrawIoSnapshotApiContractRequest => ({
  resourceId: params.resourceId,
  version: params.version,
  data: encodeBase64Utf8(params.xml),
  plainText: params.plainText,
});

export const NoteServicesMap = {
  mapCreateNoteRequest,
  mapNoteInfoDisplayFromApi,
  mapSaveDrawIoSnapshotRequest,
};
