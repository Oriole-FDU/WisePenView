import type { UserDisplayBase } from '@/domains/User';
import { normalizeUserDisplayBaseFromApi } from '@/domains/User/mapper/userEnum.mapper';
import { normalizeId } from '@/utils/normalize/normalizeId';

import type {
  ChangeResourceActionPermissionApiRequest,
  ResourceGroupDisplayBaseApiResponse,
  ResourceItemApiResponse,
} from '../apis/ResourceApi.type';
import {
  filterSupportedResourcePermissionActions,
  getSupportedResourcePermissionActions,
  normalizeResourceActions,
  RESOURCE_ACTION,
  RESOURCE_PERMISSION_ACTION_ORDER,
  type ResourceAction,
  type ResourceActionKey,
  resourceActionsToApiKeys,
} from '../enum';
import type {
  ResourcePermissionActionOption,
  ResourcePermissionOverview,
  ResourcePermissionSubject,
  UpdateResourceActionPermissionRequest,
  UpdateResourcePermissionSubjectsRequest,
} from '../service/index.type';
import { isPersonalGroupId, mapResourceItemFromApi } from './resource.mapper';

const resolveUserDisplayName = (
  userInfo: UserDisplayBase | undefined,
  fallbackId: string
): string => userInfo?.realName?.trim() || userInfo?.nickname?.trim() || fallbackId;

const resolveGroupDisplayName = (
  groupInfo: ResourceGroupDisplayBaseApiResponse | undefined,
  fallbackId: string
): string => groupInfo?.groupName?.trim() || fallbackId;

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

export const mapChangeResourceActionPermissionRequest = (
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

export const mapChangeResourceActionPermissionRequestFromSubjects = (
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

const resolveOwnerName = (ownerInfo: UserDisplayBase | undefined, ownerId?: string): string =>
  ownerInfo?.realName?.trim() || ownerInfo?.nickname?.trim() || ownerId || '';

export const mapResourcePermissionOverviewFromApi = (
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
