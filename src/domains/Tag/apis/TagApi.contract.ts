import {
  type ApiContractRequest,
  type ApiContractResponse,
  defineApiContract,
} from '@/apis/contract';
import { EmptyApiRequestSchema, EmptyApiResponseSchema, OpaqueIdSchema } from '@/apis/schema';

import {
  AddTagApiRequestSchema,
  ChangeTagApiRequestSchema,
  GetGroupTagTreeApiRequestSchema,
  GetTagTreeApiRequestSchema,
  MoveTagsApiRequestSchema,
  RemoveTagsApiRequestSchema,
  TagTreeApiResponseSchema,
} from './TagApi.schema';

export const GetPersonalTagTreeApiContract = defineApiContract({
  name: 'GetPersonalTagTreeApi',
  method: 'GET',
  endpoint: '/resource/tag/getPersonalTagTree',
  requestPlacement: 'none',
  transport: 'json',
  request: EmptyApiRequestSchema,
  response: TagTreeApiResponseSchema,
});

export const GetGroupTagTreeApiContract = defineApiContract({
  name: 'GetGroupTagTreeApi',
  method: 'GET',
  endpoint: '/resource/tag/getGroupTagTree',
  requestPlacement: 'query',
  transport: 'json',
  request: GetGroupTagTreeApiRequestSchema,
  response: TagTreeApiResponseSchema,
});

/** @deprecated 使用 GetPersonalTagTreeApiContract 或 GetGroupTagTreeApiContract。 */
export const GetTagTreeApiContract = defineApiContract({
  name: 'GetTagTreeApi',
  method: 'GET',
  endpoint: '/resource/tag/getTagTree',
  requestPlacement: 'query',
  transport: 'json',
  request: GetTagTreeApiRequestSchema,
  response: TagTreeApiResponseSchema,
});

export const AddTagApiContract = defineApiContract({
  name: 'AddTagApi',
  method: 'POST',
  endpoint: '/resource/tag/addTag',
  requestPlacement: 'body',
  transport: 'json',
  request: AddTagApiRequestSchema,
  response: OpaqueIdSchema,
});

export const ChangeTagApiContract = defineApiContract({
  name: 'ChangeTagApi',
  method: 'POST',
  endpoint: '/resource/tag/changeTag',
  requestPlacement: 'body',
  transport: 'json',
  request: ChangeTagApiRequestSchema,
  response: EmptyApiResponseSchema,
});

export const RemoveTagsApiContract = defineApiContract({
  name: 'RemoveTagsApi',
  method: 'POST',
  endpoint: '/resource/tag/removeTags',
  requestPlacement: 'body',
  transport: 'json',
  request: RemoveTagsApiRequestSchema,
  response: EmptyApiResponseSchema,
});

export const MoveTagsApiContract = defineApiContract({
  name: 'MoveTagsApi',
  method: 'POST',
  endpoint: '/resource/tag/moveTags',
  requestPlacement: 'body',
  transport: 'json',
  request: MoveTagsApiRequestSchema,
  response: EmptyApiResponseSchema,
});

export type GetPersonalTagTreeApiResponse = ApiContractResponse<
  typeof GetPersonalTagTreeApiContract
>;
export type GetGroupTagTreeApiRequest = ApiContractRequest<typeof GetGroupTagTreeApiContract>;
export type GetGroupTagTreeApiResponse = ApiContractResponse<typeof GetGroupTagTreeApiContract>;
export type GetTagTreeApiRequest = ApiContractRequest<typeof GetTagTreeApiContract>;
export type GetTagTreeApiResponse = ApiContractResponse<typeof GetTagTreeApiContract>;
export type AddTagApiRequest = ApiContractRequest<typeof AddTagApiContract>;
export type AddTagApiResponse = ApiContractResponse<typeof AddTagApiContract>;
export type ChangeTagApiRequest = ApiContractRequest<typeof ChangeTagApiContract>;
export type ChangeTagApiResponse = ApiContractResponse<typeof ChangeTagApiContract>;
export type RemoveTagsApiRequest = ApiContractRequest<typeof RemoveTagsApiContract>;
export type RemoveTagsApiResponse = ApiContractResponse<typeof RemoveTagsApiContract>;
export type MoveTagsApiRequest = ApiContractRequest<typeof MoveTagsApiContract>;
export type MoveTagsApiResponse = ApiContractResponse<typeof MoveTagsApiContract>;
