import { mockPage, mockResponse } from '@/domains/_shared/mock/response';
import type { ResourceItemApi as ResourceItemApiContract } from '../apis/ResourceApi';
import { getMockResource, mockResources } from './resourceStore';
import { simulateGlobalSearch } from './searchMockData';

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
    return mockResponse(mockPage(rows, params));
  },
  renameResource: async ({ resourceId, newName }) => {
    getMockResource(resourceId).resourceName = newName;
  },
  removeResources: async ({ resourceIds }) => {
    resourceIds.forEach((id) => mockResources.delete(id));
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
  },
  globalSearch: (params) => mockResponse(simulateGlobalSearch(params, mockResources)),
};
