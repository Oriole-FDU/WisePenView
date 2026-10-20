import type { ResourcePlacementApi as ResourcePlacementApiContract } from '../apis/ResourcePlacementApi';
import {
  createMockResourceTagBind,
  createMockResourceTagInfo,
  getMockResource,
  MOCK_PERSONAL_GROUP_ID,
} from './resourceStore';

const personalBind = (resourceId: string) => {
  const resource = getMockResource(resourceId);
  resource.tagBinds ??= [];
  let bind = resource.tagBinds.find((item) => item.groupId === MOCK_PERSONAL_GROUP_ID);
  if (!bind) {
    bind = createMockResourceTagBind({ primaryTagId: 'tag-root', tags: {} });
    resource.tagBinds.push(bind);
  }
  return bind;
};
const setPath = (ids: string[], tagId: string) => {
  for (const id of ids) {
    const bind = personalBind(id);
    const normalTags = Object.entries(bind.tags ?? {}).filter(
      ([key, tag]) => key !== bind.primaryTagId && !tag?.isPath
    );
    bind.primaryTagId = tagId;
    bind.tags = {
      ...Object.fromEntries(normalTags),
      [tagId]: createMockResourceTagInfo(tagId, { isPath: true }),
    };
  }
  return { resourceCount: ids.length };
};
export const ResourcePlacementApi: typeof ResourcePlacementApiContract = {
  setPersonalResourcesPathTag: async ({ resourceIds, targetPathTagId }) =>
    setPath(resourceIds, targetPathTagId),
  movePersonalResourcesToTrash: async ({ resourceIds }) => setPath(resourceIds, 'tag-trash'),
  replacePersonalNormalTags: async ({ resourceIds, normalTagIds }) => {
    for (const id of resourceIds) {
      const bind = personalBind(id);
      bind.tags = Object.fromEntries(
        [...normalTagIds, bind.primaryTagId ?? 'tag-root'].map((key) => [
          key,
          createMockResourceTagInfo(key, { isPath: key === bind.primaryTagId }),
        ])
      );
    }
    return { resourceCount: resourceIds.length };
  },
  mountResourcesToGroup: async ({ resourceIds, groupId, targetTagId }) => {
    for (const id of resourceIds) {
      const resource = getMockResource(id);
      resource.tagBinds ??= [];
      let bind = resource.tagBinds.find((item) => item.groupId === groupId);
      if (!bind) {
        bind = createMockResourceTagBind({ groupId, primaryTagId: targetTagId, tags: {} });
        resource.tagBinds.push(bind);
      }
      (bind.tags ??= {})[targetTagId] = createMockResourceTagInfo(targetTagId, { groupId });
    }
    return { resourceCount: resourceIds.length };
  },
  unmountResourcesToGroup: async ({ groupId, resourceSourceTagMap }) => {
    for (const [id, tagId] of Object.entries(resourceSourceTagMap)) {
      const resource = getMockResource(id);
      const bind = resource.tagBinds?.find((item) => item.groupId === groupId);
      if (!bind) continue;
      if (bind.primaryTagId === tagId)
        resource.tagBinds = resource.tagBinds?.filter((item) => item !== bind);
      else if (bind.tags) delete bind.tags[tagId];
    }
    return { resourceCount: Object.keys(resourceSourceTagMap).length };
  },
  moveResourcesInGroup: async ({ groupId, resourceSourceTagMap, targetTagId }) => {
    for (const [id, tagId] of Object.entries(resourceSourceTagMap)) {
      const bind = getMockResource(id).tagBinds?.find((item) => item.groupId === groupId);
      if (!bind) continue;
      bind.tags ??= {};
      delete bind.tags[tagId];
      bind.tags[targetTagId] = createMockResourceTagInfo(targetTagId, { groupId });
      if (bind.primaryTagId === tagId) bind.primaryTagId = targetTagId;
    }
    return { resourceCount: Object.keys(resourceSourceTagMap).length };
  },
};
