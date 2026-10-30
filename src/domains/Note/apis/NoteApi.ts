import { executeApiContract } from '@/apis/executeApiContract';

import {
  AddNoteApiContract,
  type AddNoteApiContractRequest,
  type AddNoteApiContractResponse,
  ForkNoteApiContract,
  type ForkNoteApiContractRequest,
  type ForkNoteApiContractResponse,
  GetDrawIoLatestSnapshotApiContract,
  type GetDrawIoLatestSnapshotApiContractRequest,
  type GetDrawIoLatestSnapshotApiContractResponse,
  GetNoteInfoApiContract,
  type GetNoteInfoApiContractRequest,
  type GetNoteInfoApiContractResponse,
  ListNoteVersionsApiContract,
  type ListNoteVersionsApiContractRequest,
  type ListNoteVersionsApiContractResponse,
  SaveDrawIoSnapshotApiContract,
  type SaveDrawIoSnapshotApiContractRequest,
  type SaveDrawIoSnapshotApiContractResponse,
} from './NoteApi.contract';

function addNote(req: AddNoteApiContractRequest): Promise<AddNoteApiContractResponse> {
  return executeApiContract(AddNoteApiContract, req);
}

function getNoteInfo(req: GetNoteInfoApiContractRequest): Promise<GetNoteInfoApiContractResponse> {
  return executeApiContract(GetNoteInfoApiContract, req);
}

function getDrawIoLatestSnapshot(
  req: GetDrawIoLatestSnapshotApiContractRequest
): Promise<GetDrawIoLatestSnapshotApiContractResponse> {
  return executeApiContract(GetDrawIoLatestSnapshotApiContract, req);
}

function saveDrawIoSnapshot(
  req: SaveDrawIoSnapshotApiContractRequest
): Promise<SaveDrawIoSnapshotApiContractResponse> {
  return executeApiContract(SaveDrawIoSnapshotApiContract, req);
}

function forkNote(req: ForkNoteApiContractRequest): Promise<ForkNoteApiContractResponse> {
  return executeApiContract(ForkNoteApiContract, req);
}

function listNoteVersions(
  req: ListNoteVersionsApiContractRequest
): Promise<ListNoteVersionsApiContractResponse> {
  return executeApiContract(ListNoteVersionsApiContract, req);
}

export const NoteApi = {
  addNote,
  getNoteInfo,
  getDrawIoLatestSnapshot,
  saveDrawIoSnapshot,
  forkNote,
  listNoteVersions,
};
