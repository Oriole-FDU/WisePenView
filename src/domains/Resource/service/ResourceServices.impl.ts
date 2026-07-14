import { DocumentApi } from '@/domains/Document/apis/DocumentApi';
import { NoteApi } from '@/domains/Note/apis/NoteApi';
import { SkillApi } from '@/domains/Skill/apis/SkillApi';
import { FavoriteApi } from '../apis/FavoriteApi';
import { ResourceInteractApi } from '../apis/InteractApi';
import { ResourceInlineCommentApi, ResourceItemApi } from '../apis/ResourceApi';
import type { ListResourceItemsApiRequest } from '../apis/ResourceApi.type';
import type { ResourceItem } from '../entity/resource';
import { RESOURCE_SORT_BY, RESOURCE_SORT_DIR } from '../enum';
import { ResourceServicesMap } from '../mapper/ResourceServices.map';
import {
  mapFavoriteCollectionFromApi,
  mapFavoritedResourcesPageFromApi,
} from '../mapper/favorite.mapper';
import { useResourceDisplayNameStore } from '../store/useResourceDisplayNameStore';
import type {
  AddInlineCommentItemRequest,
  ChangeFavoriteStatusRequest,
  ChangeInlineCommentResolveStatusRequest,
  CreateCollectionRequest,
  CreateInlineCommentRequest,
  DeleteCollectionRequest,
  DeleteInlineCommentItemRequest,
  GetGroupResourceRequest,
  GetResourcePermissionOverviewRequest,
  GetUserResourcesRequest,
  InteractRateRequest,
  InteractToggleLikeRequest,
  IResourceService,
  ListFavoritedResourcesRequest,
  ListInlineCommentsRequest,
  MountResourcesToGroupTagRequest,
  RemoveResourcesRequest,
  RenameResourceRequest,
  ResourceListPage,
  SearchQueryRequest,
  SearchResultPage,
  UpdateCollectionInfoRequest,
  UpdateInlineCommentItemRequest,
  UpdateResourceActionPermissionRequest,
  UpdateResourcePermissionSubjectsRequest,
  UpdateResourceTagsRequest,
} from './index.type';

const GROUP_RESOURCE_SCAN_PAGE_SIZE = 200;

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

const getPermissionResourceInfo = async (params: GetResourcePermissionOverviewRequest) => {
  switch (params.resourceType) {
    case 'note':
    case 'drawio': {
      const data = await NoteApi.getNoteInfo({ resourceId: params.resourceId });
      return data.resourceInfo;
    }
    case 'file': {
      const data = await DocumentApi.getDocInfo({ resourceId: params.resourceId });
      return data.resourceInfo;
    }
    case 'skill': {
      const data = await SkillApi.getSkillInfo({ resourceId: params.resourceId });
      return (
        data?.resourceInfo ?? { resourceId: params.resourceId, resourceName: '', ownerInfo: {} }
      );
    }
    case 'agent':
      throw new Error('暂不支持配置 Agent 资源权限');
  }
};

const getResourcePermissionOverview = async (params: GetResourcePermissionOverviewRequest) => {
  const resourceInfo = await getPermissionResourceInfo(params);
  return ResourceServicesMap.mapResourcePermissionOverviewFromApi(resourceInfo, params.resourceId);
};

/** 获取当前用户点赞状态，供点赞组件薄层调用 */
const getLikeStatus = async (resourceId: string): Promise<{ liked: boolean }> => {
  const res = await ResourceInteractApi.getUserInteractionRecord({ resourceId });
  return ResourceServicesMap.mapLikeStatusFromApi(res);
};

/** 获取当前用户评分，供评分组件薄层调用 */
const getRate = async (resourceId: string): Promise<{ score: number }> => {
  const res = await ResourceInteractApi.getUserInteractionRecord({ resourceId });
  return ResourceServicesMap.mapRateFromApi(res);
};

/** 点赞 / 取消点赞 */
const interactToggleLike = async (params: InteractToggleLikeRequest): Promise<void> => {
  await ResourceInteractApi.toggleLike({ resourceId: params.resourceId });
};

/** 评分（1–5），支持覆盖 */
const interactRate = async (params: InteractRateRequest): Promise<void> => {
  await ResourceInteractApi.rate({ resourceId: params.resourceId, score: params.score });
};

/** 上报资源阅读 */
const interactRead = async (resourceId: string): Promise<void> => {
  await ResourceInteractApi.read({ resourceId });
};

const globalSearch = async (params: SearchQueryRequest): Promise<SearchResultPage> => {
  const data = await ResourceItemApi.globalSearch(params);
  return ResourceServicesMap.mapSearchResultPageFromApi(data);
};

const listInlineComments = async (params: ListInlineCommentsRequest) => {
  const data = await ResourceInlineCommentApi.listInlineComments(
    ResourceServicesMap.mapListInlineCommentsRequest(params)
  );
  return ResourceServicesMap.mapListInlineCommentsFromApi(data);
};

const requireInlineCommentResponseId = (
  id: string | undefined,
  actionName: string,
  fieldName: string
): string => {
  if (id) {
    return id;
  }
  throw new Error(`${actionName}接口响应缺少 ${fieldName}`);
};

const createInlineComment = async (params: CreateInlineCommentRequest): Promise<string> => {
  const data = await ResourceInlineCommentApi.createInlineComment(
    ResourceServicesMap.mapCreateInlineCommentRequest(params)
  );
  return requireInlineCommentResponseId(
    ResourceServicesMap.mapInlineCommentThreadIdFromApi(data),
    '创建行内批注',
    'inlineCommentId'
  );
};

const addInlineCommentItem = async (params: AddInlineCommentItemRequest): Promise<string> => {
  const data = await ResourceInlineCommentApi.addInlineCommentItem(
    ResourceServicesMap.mapAddInlineCommentItemRequest(params)
  );
  return requireInlineCommentResponseId(
    ResourceServicesMap.mapInlineCommentItemIdFromApi(data),
    '追加行内批注回复',
    'itemId'
  );
};

const updateInlineCommentItem = async (params: UpdateInlineCommentItemRequest): Promise<void> => {
  await ResourceInlineCommentApi.updateInlineCommentItem(
    ResourceServicesMap.mapUpdateInlineCommentItemRequest(params)
  );
};

const deleteInlineCommentItem = async (params: DeleteInlineCommentItemRequest): Promise<void> => {
  await ResourceInlineCommentApi.deleteInlineCommentItem(params);
};

const changeInlineCommentResolveStatus = async (
  params: ChangeInlineCommentResolveStatusRequest
): Promise<void> => {
  await ResourceInlineCommentApi.changeInlineCommentResolveStatus(params);
};
const getFavoriteStatus = async (resourceId: string): Promise<{ collectionIds: string[] }> => {
  const data = await FavoriteApi.getFavoriteStatus(resourceId);
  return { collectionIds: data.collectionIds ?? [] };
};

const changeFavoriteStatus = async (params: ChangeFavoriteStatusRequest): Promise<void> => {
  await FavoriteApi.changeFavoriteStatus({
    resourceId: params.resourceId,
    favorite: params.favorite,
    ...(params.collectionIds != null ? { collectionIds: params.collectionIds } : {}),
  });
};

const listCollections = async () => {
  const data = await FavoriteApi.listCollections();
  return data.map(mapFavoriteCollectionFromApi);
};

const createCollection = async (params: CreateCollectionRequest): Promise<string> => {
  const collectionId = await FavoriteApi.createCollection({
    collectionName: params.collectionName,
    ...(params.description !== undefined ? { description: params.description } : {}),
  });
  return collectionId;
};

const updateCollectionInfo = async (params: UpdateCollectionInfoRequest): Promise<void> => {
  await FavoriteApi.updateCollectionInfo({
    collectionId: params.collectionId,
    collectionName: params.collectionName,
    ...(params.description !== undefined ? { description: params.description } : {}),
  });
};

const deleteCollection = async (params: DeleteCollectionRequest): Promise<void> => {
  await FavoriteApi.deleteCollection({
    collectionId: params.collectionId,
    keepResourcesToDefault: params.keepResourcesToDefault ?? false,
  });
};

const listFavoritedResources = async (params: ListFavoritedResourcesRequest) => {
  const data = await FavoriteApi.listFavoritedResources({
    ...(params.collectionId ? { collectionId: params.collectionId } : {}),
    page: params.page,
    size: params.size,
  });
  return mapFavoritedResourcesPageFromApi(data);
};

export const createResourceServices = (): IResourceService => ({
  getUserResources,
  getGroupResources,
  renameResource,
  removeResources,
  updateResourceTags,
  mountResourcesToGroupTag,
  updateResourceActionPermission,
  updateResourcePermissionSubjects,
  getResourcePermissionOverview,
  getLikeStatus,
  getRate,
  interactToggleLike,
  interactRate,
  interactRead,
  globalSearch,
  listInlineComments,
  createInlineComment,
  addInlineCommentItem,
  updateInlineCommentItem,
  deleteInlineCommentItem,
  changeInlineCommentResolveStatus,
  getFavoriteStatus,
  changeFavoriteStatus,
  listCollections,
  createCollection,
  updateCollectionInfo,
  deleteCollection,
  listFavoritedResources,
});
