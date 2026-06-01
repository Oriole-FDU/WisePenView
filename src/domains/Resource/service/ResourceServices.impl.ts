import { normalizeResourceItem } from '@/utils/normalize/normalizeResourceItem';
import { ResourceInteractApi } from '../apis/InteractApi';
import { ResourceItemApi } from '../apis/ResourceApi';
import type { ListResourceItemsApiRequest } from '../apis/ResourceApi.type';
import { TAG_QUERY_LOGIC_MODE } from '../enum';
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
  UpdateResourceTagsRequest,
} from './index.type';

const requestResourceItemList = async (
  params: GetUserResourcesRequest,
  queryOverrides: Partial<ListResourceItemsApiRequest> = {}
): Promise<ResourceListPage> => {
  const query: ListResourceItemsApiRequest = {
    page: params.page,
    size: params.size,
    sortBy: params.sortBy,
    sortDir: params.sortDir,
    tagQueryLogicMode: params.tagQueryLogicMode ?? TAG_QUERY_LOGIC_MODE.OR,
    ...queryOverrides,
  };
  if (params.resourceType != null && params.resourceType !== '') {
    query.resourceType = params.resourceType;
  }
  if (params.tagIds != null && params.tagIds.length > 0) {
    query.tagIds = params.tagIds;
  }
  const d = await ResourceItemApi.listResources(query);
  // readCount/likeCount 后端以字符串返回（Java Long），归一化为 number
  return {
    list: (d?.list ?? []).map(normalizeResourceItem),
    total: d?.total ?? 0,
    page: d?.page ?? params.page,
    size: d?.size ?? params.size,
    totalPage: d?.totalPage ?? 0,
  };
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

/** 点赞 / 取消点赞，返回操作后最新状态 */
const interactToggleLike = async (
  params: InteractToggleLikeRequest
): Promise<InteractToggleLikeResult> => {
  const res = await ResourceInteractApi.toggleLike({ resourceId: params.resourceId });
  return { liked: res.liked };
};

/** 评分（1–5），支持覆盖，返回最新 userScore */
const interactRate = async (params: InteractRateRequest): Promise<InteractRateResult> => {
  const res = await ResourceInteractApi.rate({
    resourceId: params.resourceId,
    score: params.score,
  });
  return { userScore: res.userScore as number };
};

export const createResourceServices = (): IResourceService => ({
  getUserResources,
  getGroupResources,
  renameResource,
  updateResourceTags,
  interactToggleLike,
  interactRate,
});
