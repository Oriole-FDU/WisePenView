import type { IResourceService } from '@/domains/Resource';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';
import { NoteApi } from '@domain-apis';
import { NoteServicesMap } from '../mapper/NoteServices.map';
import type {
  CreateNoteRequest,
  CreateNoteResponse,
  DrawIoLatestSnapshotData,
  ForkNoteRequest,
  ForkNoteResponse,
  GetDrawIoLatestSnapshotRequest,
  GetNoteInfoRequest,
  INoteService,
  ListNoteVersionsRequest,
  NoteInfoDisplayData,
  NoteVersionListPage,
  SaveDrawIoSnapshotRequest,
  SyncTitleRequest,
} from './index.type';

interface NoteServicesDeps {
  resourceService: IResourceService;
}

const createNote = async (params: CreateNoteRequest): Promise<CreateNoteResponse> => {
  const resourceId = await NoteApi.addNote(NoteServicesMap.mapCreateNoteRequest(params));
  return NoteServicesMap.mapCreateNoteFromApi(resourceId);
};

const getNoteInfoDisplay = async (params: GetNoteInfoRequest): Promise<NoteInfoDisplayData> => {
  const noteInfoData = await NoteApi.getNoteInfo(params);
  if (!noteInfoData?.resourceInfo) {
    throw createClientError(FRONTEND_CLIENT_ERROR.NOTE_NOT_FOUND);
  }
  return NoteServicesMap.mapNoteInfoDisplayFromApi(noteInfoData);
};

const getDrawIoLatestSnapshot = async (
  params: GetDrawIoLatestSnapshotRequest
): Promise<DrawIoLatestSnapshotData> => {
  const data = await NoteApi.getDrawIoLatestSnapshot(params);
  return NoteServicesMap.mapDrawIoLatestSnapshotFromApi(data, params.resourceId);
};

const getNotePermissionOverview: INoteService['getNotePermissionOverview'] = async (resourceId) => {
  const data = await NoteApi.getNoteInfo({ resourceId });
  return NoteServicesMap.mapNotePermissionOverviewFromApi(data, resourceId);
};

const saveDrawIoSnapshot = async (params: SaveDrawIoSnapshotRequest): Promise<void> => {
  await NoteApi.saveDrawIoSnapshot(NoteServicesMap.mapSaveDrawIoSnapshotRequest(params));
};

const forkNote = async (params: ForkNoteRequest): Promise<ForkNoteResponse> => {
  const resourceId = await NoteApi.forkNote(params);
  return NoteServicesMap.mapForkNoteFromApi(resourceId);
};

const listNoteVersions = async (params: ListNoteVersionsRequest): Promise<NoteVersionListPage> => {
  const data = await NoteApi.listNoteVersions(params);
  return NoteServicesMap.mapNoteVersionListPageFromApi(data);
};

export const createNoteServices = (deps: NoteServicesDeps): INoteService => {
  const { resourceService } = deps;

  // syncTitle 是 resource 的工作，但语义上属于 note 服务
  const syncTitle = async (params: SyncTitleRequest): Promise<void> => {
    const payload = NoteServicesMap.mapSyncTitleRequest(params);
    await resourceService.renameResource(payload);
  };

  return {
    syncTitle,
    createNote,
    getNoteInfoDisplay,
    getNotePermissionOverview,
    getDrawIoLatestSnapshot,
    saveDrawIoSnapshot,
    forkNote,
    listNoteVersions,
  };
};
