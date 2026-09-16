import { ResourceItemApi, ResourcePlacementApi } from '@domain-apis';
import type { ListResourceItemsApiRequest } from '../apis/ResourceApi.type';
import { ResourceServicesMap } from '../mapper/ResourceServices.map';
import { useResourceDisplayNameStore } from '../store/useResourceDisplayNameStore';
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
  UpdateResourceActionPermissionRequest,
  UpdateResourcePermissionSubjectsRequest,
} from './index.type';
const requestResourceItemList = async (
  params: GetUserResourcesRequest,
  queryOverrides: Partial<ListResourceItemsApiRequest> = {}
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
  useResourceDisplayNameStore.getState().setDisplayName(params.resourceId, params.newName);
};

const removeResources = async (params: RemoveResourcesRequest): Promise<void> => {
  await ResourceItemApi.removeResources(params);
};

const setPersonalResourcesPathTag = async (
  params: SetPersonalResourcesPathTagRequest
): Promise<number> => {
  const request = ResourceServicesMap.mapSetPersonalResourcesPathTagRequest(params);
  const data = await ResourcePlacementApi.setPersonalResourcesPathTag(request);
  return ResourceServicesMap.mapResourcePlacementCountFromApi(data);
};

const movePersonalResourcesToTrash = async (
  params: MovePersonalResourcesToTrashRequest
): Promise<number> => {
  const request = ResourceServicesMap.mapMovePersonalResourcesToTrashRequest(params);
  const data = await ResourcePlacementApi.movePersonalResourcesToTrash(request);
  return ResourceServicesMap.mapResourcePlacementCountFromApi(data);
};

const replacePersonalNormalTags = async (
  params: ReplacePersonalNormalTagsRequest
): Promise<number> => {
  const request = ResourceServicesMap.mapReplacePersonalNormalTagsRequest(params);
  const data = await ResourcePlacementApi.replacePersonalNormalTags(request);
  return ResourceServicesMap.mapResourcePlacementCountFromApi(data);
};

const mountResourcesToGroup = async (params: MountResourcesToGroupRequest): Promise<number> => {
  const request = ResourceServicesMap.mapMountResourcesToGroupRequest(params);
  const data = await ResourcePlacementApi.mountResourcesToGroup(request);
  return ResourceServicesMap.mapResourcePlacementCountFromApi(data);
};

const unmountResourcesToGroup = async (params: UnmountResourcesToGroupRequest): Promise<number> => {
  const request = ResourceServicesMap.mapUnmountResourcesToGroupRequest(params);
  const data = await ResourcePlacementApi.unmountResourcesToGroup(request);
  return ResourceServicesMap.mapResourcePlacementCountFromApi(data);
};

const moveResourcesInGroup = async (params: MoveResourcesInGroupRequest): Promise<number> => {
  const request = ResourceServicesMap.mapMoveResourcesInGroupRequest(params);
  const data = await ResourcePlacementApi.moveResourcesInGroup(request);
  return ResourceServicesMap.mapResourcePlacementCountFromApi(data);
};

const updateResourceActionPermission = async (
  params: UpdateResourceActionPermissionRequest
): Promise<void> => {
  const request = ResourceServicesMap.mapChangeResourceActionPermissionRequest(params);
  await ResourceItemApi.changeResourceActionPermission(request);
};

const updateResourcePermissionSubjects = async (
  params: UpdateResourcePermissionSubjectsRequest
): Promise<void> => {
  const request = ResourceServicesMap.mapChangeResourceActionPermissionRequestFromSubjects(params);
  await ResourceItemApi.changeResourceActionPermission(request);
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
  updateResourceActionPermission,
  updateResourcePermissionSubjects,
  globalSearch,
});
