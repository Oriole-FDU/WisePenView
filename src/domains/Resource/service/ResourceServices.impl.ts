import { ResourceItemApi } from '../apis/ResourceApi';
import type { ListResourceItemsApiRequest } from '../apis/ResourceApi.type';
import type { ResourceItem } from '../entity/resource';
import { RESOURCE_SORT_BY, RESOURCE_SORT_DIR } from '../enum';
import { ResourceServicesMap } from '../mapper/ResourceServices.map';
import { useResourceDisplayNameStore } from '../store/useResourceDisplayNameStore';
import type {
  GetGroupResourceRequest,
  GetUserResourcesRequest,
  IResourceService,
  MountResourcesToGroupTagRequest,
  RemoveResourcesRequest,
  RenameResourceRequest,
  ResourceListPage,
  SearchQueryRequest,
  SearchResultPage,
  UpdateResourceActionPermissionRequest,
  UpdateResourcePermissionSubjectsRequest,
  UpdateResourceTagsRequest,
} from './index.type';
import {
  getResourcePermissionOverview,
  type ResourcePermissionOverviewDeps,
} from './resourcePermissionOverview';

type ResourceServicesDeps = ResourcePermissionOverviewDeps;

const GROUP_RESOURCE_SCAN_PAGE_SIZE = 100;

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

const updateResourceTags = async (params: UpdateResourceTagsRequest): Promise<void> => {
  await ResourceItemApi.changeResourceTags(params);
};

const uniqueNonEmptyIds = (ids: string[]): string[] =>
  Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean)));

const resolveGroupMountTags = (
  item: ResourceItem | undefined,
  targetTagId: string
): { tagIds: string[]; primaryTagId?: string } => {
  const currentTagIds = Object.keys(item?.currentTags ?? {});
  const primaryTagId = item?.mainTagId;
  if (primaryTagId) {
    return {
      tagIds: uniqueNonEmptyIds([
        primaryTagId,
        ...currentTagIds.filter((tagId) => tagId !== primaryTagId),
        targetTagId,
      ]),
    };
  }
  return {
    tagIds: uniqueNonEmptyIds([targetTagId, ...currentTagIds]),
    primaryTagId: targetTagId,
  };
};

const fetchGroupResourceItemsById = async (
  groupId: string,
  resourceIds: string[]
): Promise<Map<string, ResourceItem>> => {
  const pendingIds = new Set(resourceIds);
  const matchedItems = new Map<string, ResourceItem>();
  let page = 1;

  while (pendingIds.size > 0) {
    const result = await getGroupResources({
      groupId,
      page,
      size: GROUP_RESOURCE_SCAN_PAGE_SIZE,
      sortBy: RESOURCE_SORT_BY.UPDATE_TIME,
      sortDir: RESOURCE_SORT_DIR.DESC,
    });

    for (const item of result.list) {
      if (!pendingIds.has(item.resourceId)) continue;
      matchedItems.set(item.resourceId, item);
      pendingIds.delete(item.resourceId);
    }

    const reachedKnownTotal =
      result.total > 0 && page * GROUP_RESOURCE_SCAN_PAGE_SIZE >= result.total;
    const reachedKnownLastPage = result.totalPage > 0 && page >= result.totalPage;
    const reachedShortPage = result.list.length < GROUP_RESOURCE_SCAN_PAGE_SIZE;
    if (reachedKnownTotal || reachedKnownLastPage || reachedShortPage) break;
    page += 1;
  }

  return matchedItems;
};

const mountResourcesToGroupTag = async (params: MountResourcesToGroupTagRequest): Promise<void> => {
  const resourceIds = uniqueNonEmptyIds(params.resourceIds);
  const targetTagId = params.tagId.trim();
  if (resourceIds.length === 0 || !targetTagId) return;

  const existingItems = await fetchGroupResourceItemsById(params.groupId, resourceIds);
  await Promise.all(
    resourceIds.map((resourceId) => {
      const tagPayload = resolveGroupMountTags(existingItems.get(resourceId), targetTagId);
      return updateResourceTags({
        resourceId,
        groupId: params.groupId,
        ...tagPayload,
      });
    })
  );
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

export const createResourceServices = (deps: ResourceServicesDeps): IResourceService => ({
  getUserResources,
  getGroupResources,
  renameResource,
  removeResources,
  updateResourceTags,
  mountResourcesToGroupTag,
  updateResourceActionPermission,
  updateResourcePermissionSubjects,
  getResourcePermissionOverview: (params) => getResourcePermissionOverview(params, deps),
  globalSearch,
});
