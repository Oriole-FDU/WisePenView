import { mockPage, mockResponse } from '@/domains/_shared/mock/response';
import { getMockGroup } from '@/domains/Group/mock/GroupApi.mock';
import { TagApi } from '@/domains/Tag/mock/TagApi.mock';
import { WisePenError } from '@/utils/error';

import type { ResourceItemApi as ResourceItemApiContract } from '../apis/ResourceApi';
import type { ResourceItemApi as MockResource } from '../apis/ResourceCoreApi.schema';
import { getMockResource, mockResources } from './resourceStore';
import { buildContentSnippet, SEARCH_CORPUS, simulateGlobalSearch } from './searchMockData';

const mockSearchContent = new Map(
  SEARCH_CORPUS.map(({ resourceId, content }) => [resourceId, content])
);
mockSearchContent.set(
  'mock-note-1',
  '从数据结构的抽象定义出发，结合代码实现、复杂度分析与练习，逐步建立问题建模能力。'
);

async function getMockCourseSections(groupId: string) {
  const group = getMockGroup(groupId);
  const rootId = JSON.parse(group.groupMetaInfo ?? '{}').course?.outlineRootTagId;
  const sections = new Set<string>();
  if (!rootId) return sections;

  const tree = await TagApi.getTagTree({ groupId });
  function visit(nodes: typeof tree, insideOutline: boolean) {
    for (const node of nodes) {
      if (node.tagName.trim().startsWith('.')) continue;
      if (insideOutline) sections.add(node.tagId);
      visit(node.children, insideOutline || node.tagId === rootId);
    }
  }
  visit(tree, false);
  return sections;
}

const getMockMounts = (resource: MockResource, groupId: string, sections: ReadonlySet<string>) =>
  resource.tagBinds.flatMap((bind) =>
    bind.groupId === groupId ? Object.keys(bind.tags).filter((tagId) => sections.has(tagId)) : []
  );

export const ResourceItemApi: typeof ResourceItemApiContract = {
  getResourceBaseInfo: ({ resourceId }) => Promise.resolve(getMockResource(resourceId)),
  listResources: (params) => {
    const rows = [...mockResources.values()].filter((resource) => {
      if (
        params.resourceType &&
        resource.resourceType?.toUpperCase() !== params.resourceType.toUpperCase()
      )
        return false;
      const bind = resource.tagBinds?.find((item) =>
        params.groupId ? item.groupId === params.groupId : item.groupId.startsWith('p_')
      );
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
    return mockResponse(
      mockPage(
        rows.map((resource) => getMockResource(resource.resourceId)),
        params
      )
    );
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
          grantedActions === null ? [] : [{ groupId, groupInfo: null, grantedActions }]
      );
    if (specifiedUsersGrantedActions !== undefined)
      resource.specifiedUsersGrantedActions = Object.entries(
        specifiedUsersGrantedActions ?? {}
      ).map(([userId, grantedActions]) => ({
        userId,
        grantedActions,
        userInfo: {
          nickname: `示例用户 ${userId}`,
          username: null,
          avatar: null,
          identityType: null,
          realName: null,
          campusNo: null,
          email: null,
          mobile: null,
        },
      }));
    return null;
  },
  globalSearch: (params) => mockResponse(simulateGlobalSearch(params, mockResources)),
  searchCourseResources: async ({ groupId, keyword, cursor, size = 20 }) => {
    const sections = await getMockCourseSections(groupId);
    const term = keyword.trim().toLowerCase();
    const hits = [...mockResources.values()].flatMap((resource) => {
      if (!term || !resource.currentActions.includes('DISCOVER')) return [];
      const tagIds = getMockMounts(resource, groupId, sections);
      if (!tagIds.length) return [];
      const { resourceId, resourceName, resourceType } = resource;
      const canView = resource.currentActions.includes('VIEW');
      const highlightContent = canView
        ? buildContentSnippet(mockSearchContent.get(resourceId) ?? '', term)
        : null;
      if (!highlightContent && !resourceName.toLowerCase().includes(term)) return [];
      return [{ resourceId, resourceName, resourceType, tagIds, canView, highlightContent }];
    });
    const offset = Number(cursor ?? 0);
    return mockResponse({
      list: hits.slice(offset, offset + size),
      nextCursor: offset + size < hits.length ? String(offset + size) : null,
    });
  },
  getCourseOutlineResource: async ({ groupId, tagId, resourceId }) => {
    const sections = await getMockCourseSections(groupId);
    const resource = mockResources.get(resourceId);
    if (
      !resource ||
      !resource.currentActions.includes('DISCOVER') ||
      !getMockMounts(resource, groupId, sections).includes(tagId)
    ) {
      throw new WisePenError({ code: 5411, source: 'api' });
    }
    if (!resource.currentActions.includes('VIEW')) {
      throw new WisePenError({ code: 5421, source: 'api' });
    }
    return mockResponse({
      tagId,
      resourceId,
      resourceName: resource.resourceName,
      resourceType: resource.resourceType,
      read: resource.myInteractionRecord?.read ?? false,
    });
  },
};
