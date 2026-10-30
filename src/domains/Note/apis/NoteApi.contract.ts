import {
  type ApiContractRequest,
  type ApiContractResponse,
  defineApiContract,
} from '@/apis/contract';
import { EmptyApiResponseSchema } from '@/apis/schema';

import {
  AddNoteApiRequestSchema,
  AddNoteApiResponseSchema,
  ForkNoteApiRequestSchema,
  ForkNoteApiResponseSchema,
  GetDrawIoLatestSnapshotApiRequestSchema,
  GetDrawIoLatestSnapshotApiResponseSchema,
  GetNoteInfoApiRequestSchema,
  ListNoteVersionsApiRequestSchema,
  ListNoteVersionsApiResponseSchema,
  NoteInfoApiResponseSchema,
  SaveDrawIoSnapshotApiRequestSchema,
} from './NoteApi.schema';

export const AddNoteApiContract = defineApiContract({
  name: 'AddNoteApi',
  method: 'POST',
  endpoint: '/note/addNote',
  requestPlacement: 'body',
  transport: 'json',
  request: AddNoteApiRequestSchema,
  response: AddNoteApiResponseSchema,
});

export const GetNoteInfoApiContract = defineApiContract({
  name: 'GetNoteInfoApi',
  method: 'GET',
  endpoint: '/note/getNoteInfo',
  requestPlacement: 'query',
  transport: 'json',
  request: GetNoteInfoApiRequestSchema,
  response: NoteInfoApiResponseSchema,
});

export const GetDrawIoLatestSnapshotApiContract = defineApiContract({
  name: 'GetDrawIoLatestSnapshotApi',
  method: 'GET',
  endpoint: '/note/getDrawIOLatestVersion',
  requestPlacement: 'query',
  transport: 'json',
  request: GetDrawIoLatestSnapshotApiRequestSchema,
  response: GetDrawIoLatestSnapshotApiResponseSchema,
});

export const SaveDrawIoSnapshotApiContract = defineApiContract({
  name: 'SaveDrawIoSnapshotApi',
  method: 'POST',
  endpoint: '/note/saveDrawIOSnapshot',
  requestPlacement: 'body',
  transport: 'json',
  request: SaveDrawIoSnapshotApiRequestSchema,
  response: EmptyApiResponseSchema,
});

export const ForkNoteApiContract = defineApiContract({
  name: 'ForkNoteApi',
  method: 'POST',
  endpoint: '/note/forkNote',
  requestPlacement: 'body',
  transport: 'json',
  request: ForkNoteApiRequestSchema,
  response: ForkNoteApiResponseSchema,
});

export const ListNoteVersionsApiContract = defineApiContract({
  name: 'ListNoteVersionsApi',
  method: 'GET',
  endpoint: '/note/listNoteVersions',
  requestPlacement: 'query',
  transport: 'json',
  request: ListNoteVersionsApiRequestSchema,
  response: ListNoteVersionsApiResponseSchema,
});

export type AddNoteApiContractRequest = ApiContractRequest<typeof AddNoteApiContract>;
export type AddNoteApiContractResponse = ApiContractResponse<typeof AddNoteApiContract>;
export type GetNoteInfoApiContractRequest = ApiContractRequest<typeof GetNoteInfoApiContract>;
export type GetNoteInfoApiContractResponse = ApiContractResponse<typeof GetNoteInfoApiContract>;
export type GetDrawIoLatestSnapshotApiContractRequest = ApiContractRequest<
  typeof GetDrawIoLatestSnapshotApiContract
>;
export type GetDrawIoLatestSnapshotApiContractResponse = ApiContractResponse<
  typeof GetDrawIoLatestSnapshotApiContract
>;
export type SaveDrawIoSnapshotApiContractRequest = ApiContractRequest<
  typeof SaveDrawIoSnapshotApiContract
>;
export type SaveDrawIoSnapshotApiContractResponse = ApiContractResponse<
  typeof SaveDrawIoSnapshotApiContract
>;
export type ForkNoteApiContractRequest = ApiContractRequest<typeof ForkNoteApiContract>;
export type ForkNoteApiContractResponse = ApiContractResponse<typeof ForkNoteApiContract>;
export type ListNoteVersionsApiContractRequest = ApiContractRequest<
  typeof ListNoteVersionsApiContract
>;
export type ListNoteVersionsApiContractResponse = ApiContractResponse<
  typeof ListNoteVersionsApiContract
>;
