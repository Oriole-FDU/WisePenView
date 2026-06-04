import type { NoteInfoResponse } from '@/domains/Note';
import { coerceResourceActions, maskNoteConfigurableResourceActions } from '@/domains/Resource';
import { useNewNoteStore, useNoteSelectionStore, usePdfPreviewProgressStore } from '@/store';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';
import { NoteApi } from '../apis/NoteApi';
import { ResourceItemApi } from '../apis/ResourceApi';
import { NoteServicesMap } from '../mapper/NoteServices.map';
import type {
  CreateNoteRequest,
  CreateNoteResponse,
  DeleteNoteRequest,
  GetNoteInfoRequest,
  GetNotePermissionConfigRequest,
  INoteService,
  NoteInfoDisplayData,
  NotePermissionConfig,
  SyncTitleRequest,
} from './index.type';

// syncTitle是一个resource的工作，但是语义上属于note服务
const syncTitle = async (params: SyncTitleRequest): Promise<void> => {
  const payload = NoteServicesMap.mapSyncTitleRequest(params);
  await ResourceItemApi.renameResource(payload);
};

const createNote = async (params: CreateNoteRequest): Promise<CreateNoteResponse> => {
  const resourceId = await NoteApi.addNote(params);
  return NoteServicesMap.mapCreateNoteFromApi(resourceId);
};

const deleteNote = async (params: DeleteNoteRequest): Promise<void> => {
  await ResourceItemApi.removeResources({ resourceIds: params.resourceIds });
  for (const resourceId of params.resourceIds) {
    // 资源已删除，同步清理与之绑定的临时状态
    usePdfPreviewProgressStore.getState().removeProgress(resourceId);
    useNewNoteStore.getState().clearNewNoteResourceId(resourceId);
    useNoteSelectionStore.getState().clearSelectedText(resourceId);
  }
};

const getNoteInfoDisplay = async (params: GetNoteInfoRequest): Promise<NoteInfoDisplayData> => {
  const noteInfoData = await NoteApi.getNoteInfo(params);
  if (!noteInfoData?.resourceInfo || !noteInfoData?.noteInfo) {
    throw createClientError(FRONTEND_CLIENT_ERROR.NOTE_NOT_FOUND);
  }
  return NoteServicesMap.mapNoteInfoDisplayFromApi(noteInfoData);
};

const getNotePermissionConfig = async (
  params: GetNotePermissionConfigRequest
): Promise<NotePermissionConfig> => {
  const noteInfoData = (await NoteApi.getNoteInfo(params)) as NoteInfoResponse;
  if (!noteInfoData?.resourceInfo) {
    throw createClientError(FRONTEND_CLIENT_ERROR.NOTE_NOT_FOUND);
  }
  const { resourceInfo } = noteInfoData;
  const overrideGrantedActions = maskNoteConfigurableResourceActions(
    coerceResourceActions(resourceInfo.overrideGrantedActions as unknown[] | undefined)
  );
  const specifiedUsersGrantedActions = resourceInfo.specifiedUsersGrantedActions
    ? Object.fromEntries(
        Object.entries(resourceInfo.specifiedUsersGrantedActions).map(([userId, actions]) => [
          userId,
          maskNoteConfigurableResourceActions(coerceResourceActions(actions as unknown[])),
        ])
      )
    : null;

  return {
    resourceId: resourceInfo.resourceId || params.resourceId,
    overrideGrantedActions: overrideGrantedActions.length > 0 ? overrideGrantedActions : null,
    specifiedUsersGrantedActions:
      specifiedUsersGrantedActions && Object.keys(specifiedUsersGrantedActions).length > 0
        ? specifiedUsersGrantedActions
        : null,
  };
};

export const createNoteServices = (): INoteService => ({
  syncTitle,
  createNote,
  deleteNote,
  getNoteInfoDisplay,
  getNotePermissionConfig,
});
