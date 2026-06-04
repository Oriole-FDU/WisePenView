import type { ResourceItem } from '@/domains/Resource';
import { normalizeResourceItem } from '@/utils/normalize/normalizeResourceItem';
import type { RateApiResponse, ToggleLikeApiResponse } from '../apis/InteractApi.type';
import type {
  ChangeResourceActionPermissionApiRequest,
  ListResourceItemsApiRequest,
  ResourceListPageApiResponse,
} from '../apis/ResourceApi.type';
import { resourceActionsToApiKeys, TAG_QUERY_LOGIC_MODE } from '../enum';
import type {
  GetUserResourcesRequest,
  InteractRateResult,
  InteractToggleLikeResult,
  ResourceListPage,
  UpdateResourceActionPermissionRequest,
} from '../service/index.type';

/** Service 入参 → GET /resource/item/listResources query */
const mapListResourceItemsRequest = (
  params: GetUserResourcesRequest,
  overrides: Partial<ListResourceItemsApiRequest> = {}
): ListResourceItemsApiRequest => {
  const resourceType = params.resourceType;
  const tagIds = params.tagIds;
  const hasResourceType = resourceType != null && resourceType !== '';
  const hasTagIds = tagIds != null && tagIds.length > 0;

  return {
    page: params.page,
    size: params.size,
    sortBy: params.sortBy,
    sortDir: params.sortDir,
    // fallback：未传时与 OpenAPI 默认 OR 一致
    tagQueryLogicMode: params.tagQueryLogicMode ?? TAG_QUERY_LOGIC_MODE.OR,
    // 不传 resourceType：空串会被后端当作有效筛选值
    ...(hasResourceType ? { resourceType } : {}),
    // 不传 tagIds：空数组仍会触发按标签过滤
    ...(hasTagIds ? { tagIds } : {}),
    // 小组列表等场景由 Service 注入 groupId 等覆盖项
    ...overrides,
  };
};

/** 单条资源：Java Long 字符串、标签派生字段 */
const mapResourceItemFromApi = (raw: ResourceItem): ResourceItem => {
  const item = normalizeResourceItem(raw) as ResourceItem;
  // fallback：无 currentTags 时按空对象处理
  const tagIds = Object.keys(item.currentTags ?? {});

  return {
    ...item,
    // fallback：无标签时为 undefined
    mainTagId: tagIds[0],
    // fallback：仅一个或无标签时为 []
    linkTagIds: tagIds.slice(1),
  };
};

/** 分页列表 API 响应 → Service 领域分页 */
const mapResourceListPageFromApi = (data: ResourceListPageApiResponse): ResourceListPage => {
  const list = data.list.map(mapResourceItemFromApi);

  return {
    list,
    total: data.total,
    page: data.page,
    size: data.size,
    totalPage: data.totalPage,
  };
};

const mapInteractToggleLikeFromApi = (data: ToggleLikeApiResponse): InteractToggleLikeResult => ({
  liked: data.liked,
});

const mapInteractRateFromApi = (data: RateApiResponse): InteractRateResult => ({
  userScore: data.userScore,
});

const mapChangeResourceActionPermissionRequest = (
  params: UpdateResourceActionPermissionRequest
): ChangeResourceActionPermissionApiRequest => {
  const specifiedUsersGrantedActions =
    params.specifiedUsersGrantedActions === null
      ? null
      : params.specifiedUsersGrantedActions
        ? Object.fromEntries(
            Object.entries(params.specifiedUsersGrantedActions).map(([userId, actions]) => [
              userId,
              resourceActionsToApiKeys(actions) ?? [],
            ])
          )
        : undefined;

  return {
    resourceId: params.resourceId,
    overrideGrantedActions: resourceActionsToApiKeys(params.overrideGrantedActions),
    specifiedUsersGrantedActions,
  };
};

export const ResourceServicesMap = {
  mapListResourceItemsRequest,
  mapResourceListPageFromApi,
  mapInteractToggleLikeFromApi,
  mapInteractRateFromApi,
  mapChangeResourceActionPermissionRequest,
};
