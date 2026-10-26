import { apiGetUnchecked, apiPostUnchecked } from '@/apis/request';

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

const serializeListResourcesQuery = (params: Record<string, unknown>): string => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== undefined && item !== null && String(item) !== '') {
          searchParams.append(key, String(item));
        }
      });
      return;
    }
    searchParams.append(key, String(value));
  });
  return searchParams.toString();
};

function listResources(req: ListResourceItemsApiRequest): Promise<ResourceListPageApiResponse> {
  return apiGetUnchecked('/resource/item/listResources', {
    params: req,
    paramsSerializer: serializeListResourcesQuery,
  });
}

function renameResource(req: RenameResourceApiRequest): Promise<void> {
  return apiPostUnchecked('/resource/item/renameResource', req);
}

function changeResourceActionPermission(
  req: ChangeResourceActionPermissionApiRequest
): Promise<void> {
  return apiPostUnchecked('/resource/item/changeResourceActionPermission', req);
}

function removeResources(req: RemoveResourcesApiRequest): Promise<void> {
  return apiPostUnchecked('/resource/item/removeResources', req);
}

function globalSearch(req: GlobalSearchApiRequest): Promise<GlobalSearchApiResponse> {
  return apiGetUnchecked('/resource/search/globalSearchResources', { params: req });
}

export const ResourceItemApi = {
  listResources,
  renameResource,
  changeResourceActionPermission,
  removeResources,
  globalSearch,
};
