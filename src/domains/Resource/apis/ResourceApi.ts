import { executeApiContract } from '@/apis/executeApiContract';
import { serializeQueryParams } from '@/apis/serializeQueryParams';

import {
  ChangeResourceActionPermissionApiContract,
  type ChangeResourceActionPermissionApiContractRequest,
  type ChangeResourceActionPermissionApiContractResponse,
  GetResourceBaseInfoApiContract,
  type GetResourceBaseInfoApiContractRequest,
  type GetResourceBaseInfoApiContractResponse,
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

async function getResourceBaseInfo(
  req: GetResourceBaseInfoApiContractRequest
): Promise<GetResourceBaseInfoApiContractResponse> {
  return executeApiContract(GetResourceBaseInfoApiContract, req);
}

async function listResources(
  req: ListResourcesApiContractRequest
): Promise<ListResourcesApiContractResponse> {
  return executeApiContract(ListResourcesApiContract, req, {
    paramsSerializer: serializeQueryParams,
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
    paramsSerializer: serializeQueryParams,
  });
}

export const ResourceItemApi = {
  getResourceBaseInfo,
  listResources,
  renameResource,
  changeResourceActionPermission,
  removeResources,
  globalSearch,
};
