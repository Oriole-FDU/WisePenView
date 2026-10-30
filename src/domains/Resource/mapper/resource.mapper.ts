import { parseResourceActions, type ResourceAction } from '@/domains/_shared/access';
import { normalizeUserDisplayBaseFromApi } from '@/domains/User/mapper/userEnum.mapper';
import { normalizeId } from '@/utils/normalize/normalizeId';
import { normalizeNonNegativeNumber } from '@/utils/normalize/normalizeNumber';

import type {
  ResourceGroupGrantedActionsApiResponse,
  ResourceItemApiResponse,
  ResourceSpecifiedUserGrantedActionsApiResponse,
} from '../apis/ResourceApi.type';
import type {
  GlobalSearchResourcesApiContractResponse,
  ListResourcesApiContractRequest,
  ListResourcesApiContractResponse,
} from '../apis/ResourceCoreApi.contract';
import type { ResourceItemApi as ResourceItemApiValue } from '../apis/ResourceCoreApi.schema';
import type { ResourcePlacementApiResponse } from '../apis/ResourcePlacementApi.type';
import type { ResourceItem, ResourceTagBind } from '../entity/resource';
import { normalizeSearchResourceType, TAG_QUERY_LOGIC_MODE } from '../enum';
import type {
  GetUserResourcesRequest,
  ResourceListPage,
  SearchHitItem,
  SearchResultPage,
} from '../service/index.type';
import { resolveResourceIconType } from '../utils/resolveResourceIconType';

const PERSONAL_GROUP_PREFIX = 'p_';

export const isPersonalGroupId = (groupId?: string): boolean =>
  groupId?.startsWith(PERSONAL_GROUP_PREFIX) ?? false;

type ResourcePermissionActionField =
  | ResourceGroupGrantedActionsApiResponse[]
  | ResourceSpecifiedUserGrantedActionsApiResponse[]
  | null
  | undefined;

interface MapResourceItemContext {
  groupId?: string;
}

/** Service 入参 → GET /resource/item/listResources query */
export const mapListResourceItemsRequest = (
  params: GetUserResourcesRequest,
  overrides: Partial<ListResourcesApiContractRequest> = {}
): ListResourcesApiContractRequest => {
  const resourceType = params.resourceType;
  const tagIds = params.tagIds;
  const hasResourceType = resourceType != null && resourceType !== '';
  const hasTagIds = tagIds != null && tagIds.length > 0;

  return {
    page: params.page,
    size: params.size,
    sortBy: params.sortBy,
    sortDir: params.sortDir,
    // 未传时显式使用 OpenAPI 默认 OR。
    tagQueryLogicMode: params.tagQueryLogicMode ?? TAG_QUERY_LOGIC_MODE.OR,
    // 不传 resourceType：空串会被后端当作有效筛选值
    ...(hasResourceType
      ? { resourceType: resourceType as ListResourcesApiContractRequest['resourceType'] }
      : {}),
    // 不传 tagIds：空数组仍会触发按标签过滤
    ...(hasTagIds ? { tagIds } : {}),
    ...(params.includeMyInteraction !== undefined
      ? { includeMyInteraction: params.includeMyInteraction }
      : {}),
    // 小组列表等场景由 Service 注入 groupId 等覆盖项
    ...overrides,
  };
};

export const mapResourcePlacementCountFromApi = (data: ResourcePlacementApiResponse): number =>
  data.resourceCount;

const resolveCurrentTagBind = (
  item: ResourceItem,
  context: MapResourceItemContext
): ResourceTagBind | undefined => {
  const binds = item.tagBinds ?? [];
  if (binds.length === 0) return undefined;
  if (context.groupId) {
    return binds.find((bind) => bind.groupId === context.groupId) ?? binds[0];
  }
  return binds.find((bind) => isPersonalGroupId(bind.groupId)) ?? binds[0];
};

const mapTagsToCurrentTags = (
  tags: ResourceTagBind['tags']
): Record<string, string> | undefined => {
  if (!tags) return undefined;
  return Object.fromEntries(
    Object.entries(tags).map(([tagId, tagInfo]) => [tagId, tagInfo?.tagName ?? ''])
  );
};

const mapResourceTagBindsFromApi = (
  tagBinds:
    NonNullable<ResourceItemApiResponse['tagBinds'] | ResourceItemApiValue['tagBinds']> | undefined
): ResourceTagBind[] | undefined =>
  tagBinds?.map((bind) => ({
    groupId: bind.groupId,
    primaryTagId: bind.primaryTagId,
    tags: bind.tags
      ? Object.fromEntries(
          Object.entries(bind.tags).map(([tagId, tag]) => [
            tagId,
            tag
              ? {
                  tagName: tag.tagName ?? undefined,
                  tagDesc: tag.tagDesc ?? undefined,
                  tagIcon: tag.tagIcon ?? undefined,
                  tagColor: tag.tagColor ?? undefined,
                  tagCreator: tag.tagCreator ?? undefined,
                  isPath: tag.isPath ?? undefined,
                }
              : null,
          ])
        )
      : undefined,
  }));

const mapMyInteractionFromApi = (
  interaction: ResourceItemApiResponse['myInteractionRecord']
): ResourceItem['myInteraction'] => {
  if (!interaction) return undefined;
  return {
    read: interaction.read === true,
  };
};

const isGrantedActionListItem = (
  value: unknown
): value is
  ResourceGroupGrantedActionsApiResponse | ResourceSpecifiedUserGrantedActionsApiResponse =>
  value != null && typeof value === 'object' && 'grantedActions' in value;

const getGrantedActionSubjectId = (
  item: ResourceGroupGrantedActionsApiResponse | ResourceSpecifiedUserGrantedActionsApiResponse
): string => {
  if ('groupId' in item) return normalizeId(item.groupId);
  return normalizeId(item.userId);
};

const normalizeResourceActionMap = (
  value?: ResourcePermissionActionField
): Record<string, ResourceAction[]> | null => {
  if (value == null) {
    return null;
  }

  const entries = value
    .filter(isGrantedActionListItem)
    .map((item) => {
      const subjectId = getGrantedActionSubjectId(item);
      return subjectId ? ([subjectId, parseResourceActions(item.grantedActions)] as const) : null;
    })
    .filter((entry): entry is readonly [string, ResourceAction[]] => Boolean(entry));
  return entries.length > 0 ? Object.fromEntries(entries) : null;
};

/** 单条资源：Java Long 字符串、标签派生字段 */
export const mapResourceItemFromApi = (
  raw: ResourceItemApiResponse | ResourceItemApiValue,
  context: MapResourceItemContext = {}
): ResourceItem => {
  const interactionInfo = raw.resourceInteractionInfo;
  const item: ResourceItem = {
    resourceId: raw.resourceId,
    resourceName: raw.resourceName,
    ownerId: raw.ownerId,
    ownerInfo: normalizeUserDisplayBaseFromApi(raw.ownerInfo) ?? {},
    resourceType: raw.resourceType,
    preview: raw.preview ?? undefined,
    // 后端 resourceInfo.size 当前以字符串返回，前端统一归一化为 number。
    size: normalizeNonNegativeNumber(raw.size),
    tagBinds: mapResourceTagBindsFromApi(raw.tagBinds),
    currentActions: parseResourceActions(raw.currentActions),
    resourceAccessRole: 'resourceAccessRole' in raw ? raw.resourceAccessRole : undefined,
    overrideGrantedActions: normalizeResourceActionMap(raw.overrideGrantedActions),
    specifiedUsersGrantedActions: normalizeResourceActionMap(raw.specifiedUsersGrantedActions),
    readCount: normalizeNonNegativeNumber(interactionInfo?.readCount),
    likeCount: normalizeNonNegativeNumber(interactionInfo?.likeCount),
    favoriteCount: normalizeNonNegativeNumber(interactionInfo?.favoriteCount),
    myInteraction: mapMyInteractionFromApi(raw.myInteractionRecord),
  };
  const currentTagBind = resolveCurrentTagBind(item, context);
  const currentTags = mapTagsToCurrentTags(currentTagBind?.tags);
  const tagIds = Object.keys(currentTags ?? {});
  const mainTagId = currentTagBind?.primaryTagId ?? tagIds[0];

  return {
    ...item,
    currentTags,
    resourceIconType: resolveResourceIconType(item.resourceType),
    mainTagId,
  };
};

/** 分页列表 API 响应 → Service 领域分页 */
export const mapResourceListPageFromApi = (
  data: ListResourcesApiContractResponse,
  context: MapResourceItemContext = {}
): ResourceListPage => {
  const list = data.list.map((item) => mapResourceItemFromApi(item, context));

  return {
    list,
    total: data.total,
    page: data.page,
    size: data.size,
    totalPage: data.totalPage,
  };
};

// 枚举归一化大小写，下游 === 比较与分组 label 生效
const mapSearchHitFromApi = (
  raw: GlobalSearchResourcesApiContractResponse['list'][number]
): SearchHitItem => ({
  ...raw,
  resourceType: normalizeSearchResourceType(raw.resourceType),
  resourceIconType: resolveResourceIconType(raw.resourceType),
});

export const mapSearchResultPageFromApi = (
  data: GlobalSearchResourcesApiContractResponse
): SearchResultPage => ({
  list: data.list.map(mapSearchHitFromApi),
  total: data.total,
  page: data.page,
  size: data.size,
  totalPage: data.totalPage,
});
