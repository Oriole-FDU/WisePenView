import { apiGet, apiPost } from '@/apis/request';
import { serializeRepeatKeyQuery } from '@/apis/serializeRepeatKeyQuery';

import type {
  ChangeResourceActionPermissionApiRequest,
  GlobalSearchApiRequest,
  GlobalSearchApiResponse,
  ListResourceItemsApiRequest,
  RemoveResourcesApiRequest,
  RenameResourceApiRequest,
  ResourceListPageApiResponse,
} from './ResourceApi.type';

// /resource/item/*

function listResources(req: ListResourceItemsApiRequest): Promise<ResourceListPageApiResponse> {
  return apiGet('/resource/item/listResources', {
    params: req,
    paramsSerializer: serializeRepeatKeyQuery,
  });
}

function renameResource(req: RenameResourceApiRequest): Promise<void> {
  return apiPost('/resource/item/renameResource', req);
}

function changeResourceActionPermission(
  req: ChangeResourceActionPermissionApiRequest
): Promise<void> {
  return apiPost('/resource/item/changeResourceActionPermission', req);
}

function removeResources(req: RemoveResourcesApiRequest): Promise<void> {
  return apiPost('/resource/item/removeResources', req);
}

function globalSearch(req: GlobalSearchApiRequest): Promise<GlobalSearchApiResponse> {
  return apiGet('/resource/search/globalSearchResources', { params: req });
}

export const ResourceItemApi = {
  listResources,
  renameResource,
  changeResourceActionPermission,
  removeResources,
  globalSearch,
};
