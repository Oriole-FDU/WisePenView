import type { ResourceItem, ResourceTagBind } from '@/domains/Resource';
import type { UserDisplayBase } from '@/domains/User';
import { normalizeUserDisplayBaseFromApi } from '@/domains/User/mapper/userEnum.mapper';
import { normalizeId } from '@/utils/normalize/normalizeId';
import { normalizeNonNegativeNumber } from '@/utils/normalize/normalizeNumber';
import type {
  ChangeResourceActionPermissionApiRequest,
  GlobalSearchApiResponse,
  ListResourceItemsApiRequest,
  ResourceGroupDisplayBaseApiResponse,
  ResourceGroupGrantedActionsApiResponse,
  ResourceItemApiResponse,
  ResourceListPageApiResponse,
  ResourceSpecifiedUserGrantedActionsApiResponse,
} from '../apis/ResourceApi.type';
import {
  areResourcePermissionActionsEqual,
  coerceResourceActions,
  filterSupportedResourcePermissionActions,
  getSupportedResourcePermissionActions,
  normalizeResourceActions,
  normalizeSearchResourceType,
  RESOURCE_ACTION,
  RESOURCE_PERMISSION_ACTION_ORDER,
  resourceActionsToApiKeys,
  TAG_QUERY_LOGIC_MODE,
  type ResourceAction,
  type ResourceActionKey,
} from '../enum';
import type {
  GetUserResourcesRequest,
  ResourceListPage,
  ResourcePermissionActionOption,
  ResourcePermissionGroupInfo,
  ResourcePermissionHydration,
  ResourcePermissionOverview,
  ResourcePermissionSubject,
  ResourcePermissionUserInfo,
  SearchHitItem,
  SearchResultPage,
  UpdateResourceActionPermissionRequest,
  UpdateResourcePermissionSubjectsRequest,
} from '../service/index.type';
import { resolveResourceIconType } from '../utils/resolveResourceIconType';

const PERSONAL_GROUP_PREFIX = 'p_';
const isPersonalGroupId = (groupId?: string): boolean =>
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
    tags: bind.tags,
  }));

const mapMyInteractionFromApi = (
  interaction: ResourceItemApiResponse['myInteractionRecord']
): ResourceItem['myInteraction'] => {
  if (!interaction) return undefined;
  return {
    read: interaction.read === true,
    liked: interaction.liked === true,
    score: normalizeNonNegativeNumber(interaction.score),
    likedCommentIds: Array.isArray(interaction.likedCommentIds)
      ? interaction.likedCommentIds.filter((commentId): commentId is string =>
          Boolean(commentId?.trim())
        )
      : [],
  };
};

const resolveUserDisplayName = (
  userInfo: UserDisplayBase | undefined,
  fallbackId: string
): string => userInfo?.realName?.trim() || userInfo?.nickname?.trim() || fallbackId;

const resolveGroupDisplayName = (
  groupInfo: ResourceGroupDisplayBaseApiResponse | undefined,
  fallbackId: string
): string => groupInfo?.groupName?.trim() || fallbackId;

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

const mapOverrideGroupInfoByIdFromApi = (
  value: ResourceItemApiResponse['overrideGrantedActions']
): Record<string, ResourceGroupDisplayBaseApiResponse> => {
  if (!Array.isArray(value)) return {};
  return Object.fromEntries(
    value
      .map((item) => {
        const groupId = normalizeId(item.groupId);
        return groupId && item.groupInfo ? ([groupId, item.groupInfo] as const) : null;
      })
      .filter((entry): entry is readonly [string, ResourceGroupDisplayBaseApiResponse] =>
        Boolean(entry)
      )
  );
};

const mapSpecifiedUserInfoByIdFromApi = (
  value: ResourceItemApiResponse['specifiedUsersGrantedActions']
): Record<string, UserDisplayBase> => {
  if (!Array.isArray(value)) return {};
  return Object.fromEntries(
    value
      .map((item) => {
        const userId = normalizeId(item.userId);
        const userInfo = normalizeUserDisplayBaseFromApi(item.userInfo);
        return userId && userInfo ? ([userId, userInfo] as const) : null;
      })
      .filter((entry): entry is readonly [string, UserDisplayBase] => Boolean(entry))
  );
};

/** 单条资源：Java Long 字符串、标签派生字段 */
const mapResourceItemFromApi = (
  raw: ResourceItemApiResponse,
  context: MapResourceItemContext = {}
): ResourceItem => {
  const interactionInfo = raw.resourceInteractionInfo;
  const scoreCount = normalizeNonNegativeNumber(interactionInfo?.scoreCount) ?? 0;
  const scoreTotal = normalizeNonNegativeNumber(interactionInfo?.scoreTotal) ?? 0;
  const item: ResourceItem = {
    resourceId: raw.resourceId,
    resourceName: raw.resourceName,
    ownerId: raw.ownerId,
    ownerInfo: normalizeUserDisplayBaseFromApi(raw.ownerInfo) ?? {},
    resourceType: raw.resourceType,
    preview: raw.preview,
    // 后端 resourceInfo.size 当前以字符串返回，前端统一归一化为 number。
    size: normalizeNonNegativeNumber(raw.size),
    path: raw.path,
    tagBinds: mapResourceTagBindsFromApi(raw.tagBinds),
    currentActions: coerceResourceActions(raw.currentActions),
    resourceAccessRole: raw.resourceAccessRole,
    overrideGrantedActions: normalizeResourceActionMap(raw.overrideGrantedActions),
    specifiedUsersGrantedActions: normalizeResourceActionMap(raw.specifiedUsersGrantedActions),
    readCount: normalizeNonNegativeNumber(interactionInfo?.readCount),
    likeCount: normalizeNonNegativeNumber(interactionInfo?.likeCount),
    favoriteCount: normalizeNonNegativeNumber(interactionInfo?.favoriteCount),
    commentCount: normalizeNonNegativeNumber(interactionInfo?.commentCount),
    scoreAvg: scoreCount > 0 ? scoreTotal / scoreCount : null,
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
    linkTagIds: mainTagId ? tagIds.filter((tagId) => tagId !== mainTagId) : tagIds.slice(1),
  };
};

/** 分页列表 API 响应 → Service 领域分页 */
const mapResourceListPageFromApi = (
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

/** userId → ResourceAction[] 转为 API 请求的 userId → 枚举 key[]；null/undefined 原样透传 */
const mapSpecifiedUsersGrantedActionsToApi = (
  value: UpdateResourceActionPermissionRequest['specifiedUsersGrantedActions']
): ChangeResourceActionPermissionApiRequest['specifiedUsersGrantedActions'] => {
  if (value === null) {
    return null;
  }
  if (value === undefined) {
    return undefined;
  }

  const byUserId: Record<string, ResourceActionKey[]> = {};
  for (const userId in value) {
    byUserId[userId] = resourceActionsToApiKeys(value[userId]) ?? [];
  }
  return byUserId;
};

/** groupId → ResourceAction[] 转为 API 请求的 groupId → 枚举 key[]；null 表示清空整组覆盖配置。 */
const mapOverrideGrantedActionsToApi = (
  value: UpdateResourceActionPermissionRequest['overrideGrantedActions']
): ChangeResourceActionPermissionApiRequest['overrideGrantedActions'] => {
  if (value === null) {
    return null;
  }
  if (value === undefined) {
    return undefined;
  }

  const byGroupId: Record<string, ResourceActionKey[] | null> = {};
  for (const groupId in value) {
    const actions = value[groupId];
    byGroupId[groupId] = actions === null ? null : (resourceActionsToApiKeys(actions) ?? []);
  }
  return byGroupId;
};

const mapChangeResourceActionPermissionRequest = (
  params: UpdateResourceActionPermissionRequest
): ChangeResourceActionPermissionApiRequest => {
  return {
    resourceId: params.resourceId,
    overrideGrantedActions: mapOverrideGrantedActionsToApi(params.overrideGrantedActions),
    specifiedUsersGrantedActions: mapSpecifiedUsersGrantedActionsToApi(
      params.specifiedUsersGrantedActions
    ),
  };
};

const mapChangeResourceActionPermissionRequestFromSubjects = (
  params: UpdateResourcePermissionSubjectsRequest
): ChangeResourceActionPermissionApiRequest => {
  const overrideGrantedActions: Record<string, ResourceAction[] | null> = {};
  const specifiedUsersGrantedActions: Record<string, ResourceAction[]> = {};

  for (const subject of params.subjects) {
    if (isPersonalGroupId(subject.groupId)) continue;
    if (subject.source === 'tag' && subject.groupId) {
      overrideGrantedActions[subject.groupId] = null;
      continue;
    }
    if (subject.readonly) continue;
    if (subject.source === 'resourceOverride' && subject.groupId) {
      overrideGrantedActions[subject.groupId] = normalizeResourceActions(subject.editableActions);
    }
    if (subject.source === 'specifiedUser' && subject.userId) {
      specifiedUsersGrantedActions[subject.userId] = normalizeResourceActions(
        subject.editableActions
      );
    }
  }

  return mapChangeResourceActionPermissionRequest({
    resourceId: params.resourceId,
    overrideGrantedActions:
      Object.keys(overrideGrantedActions).length > 0 ? overrideGrantedActions : undefined,
    specifiedUsersGrantedActions:
      Object.keys(specifiedUsersGrantedActions).length > 0 ? specifiedUsersGrantedActions : null,
  });
};

const mapPermissionActionOptions = (
  supportedActions: ResourceAction[]
): ResourcePermissionActionOption[] => {
  return supportedActions.map((action) => ({
    action,
    key: RESOURCE_ACTION.getKey(action) ?? String(action),
    label: RESOURCE_ACTION.getKey(action) ?? String(action),
    supported: true,
  }));
};

const filterPermissionActionsByOptions = (
  actions: ResourceAction[] | null | undefined,
  actionOptions: ResourcePermissionActionOption[]
): ResourceAction[] =>
  filterSupportedResourcePermissionActions(
    actions,
    actionOptions.filter((option) => option.supported).map((option) => option.action)
  );

const arePermissionActionsEqualByOptions = (
  left: ResourceAction[] | null | undefined,
  right: ResourceAction[] | null | undefined,
  actionOptions: ResourcePermissionActionOption[]
): boolean =>
  areResourcePermissionActionsEqual(
    left,
    right,
    actionOptions.filter((option) => option.supported).map((option) => option.action)
  );

const resolveOwnerName = (ownerInfo: UserDisplayBase | undefined, ownerId?: string): string =>
  ownerInfo?.realName?.trim() || ownerInfo?.nickname?.trim() || ownerId || '';

const mapResourcePermissionOverviewFromApi = (
  raw: ResourceItemApiResponse,
  fallbackResourceId: string
): ResourcePermissionOverview => {
  const overrideGroupInfoById = mapOverrideGroupInfoByIdFromApi(raw.overrideGrantedActions);
  const specifiedUserInfoById = mapSpecifiedUserInfoByIdFromApi(raw.specifiedUsersGrantedActions);
  const resourceInfo = mapResourceItemFromApi(raw);
  const ownerInfo = resourceInfo.ownerInfo;
  const resourceId = resourceInfo.resourceId || fallbackResourceId;
  const supportedActions = getSupportedResourcePermissionActions(resourceInfo.resourceType);
  const actionOptions = mapPermissionActionOptions(supportedActions);
  const ownerActions = filterSupportedResourcePermissionActions(
    RESOURCE_PERMISSION_ACTION_ORDER,
    supportedActions
  );
  const subjects: ResourcePermissionSubject[] = [];
  const owner: ResourcePermissionSubject = {
    id: `owner:${resourceInfo.ownerId || resourceId}`,
    kind: 'owner',
    source: 'owner',
    name: resolveOwnerName(ownerInfo, resourceInfo.ownerId),
    description: '',
    avatar: ownerInfo?.avatar,
    userId: resourceInfo.ownerId,
    effectiveActions: ownerActions,
    editableActions: ownerActions,
    readonly: true,
  };

  subjects.push(owner);

  const overrideGrantedActions = resourceInfo.overrideGrantedActions;
  const specifiedUsersGrantedActions = resourceInfo.specifiedUsersGrantedActions;
  const visibleOverrideGrantedActions = Object.fromEntries(
    Object.entries(overrideGrantedActions ?? {}).filter(([groupId]) => !isPersonalGroupId(groupId))
  );
  const overrideGroupIds = new Set(Object.keys(visibleOverrideGrantedActions));
  const primaryTagByGroupId = new Map<string, { tagId?: string }>();

  for (const bind of resourceInfo.tagBinds ?? []) {
    const groupId = bind.groupId;
    if (!groupId || isPersonalGroupId(groupId)) continue;
    primaryTagByGroupId.set(groupId, {
      tagId: bind.primaryTagId,
    });

    if (overrideGroupIds.has(groupId)) continue;
    subjects.push({
      id: `group:${groupId}:tag`,
      kind: 'group',
      source: 'tag',
      name: groupId,
      description: '',
      groupId,
      primaryTagId: bind.primaryTagId,
      effectiveActions: [],
      editableActions: [],
    });
  }

  for (const [groupId, actions] of Object.entries(visibleOverrideGrantedActions)) {
    const filteredActions = filterSupportedResourcePermissionActions(actions, supportedActions);
    const primaryTag = primaryTagByGroupId.get(groupId);
    const groupInfo = overrideGroupInfoById[groupId];
    subjects.push({
      id: `group:${groupId}:override`,
      kind: 'group',
      source: 'resourceOverride',
      name: resolveGroupDisplayName(groupInfo, groupId),
      description: groupInfo?.groupDesc ?? '',
      avatar: groupInfo?.groupCoverUrl ?? undefined,
      groupId,
      primaryTagId: primaryTag?.tagId,
      effectiveActions: filteredActions,
      editableActions: filteredActions,
    });
  }

  for (const [userId, actions] of Object.entries(specifiedUsersGrantedActions ?? {})) {
    const filteredActions = filterSupportedResourcePermissionActions(actions, supportedActions);
    const userInfo = specifiedUserInfoById[userId];
    subjects.push({
      id: `user:${userId}:specified`,
      kind: 'user',
      source: 'specifiedUser',
      name: resolveUserDisplayName(userInfo, userId),
      description: '',
      avatar: userInfo?.avatar,
      userId,
      effectiveActions: filteredActions,
      editableActions: filteredActions,
    });
  }

  return {
    resourceId,
    resourceType: resourceInfo.resourceType,
    owner,
    subjects,
    supportedActions,
    actionOptions,
  };
};

const resolvePermissionUserDisplayName = (
  userInfo: ResourcePermissionUserInfo,
  fallbackName: string
): string =>
  userInfo.realName?.trim() ||
  userInfo.nickname?.trim() ||
  userInfo.username.trim() ||
  fallbackName;

const mergePermissionSubjectMetadata = (
  subject: ResourcePermissionSubject,
  userInfo: ResourcePermissionUserInfo | undefined,
  groupInfo: ResourcePermissionGroupInfo | undefined
): ResourcePermissionSubject => {
  let nextSubject = subject;
  if (userInfo) {
    const nextName = resolvePermissionUserDisplayName(userInfo, subject.name);
    const nextAvatar = userInfo.avatar?.trim() || subject.avatar;
    if (nextSubject.name !== nextName || nextSubject.avatar !== nextAvatar) {
      nextSubject = {
        ...nextSubject,
        name: nextName,
        avatar: nextAvatar,
      };
    }
  }

  if (groupInfo) {
    const groupName = groupInfo.groupName.trim();
    const groupDescription = groupInfo.groupDesc.trim();
    const nextName = groupName || nextSubject.name;
    const nextDescription =
      nextSubject.source === 'resourceOverride' && groupDescription
        ? groupDescription
        : nextSubject.description;
    const nextAvatar = groupInfo.groupCoverUrl.trim() || nextSubject.avatar;
    if (
      nextSubject.name !== nextName ||
      nextSubject.description !== nextDescription ||
      nextSubject.avatar !== nextAvatar
    ) {
      nextSubject = {
        ...nextSubject,
        name: nextName,
        description: nextDescription,
        avatar: nextAvatar,
      };
    }
  }

  return nextSubject;
};

const mergePermissionSubjectInheritedActions = (
  subject: ResourcePermissionSubject,
  inheritedActions: ResourceAction[] | undefined,
  actionOptions: ResourcePermissionActionOption[]
): ResourcePermissionSubject => {
  if (!subject.groupId || !subject.primaryTagId || !inheritedActions) return subject;
  const normalizedInheritedActions = filterPermissionActionsByOptions(
    inheritedActions,
    actionOptions
  );

  if (subject.source === 'resourceOverride') {
    const matchesTag = arePermissionActionsEqualByOptions(
      subject.editableActions,
      normalizedInheritedActions,
      actionOptions
    );
    if (matchesTag) {
      return {
        ...subject,
        id: `group:${subject.groupId}:tag`,
        source: 'tag',
        description: '',
        editableActions: normalizedInheritedActions,
        effectiveActions: normalizedInheritedActions,
        inheritedActions: normalizedInheritedActions,
      };
    }
  }

  if (subject.source === 'tag') {
    return {
      ...subject,
      description: '',
      editableActions: normalizedInheritedActions,
      effectiveActions: normalizedInheritedActions,
      inheritedActions: normalizedInheritedActions,
    };
  }

  return {
    ...subject,
    inheritedActions: normalizedInheritedActions,
  };
};

/** 二次补全失败时不覆盖原始字段，避免展示数据请求失败导致权限主体消失。 */
const mergeResourcePermissionSubject = (
  subject: ResourcePermissionSubject,
  hydration: ResourcePermissionHydration,
  actionOptions: ResourcePermissionActionOption[]
): ResourcePermissionSubject => {
  const withMetadata = mergePermissionSubjectMetadata(
    subject,
    subject.userId ? hydration.userInfoById.get(subject.userId) : undefined,
    subject.groupId ? hydration.groupInfoById.get(subject.groupId) : undefined
  );
  return mergePermissionSubjectInheritedActions(
    withMetadata,
    hydration.inheritedActionsBySubjectId.get(subject.id),
    actionOptions
  );
};

export const mergeResourcePermissionHydration = (
  overview: ResourcePermissionOverview,
  hydration: ResourcePermissionHydration
): ResourcePermissionOverview => {
  const actionOptions = overview.actionOptions;
  const subjects = overview.subjects.map((subject) =>
    mergeResourcePermissionSubject(subject, hydration, actionOptions)
  );
  const owner = overview.owner
    ? mergeResourcePermissionSubject(overview.owner, hydration, actionOptions)
    : overview.owner;

  return {
    ...overview,
    owner,
    subjects,
  };
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

// 枚举归一化大小写，下游 === 比较与分组 label 生效
const mapSearchHitFromApi = (raw: GlobalSearchApiResponse['list'][number]): SearchHitItem => ({
  ...raw,
  resourceType: normalizeSearchResourceType(raw.resourceType),
  resourceIconType: resolveResourceIconType(raw.resourceType),
});

const mapSearchResultPageFromApi = (data: GlobalSearchApiResponse): SearchResultPage => ({
  list: data.list.map(mapSearchHitFromApi),
  total: data.total,
  page: data.page,
  size: data.size,
  totalPage: data.totalPage,
});

export const ResourceServicesMap = {
  mapListResourceItemsRequest,
  mapResourceListPageFromApi,
  mapResourceItemFromApi,
  mapChangeResourceActionPermissionRequest,
  mapChangeResourceActionPermissionRequestFromSubjects,
  mapResourcePermissionOverviewFromApi,
  mergeResourcePermissionHydration,
  mapSearchResultPageFromApi,
};
