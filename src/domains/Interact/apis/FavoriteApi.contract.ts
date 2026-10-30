import { z } from 'zod';

import {
  type ApiContractRequest,
  type ApiContractResponse,
  defineApiContract,
} from '@/apis/contract';
import { EmptyApiRequestSchema, EmptyApiResponseSchema, OpaqueIdSchema } from '@/apis/schema';

import {
  ChangeFavoriteStatusApiRequestSchema,
  CreateCollectionApiRequestSchema,
  DeleteCollectionApiRequestSchema,
  FavoriteCollectionApiSchema,
  GetFavoriteStatusApiResponseSchema,
  ListFavoritedResourcesApiRequestSchema,
  ListFavoritedResourcesApiResponseSchema,
  UpdateCollectionInfoApiRequestSchema,
} from './FavoriteApi.schema';

const GetFavoriteStatusApiRequestSchema = z.strictObject({
  resourceId: OpaqueIdSchema,
});

export const GetFavoriteStatusApiContract = defineApiContract({
  name: 'GetFavoriteStatusApi',
  method: 'GET',
  endpoint: '/resource/favorite/getResourceFavoriteStatus',
  requestPlacement: 'query',
  transport: 'json',
  request: GetFavoriteStatusApiRequestSchema,
  response: GetFavoriteStatusApiResponseSchema,
});

export const ChangeFavoriteStatusApiContract = defineApiContract({
  name: 'ChangeFavoriteStatusApi',
  method: 'POST',
  endpoint: '/resource/favorite/changeResourceFavoriteStatus',
  requestPlacement: 'body',
  transport: 'json',
  request: ChangeFavoriteStatusApiRequestSchema,
  response: EmptyApiResponseSchema,
});

export const ListFavoriteCollectionsApiContract = defineApiContract({
  name: 'ListFavoriteCollectionsApi',
  method: 'GET',
  endpoint: '/resource/favorite/listCollections',
  requestPlacement: 'none',
  transport: 'json',
  request: EmptyApiRequestSchema,
  response: z.array(FavoriteCollectionApiSchema),
});

export const CreateCollectionApiContract = defineApiContract({
  name: 'CreateCollectionApi',
  method: 'POST',
  endpoint: '/resource/favorite/createCollection',
  requestPlacement: 'body',
  transport: 'json',
  request: CreateCollectionApiRequestSchema,
  response: OpaqueIdSchema,
});

export const UpdateCollectionInfoApiContract = defineApiContract({
  name: 'UpdateCollectionInfoApi',
  method: 'POST',
  endpoint: '/resource/favorite/updateCollectionInfo',
  requestPlacement: 'body',
  transport: 'json',
  request: UpdateCollectionInfoApiRequestSchema,
  response: EmptyApiResponseSchema,
});

export const DeleteCollectionApiContract = defineApiContract({
  name: 'DeleteCollectionApi',
  method: 'POST',
  endpoint: '/resource/favorite/deleteCollection',
  requestPlacement: 'body',
  transport: 'json',
  request: DeleteCollectionApiRequestSchema,
  response: EmptyApiResponseSchema,
});

export const ListFavoritedResourcesApiContract = defineApiContract({
  name: 'ListFavoritedResourcesApi',
  method: 'GET',
  endpoint: '/resource/favorite/listFavoritedResources',
  requestPlacement: 'query',
  transport: 'json',
  request: ListFavoritedResourcesApiRequestSchema,
  response: ListFavoritedResourcesApiResponseSchema,
});

export type GetFavoriteStatusApiContractRequest = ApiContractRequest<
  typeof GetFavoriteStatusApiContract
>;
export type GetFavoriteStatusApiContractResponse = ApiContractResponse<
  typeof GetFavoriteStatusApiContract
>;
export type ChangeFavoriteStatusApiContractRequest = ApiContractRequest<
  typeof ChangeFavoriteStatusApiContract
>;
export type ListFavoriteCollectionsApiContractResponse = ApiContractResponse<
  typeof ListFavoriteCollectionsApiContract
>;
export type CreateCollectionApiContractRequest = ApiContractRequest<
  typeof CreateCollectionApiContract
>;
export type CreateCollectionApiContractResponse = ApiContractResponse<
  typeof CreateCollectionApiContract
>;
export type UpdateCollectionInfoApiContractRequest = ApiContractRequest<
  typeof UpdateCollectionInfoApiContract
>;
export type DeleteCollectionApiContractRequest = ApiContractRequest<
  typeof DeleteCollectionApiContract
>;
export type ListFavoritedResourcesApiContractRequest = ApiContractRequest<
  typeof ListFavoritedResourcesApiContract
>;
export type ListFavoritedResourcesApiContractResponse = ApiContractResponse<
  typeof ListFavoritedResourcesApiContract
>;
