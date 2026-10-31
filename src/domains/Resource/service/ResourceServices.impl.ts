import { ResourceItemApi, ResourcePlacementApi } from '@domain-apis';

import type { ListResourcesApiContractRequest } from '../apis/ResourceCoreApi.contract';
import { ResourceServicesMap } from '../mapper/ResourceServices.map';
import { setResourceDisplayName } from '../session/resourceDisplayNameCache';
import type {
  GetGroupResourceRequest,
  GetUserResourcesRequest,
  IResourceService,
  MountResourcesToGroupRequest,
  MovePersonalResourcesToTrashRequest,
  MoveResourcesInGroupRequest,
  RemoveResourcesRequest,
  RenameResourceRequest,
  ReplacePersonalNormalTagsRequest,
  ResourceListPage,
  SearchQueryRequest,
  SearchResultPage,
  SetPersonalResourcesPathTagRequest,
  UnmountResourcesToGroupRequest,
} from './index.type';
const requestResourceItemList = async (
  params: GetUserResourcesRequest,
  queryOverrides: Partial<ListResourcesApiContractRequest> = {}
): Promise<ResourceListPage> => {
  const query = ResourceServicesMap.mapListResourceItemsRequest(params, queryOverrides);
  const data = await ResourceItemApi.listResources(query);
  return ResourceServicesMap.mapResourceListPageFromApi(data, { groupId: query.groupId });
};

const getUserResources = async (params: GetUserResourcesRequest): Promise<ResourceListPage> => {
  return requestResourceItemList(params);
};

const getGroupResources = async (params: GetGroupResourceRequest): Promise<ResourceListPage> => {
  return requestResourceItemList(params, { groupId: params.groupId });
};

const renameResource = async (params: RenameResourceRequest): Promise<void> => {
  await ResourceItemApi.renameResource(params);
  setResourceDisplayName(params.resourceId, params.newName);
};

const removeResources = async (params: RemoveResourcesRequest): Promise<void> => {
  await ResourceItemApi.removeResources(params);
};

const setPersonalResourcesPathTag = async (
  params: SetPersonalResourcesPathTagRequest
): Promise<number> => {
  const data = await ResourcePlacementApi.setPersonalResourcesPathTag(params);
  return data.resourceCount;
};

const movePersonalResourcesToTrash = async (
  params: MovePersonalResourcesToTrashRequest
): Promise<number> => {
  const data = await ResourcePlacementApi.movePersonalResourcesToTrash(params);
  return data.resourceCount;
};

const replacePersonalNormalTags = async (
  params: ReplacePersonalNormalTagsRequest
): Promise<number> => {
  const data = await ResourcePlacementApi.replacePersonalNormalTags(params);
  return data.resourceCount;
};

const mountResourcesToGroup = async (params: MountResourcesToGroupRequest): Promise<number> => {
  const data = await ResourcePlacementApi.mountResourcesToGroup(params);
  return data.resourceCount;
};

const unmountResourcesToGroup = async (params: UnmountResourcesToGroupRequest): Promise<number> => {
  const data = await ResourcePlacementApi.unmountResourcesToGroup(params);
  return data.resourceCount;
};

const moveResourcesInGroup = async (params: MoveResourcesInGroupRequest): Promise<number> => {
  const data = await ResourcePlacementApi.moveResourcesInGroup(params);
  return data.resourceCount;
};

const globalSearch = async (params: SearchQueryRequest): Promise<SearchResultPage> => {
  const data = await ResourceItemApi.globalSearch(params);
  return ResourceServicesMap.mapSearchResultPageFromApi(data);
};

export const createResourceServices = (): IResourceService => ({
  getUserResources,
  getGroupResources,
  renameResource,
  removeResources,
  setPersonalResourcesPathTag,
  movePersonalResourcesToTrash,
  replacePersonalNormalTags,
  mountResourcesToGroup,
  unmountResourcesToGroup,
  moveResourcesInGroup,
  globalSearch,
});
