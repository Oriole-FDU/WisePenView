import { mockPage, mockResponse } from '@/domains/_shared/mock/response';

import type { ResourceItemApi as ResourceItemApiContract } from '../apis/ResourceApi';
import type { ResourceItemApiResponse } from '../apis/ResourceApi.type';
import type {
  ResourceCoreItemApi,
  ResourceTagInfoApi,
  ResourceTypeApi,
} from '../apis/ResourceCoreApi.schema';
import { ResourceTypeApiSchema } from '../apis/ResourceCoreApi.schema';
import { getMockResource, mockResources } from './resourceStore';
import { simulateGlobalSearch } from './searchMockData';

const normalizeResourceType = (value?: string): ResourceTypeApi => {
  const normalized = value?.trim().toUpperCase();
  return normalized && (ResourceTypeApiSchema.options as readonly string[]).includes(normalized)
    ? (normalized as ResourceTypeApi)
    : 'UNKNOWN';
};

const normalizeUserDisplay = (
  value: ResourceItemApiResponse['ownerInfo'] | null | undefined
): ResourceCoreItemApi['ownerInfo'] => {
  const identityType = Number(value?.identityType);
  return {
    nickname: value?.nickname ?? null,
    username: value?.username ?? null,
    avatar: value?.avatar ?? null,
    identityType:
      identityType === 1 || identityType === 2 || identityType === 3 ? identityType : null,
    realName: value?.realName ?? null,
    campusNo: value?.campusNo ?? null,
    email: value?.email ?? null,
    mobile: value?.mobile ?? null,
  };
};

const normalizeTagInfo = (value: Partial<ResourceTagInfoApi> | null | undefined) => ({
  groupId: value?.groupId ?? null,
  tagName: value?.tagName?.trim() || 'UNKNOWN',
  tagDesc: value?.tagDesc ?? null,
  tagIcon: value?.tagIcon ?? null,
  tagColor: value?.tagColor ?? null,
  tagMetaInfo: value?.tagMetaInfo ?? null,
  tagCreator: value?.tagCreator ?? null,
  isPath: value?.isPath ?? null,
});

const toInteractionCount = (value: string | number | null | undefined): number => {
  const count = Number(value ?? 0);
  return Number.isSafeInteger(count) && count >= 0 ? count : 0;
};

const toResourceCoreItem = (item: ResourceItemApiResponse): ResourceCoreItemApi => ({
  resourceId: item.resourceId,
  resourceName: item.resourceName,
  resourceType: normalizeResourceType(item.resourceType),
  ownerId: item.ownerId ?? '1',
  ownerInfo: normalizeUserDisplay(item.ownerInfo),
  preview: item.preview ?? null,
  size: item.size == null ? null : String(item.size),
  resourceInteractionInfo: item.resourceInteractionInfo
    ? {
        readCount: toInteractionCount(item.resourceInteractionInfo.readCount),
        likeCount: toInteractionCount(item.resourceInteractionInfo.likeCount),
        scoreCount: toInteractionCount(item.resourceInteractionInfo.scoreCount),
        scoreTotal: toInteractionCount(item.resourceInteractionInfo.scoreTotal),
        favoriteCount: toInteractionCount(item.resourceInteractionInfo.favoriteCount),
        commentCount: toInteractionCount(item.resourceInteractionInfo.commentCount),
      }
    : null,
  myInteractionRecord: item.myInteractionRecord
    ? {
        read: item.myInteractionRecord.read ?? false,
        liked: item.myInteractionRecord.liked ?? false,
        score: item.myInteractionRecord.score ?? null,
        likedCommentIds: item.myInteractionRecord.likedCommentIds ?? [],
        resourceId: item.myInteractionRecord.resourceId ?? item.resourceId,
      }
    : null,
  tagBinds: (item.tagBinds ?? []).flatMap((bind) => {
    const tagIds = Object.keys(bind.tags ?? {});
    const primaryTagId = bind.primaryTagId ?? tagIds[0];
    if (!bind.groupId || !primaryTagId) return [];
    return [
      {
        groupId: bind.groupId,
        primaryTagId,
        tags: Object.fromEntries(
          Object.entries(bind.tags ?? {}).map(([tagId, tag]) => [
            tagId,
            tag ? normalizeTagInfo(tag) : null,
          ])
        ),
      },
    ];
  }),
  currentActions: item.currentActions ?? [],
  overrideGrantedActions:
    item.overrideGrantedActions?.map((grant) => ({
      groupId: grant.groupId,
      groupInfo: grant.groupInfo
        ? {
            groupName: grant.groupInfo.groupName ?? null,
            groupDesc: grant.groupInfo.groupDesc ?? null,
            groupCoverUrl: grant.groupInfo.groupCoverUrl ?? null,
            groupType:
              grant.groupInfo.groupType === 1 ||
              grant.groupInfo.groupType === 2 ||
              grant.groupInfo.groupType === 3
                ? grant.groupInfo.groupType
                : null,
            groupMetaInfo: grant.groupInfo.groupMetaInfo ?? null,
          }
        : null,
      grantedActions: grant.grantedActions ?? null,
    })) ?? null,
  specifiedUsersGrantedActions:
    item.specifiedUsersGrantedActions?.map((grant) => ({
      userId: grant.userId,
      userInfo: grant.userInfo ? normalizeUserDisplay(grant.userInfo) : null,
      grantedActions: grant.grantedActions ?? null,
    })) ?? null,
});

export const ResourceItemApi: typeof ResourceItemApiContract = {
  listResources: (params) => {
    const rows = [...mockResources.values()].filter((resource) => {
      if (
        params.resourceType &&
        resource.resourceType?.toUpperCase() !== params.resourceType.toUpperCase()
      )
        return false;
      const bind = resource.tagBinds?.find((item) => item.groupId === params.groupId);
      if (!bind) return false;
      if (!params.tagIds?.length) return true;
      const hasTag = (id: string) => Object.hasOwn(bind.tags ?? {}, id);
      return params.tagQueryLogicMode === 'OR'
        ? params.tagIds.some(hasTag)
        : params.tagIds.every(hasTag);
    });
    if (params.sortBy === 'NAME')
      rows.sort(
        (a, b) =>
          a.resourceName.localeCompare(b.resourceName) * (params.sortDir === 'DESC' ? -1 : 1)
      );
    return mockResponse(mockPage(rows.map(toResourceCoreItem), params));
  },
  renameResource: async ({ resourceId, newName }) => {
    getMockResource(resourceId).resourceName = newName;
    return null;
  },
  removeResources: async ({ resourceIds }) => {
    resourceIds.forEach((id) => mockResources.delete(id));
    return null;
  },
  changeResourceActionPermission: async ({
    resourceId,
    overrideGrantedActions,
    specifiedUsersGrantedActions,
  }) => {
    const resource = getMockResource(resourceId);
    if (overrideGrantedActions !== undefined)
      resource.overrideGrantedActions = Object.entries(overrideGrantedActions ?? {}).flatMap(
        ([groupId, grantedActions]) =>
          grantedActions === null ? [] : [{ groupId, grantedActions }]
      );
    if (specifiedUsersGrantedActions !== undefined)
      resource.specifiedUsersGrantedActions = Object.entries(
        specifiedUsersGrantedActions ?? {}
      ).map(([userId, grantedActions]) => ({
        userId,
        grantedActions,
        userInfo: { nickname: `示例用户 ${userId}` },
      }));
    return null;
  },
  globalSearch: (params) => mockResponse(simulateGlobalSearch(params, mockResources)),
};
