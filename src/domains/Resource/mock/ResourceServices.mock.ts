import type {
  GetGroupResourceRequest,
  GetUserResourcesRequest,
  IResourceService,
  RemoveResourcesRequest,
  RenameResourceRequest,
  ResourceItem,
  ResourceListPage,
  SearchQueryRequest,
  SearchResultPage,
  UpdateResourcePermissionSubjectsRequest,
} from '@/domains/Resource';
import { resolveResourceIconType } from '@/domains/Resource';

import { useResourceDisplayNameStore } from '../store/useResourceDisplayNameStore';
import mockdata from './mockdata.json';
import { simulateGlobalSearch } from './searchMockData';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const toResourceItem = (
  item: Omit<ResourceItem, 'ownerInfo'> & { ownerInfo?: ResourceItem['ownerInfo'] }
): ResourceItem => ({
  ...item,
  resourceIconType: item.resourceIconType ?? resolveResourceIconType(item.resourceType),
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
      resourceType: 'pdf',
      ownerId: '1',
      size: 2048 + n * 100,
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

const countResourceIds = (resourceIds: string[]): number =>
  new Set(resourceIds.map((resourceId) => resourceId.trim()).filter(Boolean)).size;

const setPersonalResourcesPathTag: IResourceService['setPersonalResourcesPathTag'] = async (
  params
) => {
  await delay(150);
  return countResourceIds(params.resourceIds);
};

const movePersonalResourcesToTrash: IResourceService['movePersonalResourcesToTrash'] = async (
  params
) => {
  await delay(150);
  return countResourceIds(params.resourceIds);
};

const replacePersonalNormalTags: IResourceService['replacePersonalNormalTags'] = async (params) => {
  await delay(150);
  return countResourceIds(params.resourceIds);
};

const mountResourcesToGroup: IResourceService['mountResourcesToGroup'] = async (params) => {
  await delay(150);
  return countResourceIds(params.resourceIds);
};

const unmountResourcesToGroup: IResourceService['unmountResourcesToGroup'] = async (params) => {
  await delay(150);
  return Object.keys(params.resourceSourceTagMap).length;
};

const moveResourcesInGroup: IResourceService['moveResourcesInGroup'] = async (params) => {
  await delay(150);
  return Object.keys(params.resourceSourceTagMap).length;
};

const updateResourceActionPermission = async (): Promise<void> => {
  await delay(100);
};

const updateResourcePermissionSubjects = async (
  _params: UpdateResourcePermissionSubjectsRequest
): Promise<void> => {
  await delay(100);
};

const globalSearch = async (params: SearchQueryRequest): Promise<SearchResultPage> => {
  await delay(180);
  return simulateGlobalSearch(params);
};

export const ResourceServicesMock: IResourceService = {
  getUserResources,
  getGroupResources,
  renameResource,
  removeResources,
  setPersonalResourcesPathTag,
  movePersonalResourcesToTrash,
  replacePersonalNormalTags,
  mountResourcesToGroup,
  unmountResourcesToGroup,
  moveResourcesInGroup,
  updateResourceActionPermission,
  updateResourcePermissionSubjects,
  globalSearch,
};
