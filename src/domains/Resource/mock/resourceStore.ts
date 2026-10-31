import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

import type { ResourceItemApi, ResourceTypeApi } from '../apis/ResourceCoreApi.schema';
import { ResourceTypeApiSchema } from '../apis/ResourceCoreApi.schema';
import mockdata from './mockdata.json';
import { SEARCH_CORPUS } from './searchMockData';

const ownerActions: ResourceItemApi['currentActions'] = [
  'DISCOVER',
  'VIEW',
  'LOAD',
  'EDIT',
  'INLINE_COMMENT',
  'DOWNLOAD_WATERMARK',
  'DOWNLOAD_ORIGINAL',
  'FORK',
  'COMMENT',
];

const normalizeResourceType = (value?: string): ResourceTypeApi => {
  const normalized = value?.trim().toUpperCase();
  return normalized && (ResourceTypeApiSchema.options as readonly string[]).includes(normalized)
    ? (normalized as ResourceTypeApi)
    : 'UNKNOWN';
};

const normalizeInteractionCount = (value: unknown): number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : 0;

const normalizeUserDisplay = (value: unknown): ResourceItemApi['ownerInfo'] => {
  const user = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  const identityType = user.identityType;
  return {
    nickname: typeof user.nickname === 'string' ? user.nickname : null,
    username: typeof user.username === 'string' ? user.username : null,
    avatar: typeof user.avatar === 'string' ? user.avatar : null,
    identityType:
      identityType === 1 || identityType === 2 || identityType === 3 ? identityType : null,
    realName: typeof user.realName === 'string' ? user.realName : null,
    campusNo: typeof user.campusNo === 'string' ? user.campusNo : null,
    email: typeof user.email === 'string' ? user.email : null,
    mobile: typeof user.mobile === 'string' ? user.mobile : null,
  };
};

const normalizeGroupDisplay = (
  value: unknown
): NonNullable<ResourceItemApi['overrideGrantedActions']>[number]['groupInfo'] => {
  if (!value || typeof value !== 'object') return null;
  const group = value as Record<string, unknown>;
  const groupType = group.groupType;
  return {
    groupName: typeof group.groupName === 'string' ? group.groupName : null,
    groupDesc: typeof group.groupDesc === 'string' ? group.groupDesc : null,
    groupCoverUrl: typeof group.groupCoverUrl === 'string' ? group.groupCoverUrl : null,
    groupType: groupType === 1 || groupType === 2 || groupType === 3 ? groupType : null,
    groupMetaInfo: typeof group.groupMetaInfo === 'string' ? group.groupMetaInfo : null,
  };
};

/** 将人工维护的松散 mock 数据归一为后端 wire 契约，避免 mock 自己发明 DTO。 */
export const normalizeMockResource = (
  item: (typeof mockdata)[number] & Record<string, unknown>
): ResourceItemApi => {
  const ownerId = typeof item.ownerId === 'string' && item.ownerId ? item.ownerId : '1';
  const personalGroupId = `p_${ownerId}`;
  const rawInteraction = item.resourceInteractionInfo as Record<string, unknown> | undefined;
  const rawMyInteraction = item.myInteractionRecord as Record<string, unknown> | null | undefined;
  const tagBinds = Array.isArray(item.tagBinds) ? item.tagBinds : [];

  return {
    resourceId: item.resourceId,
    createTime: typeof item.createTime === 'number' ? item.createTime : 0,
    resourceName: item.resourceName,
    resourceType: normalizeResourceType(
      typeof item.resourceType === 'string' ? item.resourceType : undefined
    ),
    ownerId,
    ownerInfo: normalizeUserDisplay(item.ownerInfo),
    preview: typeof item.preview === 'string' ? item.preview : null,
    size: item.size == null ? null : String(item.size),
    resourceInteractionInfo: rawInteraction
      ? {
          readCount: normalizeInteractionCount(rawInteraction.readCount),
          likeCount: normalizeInteractionCount(rawInteraction.likeCount),
          scoreCount: normalizeInteractionCount(rawInteraction.scoreCount),
          scoreTotal: normalizeInteractionCount(rawInteraction.scoreTotal),
          favoriteCount: normalizeInteractionCount(rawInteraction.favoriteCount),
          commentCount: normalizeInteractionCount(rawInteraction.commentCount),
        }
      : null,
    tagBinds: tagBinds.flatMap((rawBind) => {
      const bind = rawBind as Record<string, unknown>;
      const rawTags = (bind.tags ?? {}) as Record<string, Record<string, unknown> | null>;
      const tagIds = Object.keys(rawTags);
      const groupId =
        typeof bind.groupId === 'string' && bind.groupId ? bind.groupId : personalGroupId;
      const primaryTagId =
        typeof bind.primaryTagId === 'string' && bind.primaryTagId ? bind.primaryTagId : tagIds[0];
      if (!primaryTagId) return [];
      return [
        {
          groupId,
          primaryTagId,
          aiBillingApproved: bind.aiBillingApproved === true,
          tags: Object.fromEntries(
            Object.entries(rawTags).map(([tagId, rawTag]) => [
              tagId,
              rawTag
                ? {
                    groupId: typeof rawTag.groupId === 'string' ? rawTag.groupId : groupId,
                    tagName:
                      typeof rawTag.tagName === 'string' && rawTag.tagName
                        ? rawTag.tagName
                        : 'UNKNOWN',
                    tagDesc: typeof rawTag.tagDesc === 'string' ? rawTag.tagDesc : null,
                    tagIcon: typeof rawTag.tagIcon === 'string' ? rawTag.tagIcon : null,
                    tagColor: typeof rawTag.tagColor === 'string' ? rawTag.tagColor : null,
                    tagMetaInfo: typeof rawTag.tagMetaInfo === 'string' ? rawTag.tagMetaInfo : null,
                    tagCreator: typeof rawTag.tagCreator === 'string' ? rawTag.tagCreator : null,
                    isPath: typeof rawTag.isPath === 'boolean' ? rawTag.isPath : null,
                  }
                : null,
            ])
          ),
        },
      ];
    }),
    currentActions: Array.isArray(item.currentActions)
      ? (item.currentActions as ResourceItemApi['currentActions'])
      : ownerActions,
    myInteractionRecord: rawMyInteraction
      ? {
          read: rawMyInteraction.read === true,
          liked: rawMyInteraction.liked === true,
          score: typeof rawMyInteraction.score === 'number' ? rawMyInteraction.score : null,
          likedCommentIds: Array.isArray(rawMyInteraction.likedCommentIds)
            ? (rawMyInteraction.likedCommentIds as string[])
            : [],
          resourceId:
            typeof rawMyInteraction.resourceId === 'string'
              ? rawMyInteraction.resourceId
              : item.resourceId,
        }
      : null,
    overrideGrantedActions: Array.isArray(item.overrideGrantedActions)
      ? item.overrideGrantedActions.map((rawGrant) => {
          const grant = rawGrant as Record<string, unknown>;
          return {
            groupId: String(grant.groupId),
            groupInfo: normalizeGroupDisplay(grant.groupInfo),
            grantedActions: Array.isArray(grant.grantedActions)
              ? (grant.grantedActions as ResourceItemApi['currentActions'])
              : null,
          };
        })
      : null,
    specifiedUsersGrantedActions: Array.isArray(item.specifiedUsersGrantedActions)
      ? item.specifiedUsersGrantedActions.map((rawGrant) => {
          const grant = rawGrant as Record<string, unknown>;
          return {
            userId: String(grant.userId),
            userInfo: grant.userInfo ? normalizeUserDisplay(grant.userInfo) : null,
            grantedActions: Array.isArray(grant.grantedActions)
              ? (grant.grantedActions as ResourceItemApi['currentActions'])
              : null,
          };
        })
      : null,
  };
};

export const mockResources = new Map<string, ResourceItemApi>(
  (
    structuredClone(mockdata) as unknown as ((typeof mockdata)[number] & Record<string, unknown>)[]
  ).map((item) => [item.resourceId, normalizeMockResource(item)])
);
export function addMockResource(
  resourceName: string,
  resourceType: string,
  pathTagId = 'tag-root',
  resourceId = `mock-resource-${crypto.randomUUID()}`
): string {
  mockResources.set(
    resourceId,
    normalizeMockResource({
      resourceId,
      resourceName,
      resourceType,
      ownerId: '1',
      ownerInfo: { nickname: '示例用户', identityType: 1 },
      currentActions: ownerActions,
      tagBinds: [{ primaryTagId: pathTagId, tags: { [pathTagId]: { tagName: pathTagId } } }],
    } as (typeof mockdata)[number] & Record<string, unknown>)
  );
  return resourceId;
}
export function getMockResource(resourceId: string): ResourceItemApi {
  const item = mockResources.get(resourceId);
  if (!item)
    throw createClientError(FRONTEND_CLIENT_ERROR.RESOURCE_PERMISSION_CONTEXT_MISSING, {
      resourceId,
    });
  return item;
}

// 保留列表压力预览样本，所有查询仍由同一 API 提供。
for (let n = 1; n <= 120; n++) {
  addMockResource(
    `压力测试文档 ${n}.pdf`,
    'pdf',
    'tag-root',
    `mock-stress-${String(n).padStart(4, '0')}`
  );
}
addMockResource('Mock Skill', 'SKILL', 'tag-root', 'mock-skill');
addMockResource('研究助手', 'AGENT', 'tag-root', 'mock-agent');

for (const item of SEARCH_CORPUS) {
  addMockResource(item.resourceName, item.resourceType, 'tag-root', item.resourceId);
}
