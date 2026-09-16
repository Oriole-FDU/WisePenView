import { apiGet, apiPost } from '@/apis/request';

import type {
  AddNoteApiRequest,
  AddNoteApiResponse,
  ForkNoteApiRequest,
  GetDrawIoLatestSnapshotApiRequest,
  GetDrawIoLatestSnapshotApiResponse,
  GetNoteInfoApiRequest,
  GetNoteInfoApiResponse,
  ListNoteVersionsApiRequest,
  SaveDrawIoSnapshotApiRequest,
} from './NoteApi.type';

function addNote(req: AddNoteApiRequest): Promise<AddNoteApiResponse> {
  return apiPost('/note/addNote', req);
}

function getNoteInfo(req: GetNoteInfoApiRequest): Promise<GetNoteInfoApiResponse> {
  return apiGet('/note/getNoteInfo', { params: req });
}

function getDrawIoLatestSnapshot(
  req: GetDrawIoLatestSnapshotApiRequest
): Promise<GetDrawIoLatestSnapshotApiResponse> {
  return apiGet('/note/getDrawIOLatestVersion', { params: req });
}

function saveDrawIoSnapshot(req: SaveDrawIoSnapshotApiRequest): Promise<void> {
  return apiPost('/note/saveDrawIOSnapshot', req);
}

function forkNote(req: ForkNoteApiRequest): Promise<string> {
  return apiPost('/note/forkNote', req);
}

function listNoteVersions(req: ListNoteVersionsApiRequest): Promise<unknown> {
  return apiGet('/note/listNoteVersions', { params: req });
}

export const NoteApi = {
  addNote,
  getNoteInfo,
  getDrawIoLatestSnapshot,
  saveDrawIoSnapshot,
  forkNote,
  listNoteVersions,
};
