import { normalizeUserDisplayBaseFromApi } from '@/domains/User/mapper/userEnum.mapper';
import { normalizeId } from '@/utils/normalize/normalizeId';
import { normalizeNonNegativeNumber } from '@/utils/normalize/normalizeNumber';

import type {
  GlobalSearchApiResponse,
  ListResourceItemsApiRequest,
  ResourceGroupGrantedActionsApiResponse,
  ResourceItemApiResponse,
  ResourceListPageApiResponse,
  ResourceSpecifiedUserGrantedActionsApiResponse,
} from '../apis/ResourceApi.type';
import type {
  MountResourcesToGroupApiRequest,
  MovePersonalResourcesToTrashApiRequest,
  MoveResourcesInGroupApiRequest,
  ReplacePersonalNormalTagsApiRequest,
  ResourcePlacementApiResponse,
  SetPersonalResourcesPathTagApiRequest,
  UnmountResourcesToGroupApiRequest,
} from '../apis/ResourcePlacementApi.type';
import type { ResourceItem, ResourceTagBind } from '../entity/resource';
import {
  coerceResourceActions,
  normalizeSearchResourceType,
  type ResourceAction,
  TAG_QUERY_LOGIC_MODE,
} from '../enum';
import type {
  GetUserResourcesRequest,
  MountResourcesToGroupRequest,
  MovePersonalResourcesToTrashRequest,
  MoveResourcesInGroupRequest,
  ReplacePersonalNormalTagsRequest,
  ResourceListPage,
  SearchHitItem,
  SearchResultPage,
  SetPersonalResourcesPathTagRequest,
  UnmountResourcesToGroupRequest,
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
    // 未传时显式使用 OpenAPI 默认 OR。
    tagQueryLogicMode: params.tagQueryLogicMode ?? TAG_QUERY_LOGIC_MODE.OR,
    // 不传 resourceType：空串会被后端当作有效筛选值
    ...(hasResourceType ? { resourceType } : {}),
    // 不传 tagIds：空数组仍会触发按标签过滤
    ...(hasTagIds ? { tagIds } : {}),
    ...(params.includeMyInteraction !== undefined
      ? { includeMyInteraction: params.includeMyInteraction }
      : {}),
    // 小组列表等场景由 Service 注入 groupId 等覆盖项
    ...overrides,
  };
};

export const mapSetPersonalResourcesPathTagRequest = (
  params: SetPersonalResourcesPathTagRequest
): SetPersonalResourcesPathTagApiRequest => ({
  resourceIds: params.resourceIds,
  targetPathTagId: params.targetPathTagId,
});

export const mapMovePersonalResourcesToTrashRequest = (
  params: MovePersonalResourcesToTrashRequest
): MovePersonalResourcesToTrashApiRequest => ({
  resourceIds: params.resourceIds,
});

export const mapReplacePersonalNormalTagsRequest = (
  params: ReplacePersonalNormalTagsRequest
): ReplacePersonalNormalTagsApiRequest => ({
  resourceIds: params.resourceIds,
  normalTagIds: params.normalTagIds,
});

export const mapMountResourcesToGroupRequest = (
  params: MountResourcesToGroupRequest
): MountResourcesToGroupApiRequest => ({
  resourceIds: params.resourceIds,
  groupId: params.groupId,
  targetTagId: params.targetTagId,
});

export const mapUnmountResourcesToGroupRequest = (
  params: UnmountResourcesToGroupRequest
): UnmountResourcesToGroupApiRequest => ({
  groupId: params.groupId,
  resourceSourceTagMap: params.resourceSourceTagMap,
});

export const mapMoveResourcesInGroupRequest = (
  params: MoveResourcesInGroupRequest
): MoveResourcesInGroupApiRequest => ({
  groupId: params.groupId,
  resourceSourceTagMap: params.resourceSourceTagMap,
  targetTagId: params.targetTagId,
});

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
  tagBinds: ResourceItemApiResponse['tagBinds']
): ResourceTagBind[] | undefined =>
  tagBinds?.map((bind) => ({
    groupId: bind.groupId,
    primaryTagId: bind.primaryTagId,
    tags: Object.fromEntries(
      Object.entries(bind.tags).map(([tagId, tagInfo]) => [
        tagId,
        {
          tagName: tagInfo.tagName,
          tagDesc: tagInfo.tagDesc ?? undefined,
          tagIcon: tagInfo.tagIcon ?? undefined,
          tagColor: tagInfo.tagColor ?? undefined,
          tagCreator: tagInfo.tagCreator ?? undefined,
          isPath: tagInfo.isPath,
        },
      ])
    ),
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
      return subjectId ? ([subjectId, coerceResourceActions(item.grantedActions)] as const) : null;
    })
    .filter((entry): entry is readonly [string, ResourceAction[]] => Boolean(entry));
  return entries.length > 0 ? Object.fromEntries(entries) : null;
};

/** 单条资源：Java Long 字符串、标签派生字段 */
export const mapResourceItemFromApi = (
  raw: ResourceItemApiResponse,
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
    currentActions: coerceResourceActions(raw.currentActions),
    resourceAccessRole: raw.resourceAccessRole,
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
  data: ResourceListPageApiResponse,
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
const mapSearchHitFromApi = (raw: GlobalSearchApiResponse['list'][number]): SearchHitItem => ({
  ...raw,
  resourceType: normalizeSearchResourceType(raw.resourceType),
  resourceIconType: resolveResourceIconType(raw.resourceType),
});

export const mapSearchResultPageFromApi = (data: GlobalSearchApiResponse): SearchResultPage => ({
  list: data.list.map(mapSearchHitFromApi),
  total: data.total,
  page: data.page,
  size: data.size,
  totalPage: data.totalPage,
});
