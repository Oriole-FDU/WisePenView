import { executeApiContract } from '@/apis/executeApiContract';

import {
  ChangeResourceActionPermissionApiContract,
  type ChangeResourceActionPermissionApiContractRequest,
  type ChangeResourceActionPermissionApiContractResponse,
  GlobalSearchResourcesApiContract,
  type GlobalSearchResourcesApiContractRequest,
  type GlobalSearchResourcesApiContractResponse,
  ListResourcesApiContract,
  type ListResourcesApiContractRequest,
  type ListResourcesApiContractResponse,
  RemoveResourcesApiContract,
  type RemoveResourcesApiContractRequest,
  type RemoveResourcesApiContractResponse,
  RenameResourceApiContract,
  type RenameResourceApiContractRequest,
  type RenameResourceApiContractResponse,
} from './ResourceCoreApi.contract';

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

async function listResources(
  req: ListResourcesApiContractRequest
): Promise<ListResourcesApiContractResponse> {
  return executeApiContract(ListResourcesApiContract, req, {
    paramsSerializer: serializeListResourcesQuery,
  });
}

async function renameResource(
  req: RenameResourceApiContractRequest
): Promise<RenameResourceApiContractResponse> {
  return executeApiContract(RenameResourceApiContract, req);
}

async function changeResourceActionPermission(
  req: ChangeResourceActionPermissionApiContractRequest
): Promise<ChangeResourceActionPermissionApiContractResponse> {
  return executeApiContract(ChangeResourceActionPermissionApiContract, req);
}

async function removeResources(
  req: RemoveResourcesApiContractRequest
): Promise<RemoveResourcesApiContractResponse> {
  return executeApiContract(RemoveResourcesApiContract, req);
}

async function globalSearch(
  req: GlobalSearchResourcesApiContractRequest
): Promise<GlobalSearchResourcesApiContractResponse> {
  return executeApiContract(GlobalSearchResourcesApiContract, req, {
    paramsSerializer: serializeListResourcesQuery,
  });
}

export const ResourceItemApi = {
  listResources,
  renameResource,
  changeResourceActionPermission,
  removeResources,
  globalSearch,
};
