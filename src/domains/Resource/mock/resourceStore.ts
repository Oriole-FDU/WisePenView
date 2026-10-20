import { createMockUserDisplay } from '@/domains/_shared/mock/userDisplay';
import type { UserIdentityTypeApiValue } from '@/domains/User/apis/UserApi.type';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

import type {
  ResourceGroupDisplayBaseApiResponse,
  ResourceInteractionInfoApiResponse,
  ResourceItemApiResponse,
  ResourceTagBindApiResponse,
  ResourceTagInfoApiResponse,
  ResourceTypeApiValue,
  ResourceUserInteractionRecordApiResponse,
} from '../apis/ResourceApi.type';
import mockdata from './mockdata.json';
import { SEARCH_CORPUS } from './searchMockData';

const ownerActions: ResourceItemApiResponse['currentActions'] = [
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
export const MOCK_PERSONAL_GROUP_ID = 'p_1';

type MockResourceTagInfo = Partial<ResourceTagInfoApiResponse>;
type MockResourceTagBind = Omit<Partial<ResourceTagBindApiResponse>, 'tags'> & {
  tags?: Record<string, MockResourceTagInfo>;
};
type MockResourceGroupDisplay = Partial<ResourceGroupDisplayBaseApiResponse>;
type MockResourceUserDisplay = {
  nickname?: string | null;
  username?: string | null;
  realName?: string | null;
  avatar?: string | null;
  identityType?: number | string | null;
  campusNo?: string | null;
  email?: string | null;
  mobile?: string | null;
};
type MockResourceItem = Omit<
  Partial<ResourceItemApiResponse>,
  | 'ownerInfo'
  | 'tagBinds'
  | 'resourceType'
  | 'size'
  | 'resourceInteractionInfo'
  | 'myInteractionRecord'
  | 'overrideGrantedActions'
  | 'specifiedUsersGrantedActions'
> & {
  ownerInfo: {
    nickname?: string;
    identityType?: number | string;
  };
  tagBinds?: MockResourceTagBind[];
  resourceType?: string;
  size?: string | number | null;
  resourceInteractionInfo?: Partial<ResourceInteractionInfoApiResponse>;
  myInteractionRecord?: Partial<ResourceUserInteractionRecordApiResponse> | null;
  overrideGrantedActions?: Array<
    Omit<NonNullable<ResourceItemApiResponse['overrideGrantedActions']>[number], 'groupInfo'> & {
      groupInfo?: MockResourceGroupDisplay | null;
    }
  > | null;
  specifiedUsersGrantedActions?: Array<
    Omit<
      NonNullable<ResourceItemApiResponse['specifiedUsersGrantedActions']>[number],
      'userInfo'
    > & {
      userInfo?: MockResourceUserDisplay | null;
    }
  > | null;
};

const normalizeIdentityType = (value: number | string | undefined): UserIdentityTypeApiValue => {
  if (value === 2 || value === '2' || value === 'TEACHER') return 'TEACHER';
  if (value === 3 || value === '3' || value === 'ADMIN') return 'ADMIN';
  return 'STUDENT';
};

const RESOURCE_TYPE_VALUES = new Set<ResourceTypeApiValue>([
  'NOTE',
  'DRAWIO',
  'PDF',
  'DOC',
  'DOCX',
  'PPT',
  'PPTX',
  'XLS',
  'XLSX',
  'SKILL',
  'AGENT',
  'UNKNOWN',
]);

const normalizeResourceType = (raw: string): ResourceTypeApiValue => {
  const upper = raw.trim().toUpperCase() as ResourceTypeApiValue;
  return RESOURCE_TYPE_VALUES.has(upper) ? upper : 'UNKNOWN';
};

export const createMockResourceTagInfo = (
  tagId: string,
  overrides: MockResourceTagInfo = {}
): ResourceTagInfoApiResponse => ({
  groupId: MOCK_PERSONAL_GROUP_ID,
  tagName: tagId,
  tagDesc: null,
  tagIcon: null,
  tagColor: null,
  tagMetaInfo: null,
  tagCreator: null,
  isPath: false,
  ...overrides,
});

export const createMockResourceTagBind = (params: {
  groupId?: string;
  primaryTagId?: string;
  tags?: Record<string, MockResourceTagInfo>;
}): ResourceTagBindApiResponse => {
  const groupId = params.groupId ?? MOCK_PERSONAL_GROUP_ID;
  const primaryTagId = params.primaryTagId ?? 'tag-root';
  const rawTags = params.tags ?? { [primaryTagId]: { tagName: primaryTagId } };
  return {
    groupId,
    primaryTagId,
    tags: Object.fromEntries(
      Object.entries(rawTags).map(([tagId, tagInfo]) => [
        tagId,
        createMockResourceTagInfo(tagId, { groupId, ...tagInfo }),
      ])
    ),
  };
};

export const createMockResourceInteractionInfo = (): ResourceInteractionInfoApiResponse => ({
  readCount: 0,
  likeCount: 0,
  scoreCount: 0,
  scoreTotal: 0,
  favoriteCount: 0,
  commentCount: 0,
});

export const createMockResourceInteractionRecord = (
  resourceId: string,
  overrides: Partial<ResourceUserInteractionRecordApiResponse> = {}
): ResourceUserInteractionRecordApiResponse => ({
  read: false,
  liked: false,
  score: null,
  likedCommentIds: [],
  resourceId,
  ...overrides,
});

const normalizeTagBinds = (
  tagBinds: MockResourceTagBind[] | undefined
): ResourceTagBindApiResponse[] => {
  if (!tagBinds?.length) {
    return [createMockResourceTagBind({ primaryTagId: 'tag-root' })];
  }
  return tagBinds.map((bind) =>
    createMockResourceTagBind({
      groupId: bind.groupId ?? MOCK_PERSONAL_GROUP_ID,
      primaryTagId: bind.primaryTagId,
      tags: bind.tags,
    })
  );
};

const normalizeGroupDisplay = (
  groupInfo: MockResourceGroupDisplay | null | undefined
): ResourceGroupDisplayBaseApiResponse | null =>
  groupInfo
    ? {
        groupName: groupInfo.groupName ?? '',
        groupDesc: groupInfo.groupDesc ?? null,
        groupCoverUrl: groupInfo.groupCoverUrl ?? null,
        groupType: groupInfo.groupType ?? 'NORMAL_GROUP',
        groupMetaInfo: groupInfo.groupMetaInfo ?? null,
      }
    : null;

const normalizeResourceItem = (raw: MockResourceItem): ResourceItemApiResponse => {
  const resourceId = raw.resourceId ?? `mock-resource-${crypto.randomUUID()}`;
  return {
    resourceId,
    resourceName: raw.resourceName ?? '',
    ownerId: raw.ownerId ?? '1',
    ownerInfo: createMockUserDisplay({
      ...raw.ownerInfo,
      identityType: normalizeIdentityType(raw.ownerInfo.identityType),
    }),
    resourceType: normalizeResourceType(raw.resourceType ?? 'UNKNOWN'),
    preview: raw.preview ?? null,
    size: raw.size?.toString() ?? null,
    resourceInteractionInfo: {
      ...createMockResourceInteractionInfo(),
      ...raw.resourceInteractionInfo,
    },
    myInteractionRecord: createMockResourceInteractionRecord(resourceId, {
      ...raw.myInteractionRecord,
    }),
    tagBinds: normalizeTagBinds(raw.tagBinds),
    currentActions: raw.currentActions ?? ownerActions,
    resourceAccessRole: raw.resourceAccessRole ?? 'OWNER',
    overrideGrantedActions:
      raw.overrideGrantedActions?.map((item) => ({
        ...item,
        groupInfo: normalizeGroupDisplay(item.groupInfo),
      })) ?? [],
    specifiedUsersGrantedActions:
      raw.specifiedUsersGrantedActions?.map((item) => ({
        userId: item.userId ?? '',
        grantedActions: item.grantedActions ?? [],
        userInfo: createMockUserDisplay({
          ...item.userInfo,
          nickname: item.userInfo?.nickname ?? undefined,
          username: item.userInfo?.username ?? undefined,
          identityType: normalizeIdentityType(item.userInfo?.identityType ?? undefined),
        }),
      })) ?? [],
    marketSaleInfos: raw.marketSaleInfos ?? {},
  };
};

export const mockResources = new Map<string, ResourceItemApiResponse>(
  (structuredClone(mockdata) as unknown as MockResourceItem[]).map((item) => {
    const resource = normalizeResourceItem(item);
    return [resource.resourceId, resource];
  })
);
export function addMockResource(
  resourceName: string,
  resourceType: string,
  pathTagId = 'tag-root',
  resourceId = `mock-resource-${crypto.randomUUID()}`
): string {
  mockResources.set(
    resourceId,
    normalizeResourceItem({
      resourceId,
      resourceName,
      resourceType,
      ownerId: '1',
      ownerInfo: { nickname: '示例用户' },
      currentActions: ownerActions,
      resourceAccessRole: 'OWNER',
      tagBinds: [{ primaryTagId: pathTagId, tags: { [pathTagId]: { tagName: pathTagId } } }],
    })
  );
  return resourceId;
}
export function getMockResource(resourceId: string): ResourceItemApiResponse {
  const item = mockResources.get(resourceId);
  if (!item)
    throw createClientError(FRONTEND_CLIENT_ERROR.RESOURCE_PERMISSION_CONTEXT_MISSING, {
      resourceId,
    });
  return item;
}

export function getMockInteractionRecord(
  resourceId: string
): ResourceUserInteractionRecordApiResponse {
  const resource = getMockResource(resourceId);
  resource.myInteractionRecord ??= createMockResourceInteractionRecord(resourceId);
  return resource.myInteractionRecord;
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
