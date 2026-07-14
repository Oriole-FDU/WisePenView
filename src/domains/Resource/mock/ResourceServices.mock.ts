import type {
  AddInlineCommentItemRequest,
  ChangeFavoriteStatusRequest,
  ChangeInlineCommentResolveStatusRequest,
  CreateCollectionRequest,
  CreateInlineCommentRequest,
  DeleteCollectionRequest,
  DeleteInlineCommentItemRequest,
  FavoriteCollection,
  FavoritedResourcesPage,
  FavoriteItem,
  GetGroupResourceRequest,
  GetResourcePermissionOverviewRequest,
  GetUserResourcesRequest,
  InteractRateRequest,
  InteractToggleLikeRequest,
  IResourceService,
  ListFavoritedResourcesRequest,
  ListInlineCommentsRequest,
  RemoveResourcesRequest,
  RenameResourceRequest,
  ResourceInlineCommentThread,
  ResourceItem,
  ResourceListPage,
  ResourcePermissionOverview,
  SearchQueryRequest,
  SearchResultPage,
  UpdateCollectionInfoRequest,
  UpdateInlineCommentItemRequest,
  UpdateResourcePermissionSubjectsRequest,
} from '@/domains/Resource';
import {
  filterSupportedResourcePermissionActions,
  getSupportedResourcePermissionActions,
  resolveResourceIconType,
  RESOURCE_ACTION,
} from '@/domains/Resource';
import { useResourceDisplayNameStore } from '../store/useResourceDisplayNameStore';
import mockdata from './mockdata.json';
import { simulateGlobalSearch } from './searchMockData';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const toResourceItem = (
  item: Omit<ResourceItem, 'ownerInfo'> & { ownerInfo?: ResourceItem['ownerInfo'] }
): ResourceItem => ({
  ...item,
  resourceIconType:
    item.resourceIconType ??
    resolveResourceIconType({
      resourceType: item.resourceType,
      resourceName: item.resourceName,
    }),
  ownerInfo: item.ownerInfo ?? {},
});

/** 额外生成的「文档」条数，用于压力测试侧边栏 / 列表；按需改大改小 */
const MOCK_STRESS_FILE_COUNT = 120;

const buildStressMockItems = (count: number): ResourceItem[] =>
  Array.from({ length: count }, (_, i) => {
    const n = i + 1;
    return {
      resourceId: `mock-stress-${String(n).padStart(4, '0')}`,
      resourceName: `压力测试文档 ${n}.pdf`,
      ownerInfo: {},
      resourceType: 'file',
      ownerId: '1',
      size: 2048 + n * 100,
      path: '/',
      currentTags: {},
    };
  });

const personalSkillResources: ResourceItem[] = (
  (mockdata as Record<string, unknown>).skillResources as Record<string, unknown>
)?.personal
  ? (
      ((mockdata as Record<string, unknown>).skillResources as Record<string, unknown>)
        .personal as Array<Record<string, unknown>>
    ).map((item) => toResourceItem(item as Parameters<typeof toResourceItem>[0]))
  : [];

const groupSkillResourcesMap: Record<string, ResourceItem[]> = {};
const skillGroupsData = (
  (mockdata as Record<string, unknown>).skillResources as Record<string, unknown>
)?.groups as Record<string, Array<Record<string, unknown>>> | undefined;
if (skillGroupsData) {
  Object.entries(skillGroupsData).forEach(([groupId, items]) => {
    groupSkillResourcesMap[groupId] = items.map((item) =>
      toResourceItem(item as Parameters<typeof toResourceItem>[0])
    );
  });
}

const baseMockResourceList: ResourceItem[] = [
  ...(mockdata.resourceListPage as unknown as ResourceListPage).list.map(toResourceItem),
  ...buildStressMockItems(MOCK_STRESS_FILE_COUNT),
];

/** 个人资源列表：不含小组 Skill（个人 Skill 单独管理），查询 SKILL 时只返回 personalSkillResources */
const fullMockPersonalResourceList: ResourceItem[] = [
  ...baseMockResourceList,
  ...personalSkillResources,
];
const mockFavoriteCollections: FavoriteCollection[] = [
  {
    collectionId: 'mock-favorite-default',
    collectionName: null,
    description: null,
    isDefault: true,
    itemCount: 0,
    createTime: Date.now() - 1000 * 60 * 60 * 24 * 10,
  },
  {
    collectionId: 'mock-favorite-reading',
    collectionName: '稍后阅读',
    description: '需要继续跟进的资料',
    isDefault: false,
    itemCount: 0,
    createTime: Date.now() - 1000 * 60 * 60 * 24 * 3,
  },
];

const favoriteStatusByResourceId = new Map<string, string[]>();
const favoriteTimeByResourceId = new Map<string, number>();

const refreshMockFavoriteCounts = (): void => {
  for (const collection of mockFavoriteCollections) {
    collection.itemCount = 0;
  }
  for (const collectionIds of favoriteStatusByResourceId.values()) {
    for (const collectionId of collectionIds) {
      const collection = mockFavoriteCollections.find((item) => item.collectionId === collectionId);
      if (collection) collection.itemCount += 1;
    }
  }
};

fullMockPersonalResourceList.slice(0, 6).forEach((item, index) => {
  const collectionIds =
    index % 2 === 0
      ? ['mock-favorite-default']
      : ['mock-favorite-default', 'mock-favorite-reading'];
  favoriteStatusByResourceId.set(item.resourceId, collectionIds);
  favoriteTimeByResourceId.set(item.resourceId, Date.now() - index * 1000 * 60 * 60);
});
refreshMockFavoriteCounts();

/** 完整资源列表（含所有 Skill），供 getGroupResources 使用 */
const personalAgentResources: ResourceItem[] = (
  (mockdata as Record<string, unknown>).agentResources as Record<string, unknown>
)?.personal
  ? (
      ((mockdata as Record<string, unknown>).agentResources as Record<string, unknown>)
        .personal as Array<Record<string, unknown>>
    ).map((item) => toResourceItem(item as Parameters<typeof toResourceItem>[0]))
  : [];

const groupAgentResourcesMap: Record<string, ResourceItem[]> = {};
const agentGroupsData = (
  (mockdata as Record<string, unknown>).agentResources as Record<string, unknown>
)?.groups as Record<string, Array<Record<string, unknown>>> | undefined;
if (agentGroupsData) {
  Object.entries(agentGroupsData).forEach(([groupId, items]) => {
    groupAgentResourcesMap[groupId] = items.map((item) =>
      toResourceItem(item as Parameters<typeof toResourceItem>[0])
    );
  });
}

const fullMockGroupResourceList: ResourceItem[] = [
  ...baseMockResourceList,
  ...personalSkillResources,
  ...Object.values(groupSkillResourcesMap).flat(),
];

const paginateList = (rows: ResourceItem[], page: number, size: number): ResourceListPage => {
  const total = rows.length;
  const totalPage = Math.max(1, Math.ceil(total / size));
  const start = (page - 1) * size;
  const list = rows.slice(start, start + size);
  return { list, total, page, size, totalPage };
};

const filterByType = (rows: ResourceItem[], resourceType?: string): ResourceItem[] => {
  if (resourceType != null && resourceType !== '') {
    return rows.filter((r) => r.resourceType === resourceType);
  }
  return rows;
};

const getUserResources = async (params: GetUserResourcesRequest): Promise<ResourceListPage> => {
  await delay(200);
  let rows = fullMockPersonalResourceList;
  if (params.resourceType === 'SKILL') {
    rows = personalSkillResources;
    return paginateList(rows, params.page, params.size);
  }
  if (params.resourceType === 'AGENT') {
    rows = personalAgentResources;
    return paginateList(rows, params.page, params.size);
  }
  return paginateList(filterByType(rows, params.resourceType), params.page, params.size);
};

const getGroupResources = async (params: GetGroupResourceRequest): Promise<ResourceListPage> => {
  await delay(200);
  if (params.resourceType === 'SKILL') {
    const groupSkills = groupSkillResourcesMap[params.groupId] ?? [];
    const total = groupSkills.length;
    const totalPage = Math.max(1, Math.ceil(total / params.size));
    const start = (params.page - 1) * params.size;
    const list = groupSkills.slice(start, start + params.size);
    return { list, total, page: params.page, size: params.size, totalPage };
  }
  if (params.resourceType === 'AGENT') {
    const groupAgents = groupAgentResourcesMap[params.groupId] ?? [];
    const total = groupAgents.length;
    const totalPage = Math.max(1, Math.ceil(total / params.size));
    const start = (params.page - 1) * params.size;
    const list = groupAgents.slice(start, start + params.size);
    return { list, total, page: params.page, size: params.size, totalPage };
  }
  return paginateList(
    filterByType(fullMockGroupResourceList, params.resourceType),
    params.page,
    params.size
  );
};

const renameResource = async (params: RenameResourceRequest): Promise<void> => {
  await delay(150);
  useResourceDisplayNameStore.getState().setDisplayName(params.resourceId, params.newName);
};

const removeResources = async (_params: RemoveResourcesRequest): Promise<void> => {
  await delay(150);
};

const updateResourceTags = async (): Promise<void> => {
  await delay(150);
};

const mountResourcesToGroupTag = async (): Promise<void> => {
  await delay(150);
};

const interactToggleLike = async (_params: InteractToggleLikeRequest): Promise<void> => {
  await delay(100);
};

const interactRate = async (_params: InteractRateRequest): Promise<void> => {
  await delay(100);
};

const updateResourceActionPermission = async (): Promise<void> => {
  await delay(100);
};

const updateResourcePermissionSubjects = async (
  _params: UpdateResourcePermissionSubjectsRequest
): Promise<void> => {
  await delay(100);
};

const getResourcePermissionOverview = async (
  params: GetResourcePermissionOverviewRequest
): Promise<ResourcePermissionOverview> => {
  await delay(100);
  const resource = [...fullMockPersonalResourceList, ...fullMockGroupResourceList].find(
    (item) => item.resourceId === params.resourceId
  );
  const resourceId = params.resourceId;
  const resourceType = params.resourceType;
  const supportedActions = getSupportedResourcePermissionActions(resourceType);
  const tagActions = filterSupportedResourcePermissionActions(
    [RESOURCE_ACTION.DISCOVER, RESOURCE_ACTION.VIEW, RESOURCE_ACTION.EDIT],
    supportedActions
  );
  const overrideActions = filterSupportedResourcePermissionActions(
    [RESOURCE_ACTION.DISCOVER, RESOURCE_ACTION.VIEW],
    supportedActions
  );
  const specifiedUserActions = filterSupportedResourcePermissionActions(
    [
      RESOURCE_ACTION.DISCOVER,
      RESOURCE_ACTION.VIEW,
      RESOURCE_ACTION.EDIT,
      RESOURCE_ACTION.DOWNLOAD_WATERMARK,
      RESOURCE_ACTION.DOWNLOAD_ORIGINAL,
      RESOURCE_ACTION.FORK,
    ],
    supportedActions
  );
  return {
    resourceId,
    resourceType,
    owner: {
      id: 'owner:1',
      kind: 'owner' as const,
      source: 'owner' as const,
      name: '李若瑾',
      description: '所有者',
      userId: '1',
      effectiveActions: supportedActions,
      editableActions: supportedActions,
      readonly: true,
    },
    subjects: [
      {
        id: 'group:wise-pen-dev:tag',
        kind: 'group' as const,
        source: 'tag' as const,
        name: 'WisePen 研发组的成员',
        description: '继承自资源所在标签的权限',
        groupId: 'wise-pen-dev',
        primaryTagId: 'tag-work',
        effectiveActions: tagActions,
        editableActions: tagActions,
        inheritedActions: tagActions,
      },
      {
        id: 'group:agentic-sig:override',
        kind: 'group' as const,
        source: 'resourceOverride' as const,
        name: 'Agentic SIG 成员',
        description: '已覆盖标签策略，仅对此资源生效',
        groupId: 'agentic-sig',
        primaryTagId: 'tag-work',
        effectiveActions: overrideActions,
        editableActions: overrideActions,
      },
      {
        id: 'user:10086:specified',
        kind: 'user' as const,
        source: 'specifiedUser' as const,
        name: '小明',
        description: '由您邀请而获得的权限',
        userId: '10086',
        effectiveActions: specifiedUserActions,
        editableActions: specifiedUserActions,
      },
    ],
    supportedActions,
    actionOptions: supportedActions.map((action) => ({
      action,
      key: RESOURCE_ACTION.getKey(action) ?? String(action),
      label: RESOURCE_ACTION.labels[action] ?? String(action),
      supported: true,
    })),
  };
};

const getLikeStatus = async (_resourceId: string): Promise<{ liked: boolean }> => {
  await delay(50);
  return { liked: false };
};

const getRate = async (_resourceId: string): Promise<{ score: number }> => {
  await delay(50);
  return { score: 0 };
};

const interactRead = async (_resourceId: string): Promise<void> => {
  await delay(50);
};

const globalSearch = async (params: SearchQueryRequest): Promise<SearchResultPage> => {
  await delay(180);
  return simulateGlobalSearch(params);
};

const listInlineComments = async (
  _params: ListInlineCommentsRequest
): Promise<ResourceInlineCommentThread[]> => {
  await delay(120);
  return [];
};

const createInlineComment = async (_params: CreateInlineCommentRequest): Promise<string> => {
  await delay(120);
  return `mock-inline-comment-${Date.now()}`;
};

const addInlineCommentItem = async (_params: AddInlineCommentItemRequest): Promise<string> => {
  await delay(120);
  return `mock-inline-comment-item-${Date.now()}`;
};

const updateInlineCommentItem = async (_params: UpdateInlineCommentItemRequest): Promise<void> => {
  await delay(120);
};

const deleteInlineCommentItem = async (_params: DeleteInlineCommentItemRequest): Promise<void> => {
  await delay(120);
};

const changeInlineCommentResolveStatus = async (
  _params: ChangeInlineCommentResolveStatusRequest
): Promise<void> => {
  await delay(120);
};
const getFavoriteStatus = async (resourceId: string): Promise<{ collectionIds: string[] }> => {
  await delay(80);
  return { collectionIds: favoriteStatusByResourceId.get(resourceId) ?? [] };
};

const changeFavoriteStatus = async (params: ChangeFavoriteStatusRequest): Promise<void> => {
  await delay(120);
  if (!params.favorite) {
    favoriteStatusByResourceId.delete(params.resourceId);
    favoriteTimeByResourceId.delete(params.resourceId);
    refreshMockFavoriteCounts();
    return;
  }
  const collectionIds = params.collectionIds?.length
    ? params.collectionIds
    : ['mock-favorite-default'];
  favoriteStatusByResourceId.set(params.resourceId, Array.from(new Set(collectionIds)));
  favoriteTimeByResourceId.set(params.resourceId, Date.now());
  refreshMockFavoriteCounts();
};

const listCollections = async (): Promise<FavoriteCollection[]> => {
  await delay(120);
  refreshMockFavoriteCounts();
  return mockFavoriteCollections.map((collection) => ({ ...collection }));
};

const createCollection = async (params: CreateCollectionRequest): Promise<string> => {
  await delay(120);
  const collectionId = `mock-favorite-${Date.now()}`;
  mockFavoriteCollections.push({
    collectionId,
    collectionName: params.collectionName,
    description: params.description ?? null,
    isDefault: false,
    itemCount: 0,
    createTime: Date.now(),
  });
  return collectionId;
};

const updateCollectionInfo = async (params: UpdateCollectionInfoRequest): Promise<void> => {
  await delay(120);
  const collection = mockFavoriteCollections.find(
    (item) => item.collectionId === params.collectionId
  );
  if (!collection) return;
  collection.collectionName = params.collectionName;
  collection.description = params.description ?? null;
};

const deleteCollection = async (params: DeleteCollectionRequest): Promise<void> => {
  await delay(120);
  const index = mockFavoriteCollections.findIndex(
    (item) => item.collectionId === params.collectionId
  );
  if (index < 0 || mockFavoriteCollections[index].isDefault) return;
  mockFavoriteCollections.splice(index, 1);
  for (const [resourceId, collectionIds] of favoriteStatusByResourceId.entries()) {
    const nextIds = collectionIds.filter((collectionId) => collectionId !== params.collectionId);
    if (params.keepResourcesToDefault && collectionIds.includes(params.collectionId)) {
      nextIds.push('mock-favorite-default');
    }
    const uniqueIds = Array.from(new Set(nextIds));
    if (uniqueIds.length === 0) {
      favoriteStatusByResourceId.delete(resourceId);
      favoriteTimeByResourceId.delete(resourceId);
    } else {
      favoriteStatusByResourceId.set(resourceId, uniqueIds);
    }
  }
  refreshMockFavoriteCounts();
};

const mapMockFavoriteItem = (item: ResourceItem): FavoriteItem => ({
  resourceId: item.resourceId,
  accessible: true,
  favoritedAt: favoriteTimeByResourceId.get(item.resourceId) ?? Date.now(),
  collectionIds: favoriteStatusByResourceId.get(item.resourceId) ?? [],
  resourceInfo: {
    resourceId: item.resourceId,
    resourceName: item.resourceName,
    resourceType: item.resourceType ?? '',
    ownerId: item.ownerId ?? '',
    preview: item.preview ?? null,
    size: item.size ?? null,
    favoriteCount: item.favoriteCount ?? 0,
    likeCount: item.likeCount ?? null,
    readCount: item.readCount ?? null,
    scoreAvg: item.scoreAvg ?? null,
  },
});

const listFavoritedResources = async (
  params: ListFavoritedResourcesRequest
): Promise<FavoritedResourcesPage> => {
  await delay(160);
  const rows = fullMockPersonalResourceList
    .filter((item) => {
      const collectionIds = favoriteStatusByResourceId.get(item.resourceId) ?? [];
      return params.collectionId
        ? collectionIds.includes(params.collectionId)
        : collectionIds.length > 0;
    })
    .map(mapMockFavoriteItem)
    .sort((a, b) => b.favoritedAt - a.favoritedAt);
  const total = rows.length;
  const totalPage = Math.max(1, Math.ceil(total / params.size));
  const start = (params.page - 1) * params.size;
  return {
    list: rows.slice(start, start + params.size),
    total,
    page: params.page,
    size: params.size,
    totalPage,
  };
};

export const ResourceServicesMock: IResourceService = {
  getUserResources,
  getGroupResources,
  renameResource,
  removeResources,
  updateResourceTags,
  mountResourcesToGroupTag,
  updateResourceActionPermission,
  updateResourcePermissionSubjects,
  getResourcePermissionOverview,
  getLikeStatus,
  getRate,
  interactToggleLike,
  interactRate,
  interactRead,
  globalSearch,
  listInlineComments,
  createInlineComment,
  addInlineCommentItem,
  updateInlineCommentItem,
  deleteInlineCommentItem,
  changeInlineCommentResolveStatus,
  getFavoriteStatus,
  changeFavoriteStatus,
  listCollections,
  createCollection,
  updateCollectionInfo,
  deleteCollection,
  listFavoritedResources,
};
