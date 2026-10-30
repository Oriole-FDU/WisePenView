import {
  type ApiContractRequest,
  type ApiContractResponse,
  defineApiContract,
} from '@/apis/contract';
import { EmptyApiResponseSchema } from '@/apis/schema';

import {
  GetUserInteractionRecordApiResponseSchema,
  RateApiRequestSchema,
  ResourceInteractionApiRequestSchema,
  ResourceLikeApiRequestSchema,
} from './InteractApi.schema';

export const ChangeResourceLikeApiContract = defineApiContract({
  name: 'ChangeResourceLikeApi',
  method: 'POST',
  endpoint: '/resource/interaction/toggleLike',
  requestPlacement: 'body',
  transport: 'json',
  request: ResourceLikeApiRequestSchema,
  response: EmptyApiResponseSchema,
});

export const RateResourceApiContract = defineApiContract({
  name: 'RateResourceApi',
  method: 'POST',
  endpoint: '/resource/interaction/rate',
  requestPlacement: 'body',
  transport: 'json',
  request: RateApiRequestSchema,
  response: EmptyApiResponseSchema,
});

export const RecordResourceReadApiContract = defineApiContract({
  name: 'RecordResourceReadApi',
  method: 'POST',
  endpoint: '/resource/interaction/read',
  requestPlacement: 'body',
  transport: 'json',
  request: ResourceInteractionApiRequestSchema,
  response: EmptyApiResponseSchema,
});

export const GetResourceUserInteractionRecordApiContract = defineApiContract({
  name: 'GetResourceUserInteractionRecordApi',
  method: 'GET',
  endpoint: '/resource/interaction/getResourceUserInteractionRecord',
  requestPlacement: 'query',
  transport: 'json',
  request: ResourceInteractionApiRequestSchema,
  response: GetUserInteractionRecordApiResponseSchema,
});

export type ChangeResourceLikeApiContractRequest = ApiContractRequest<
  typeof ChangeResourceLikeApiContract
>;
export type RateResourceApiContractRequest = ApiContractRequest<typeof RateResourceApiContract>;
export type RecordResourceReadApiContractRequest = ApiContractRequest<
  typeof RecordResourceReadApiContract
>;
export type GetResourceUserInteractionRecordApiContractRequest = ApiContractRequest<
  typeof GetResourceUserInteractionRecordApiContract
>;
export type GetResourceUserInteractionRecordApiContractResponse = ApiContractResponse<
  typeof GetResourceUserInteractionRecordApiContract
>;
