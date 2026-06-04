import { ResourceInteractApi } from '../apis/InteractApi';
import { ResourceItemApi } from '../apis/ResourceApi';
import type { ListResourceItemsApiRequest } from '../apis/ResourceApi.type';
import { ResourceServicesMap } from '../mapper/ResourceServices.map';
import type {
  GetGroupResourceRequest,
  GetUserResourcesRequest,
  InteractRateRequest,
  InteractRateResult,
  InteractToggleLikeRequest,
  InteractToggleLikeResult,
  IResourceService,
  RenameResourceRequest,
  ResourceListPage,
  UpdateResourceActionPermissionRequest,
  UpdateResourceTagsRequest,
} from './index.type';

const requestResourceItemList = async (
  params: GetUserResourcesRequest,
  queryOverrides: Partial<ListResourceItemsApiRequest> = {}
): Promise<ResourceListPage> => {
  const query = ResourceServicesMap.mapListResourceItemsRequest(params, queryOverrides);
  const data = await ResourceItemApi.listResources(query);
  return ResourceServicesMap.mapResourceListPageFromApi(data);
};

const getUserResources = async (params: GetUserResourcesRequest): Promise<ResourceListPage> => {
  return requestResourceItemList(params);
};

const getGroupResources = async (params: GetGroupResourceRequest): Promise<ResourceListPage> => {
  return requestResourceItemList(params, { groupId: params.groupId });
};

const renameResource = async (params: RenameResourceRequest): Promise<void> => {
  await ResourceItemApi.renameResource(params);
};

const updateResourceTags = async (params: UpdateResourceTagsRequest): Promise<void> => {
  await ResourceItemApi.changeResourceTags(params);
};

const updateResourceActionPermission = async (
  params: UpdateResourceActionPermissionRequest
): Promise<void> => {
  await ResourceItemApi.changeResourceActionPermission(
    ResourceServicesMap.mapChangeResourceActionPermissionRequest(params)
  );
};

/** 点赞 / 取消点赞，返回操作后最新状态 */
const interactToggleLike = async (
  params: InteractToggleLikeRequest
): Promise<InteractToggleLikeResult> => {
  const res = await ResourceInteractApi.toggleLike({ resourceId: params.resourceId });
  return ResourceServicesMap.mapInteractToggleLikeFromApi(res);
};

/** 评分（1–5），支持覆盖，返回最新 userScore */
const interactRate = async (params: InteractRateRequest): Promise<InteractRateResult> => {
  const res = await ResourceInteractApi.rate({
    resourceId: params.resourceId,
    score: params.score,
  });
  return ResourceServicesMap.mapInteractRateFromApi(res);
};

export const createResourceServices = (): IResourceService => ({
  getUserResources,
  getGroupResources,
  renameResource,
  updateResourceTags,
  updateResourceActionPermission,
  interactToggleLike,
  interactRate,
});
