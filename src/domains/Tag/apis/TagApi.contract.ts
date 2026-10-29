import {
  type ApiContractRequest,
  type ApiContractResponse,
  defineApiContract,
} from '@/apis/contract';
import { EmptyApiResponseSchema, OpaqueIdSchema } from '@/apis/schema';

import {
  AddTagApiRequestSchema,
  ChangeTagApiRequestSchema,
  GetTagTreeApiRequestSchema,
  MoveTagsApiRequestSchema,
  RemoveTagsApiRequestSchema,
  TagTreeApiResponseSchema,
} from './TagApi.schema';

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
