import {
  type ApiContractRequest,
  type ApiContractResponse,
  defineApiContract,
} from '@/apis/contract';
import { EmptyApiResponseSchema } from '@/apis/schema';

import {
  ChangeResourceActionPermissionApiRequestSchema,
  GlobalSearchResourcesApiRequestSchema,
  GlobalSearchResourcesApiResponseSchema,
  ListResourcesApiRequestSchema,
  ListResourcesApiResponseSchema,
  RemoveResourcesApiRequestSchema,
  RenameResourceApiRequestSchema,
} from './ResourceCoreApi.schema';

export const ListResourcesApiContract = defineApiContract({
  name: 'ListResourcesApi',
  method: 'GET',
  endpoint: '/resource/item/listResources',
  requestPlacement: 'query',
  transport: 'json',
  request: ListResourcesApiRequestSchema,
  response: ListResourcesApiResponseSchema,
});

export const RenameResourceApiContract = defineApiContract({
  name: 'RenameResourceApi',
  method: 'POST',
  endpoint: '/resource/item/renameResource',
  requestPlacement: 'body',
  transport: 'json',
  request: RenameResourceApiRequestSchema,
  response: EmptyApiResponseSchema,
});

export const ChangeResourceActionPermissionApiContract = defineApiContract({
  name: 'ChangeResourceActionPermissionApi',
  method: 'POST',
  endpoint: '/resource/item/changeResourceActionPermission',
  requestPlacement: 'body',
  transport: 'json',
  request: ChangeResourceActionPermissionApiRequestSchema,
  response: EmptyApiResponseSchema,
});

export const RemoveResourcesApiContract = defineApiContract({
  name: 'RemoveResourcesApi',
  method: 'POST',
  endpoint: '/resource/item/removeResources',
  requestPlacement: 'body',
  transport: 'json',
  request: RemoveResourcesApiRequestSchema,
  response: EmptyApiResponseSchema,
});

export const GlobalSearchResourcesApiContract = defineApiContract({
  name: 'GlobalSearchResourcesApi',
  method: 'GET',
  endpoint: '/resource/search/globalSearchResources',
  requestPlacement: 'query',
  transport: 'json',
  request: GlobalSearchResourcesApiRequestSchema,
  response: GlobalSearchResourcesApiResponseSchema,
});

export type ListResourcesApiContractRequest = ApiContractRequest<typeof ListResourcesApiContract>;
export type ListResourcesApiContractResponse = ApiContractResponse<typeof ListResourcesApiContract>;
export type RenameResourceApiContractRequest = ApiContractRequest<typeof RenameResourceApiContract>;
export type RenameResourceApiContractResponse = ApiContractResponse<
  typeof RenameResourceApiContract
>;
export type ChangeResourceActionPermissionApiContractRequest = ApiContractRequest<
  typeof ChangeResourceActionPermissionApiContract
>;
export type ChangeResourceActionPermissionApiContractResponse = ApiContractResponse<
  typeof ChangeResourceActionPermissionApiContract
>;
export type RemoveResourcesApiContractRequest = ApiContractRequest<
  typeof RemoveResourcesApiContract
>;
export type RemoveResourcesApiContractResponse = ApiContractResponse<
  typeof RemoveResourcesApiContract
>;
export type GlobalSearchResourcesApiContractRequest = ApiContractRequest<
  typeof GlobalSearchResourcesApiContract
>;
export type GlobalSearchResourcesApiContractResponse = ApiContractResponse<
  typeof GlobalSearchResourcesApiContract
>;
