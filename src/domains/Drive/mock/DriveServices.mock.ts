import type { IResourceService } from '@/domains/Resource';
import type { ITagService, TagTreeNode } from '@/domains/Tag';

import { createDriveService } from '../service/DriveServices.impl';

interface DriveServicesMockDeps {
  resourceService: IResourceService;
  tagService: ITagService;
}

/** Mock 与真实服务共用领域编排，仅在 registry 中替换 API 依赖。 */
export const createDriveServicesMock = (deps: DriveServicesMockDeps) =>
  createDriveService({
    ...deps,
    tagService: createDriveTagServiceMock(deps.tagService),
  });

const createDriveTagServiceMock = (tagService: ITagService): ITagService => {
  let nextTagId = 1;
  const personalRoot: TagTreeNode = {
    tagId: 'tag-root',
    tagName: '/',
    isPath: true,
    parentId: '0',
    children: [
      {
        tagId: 'tag-work',
        tagName: '/工作',
        isPath: true,
        parentId: 'tag-root',
      },
      {
        tagId: 'tag-study',
        tagName: '/学习',
        isPath: true,
        parentId: 'tag-root',
      },
      {
        tagId: 'tag-life',
        tagName: '/生活',
        isPath: true,
        parentId: 'tag-root',
      },
    ],
  };
  const personalTrash: TagTreeNode = {
    tagId: 'tag-trash',
    tagName: '.Trash',
    isPath: true,
    parentId: '0',
  };
  const personalShared: TagTreeNode = {
    tagId: 'tag-shared',
    tagName: '.Shared',
    isPath: true,
    parentId: '0',
  };
  const personalRoots = [personalRoot, personalTrash, personalShared];

  const buildIndex = (roots: TagTreeNode[]): Map<string, TagTreeNode> => {
    const index = new Map<string, TagTreeNode>();
    const walk = (node: TagTreeNode) => {
      index.set(node.tagId, node);
      node.children?.forEach(walk);
    };
    roots.forEach(walk);
    return index;
  };

  const personalIndex = buildIndex(personalRoots);

  const removePersonalTag = (tagId: string): void => {
    const removeFrom = (nodes: TagTreeNode[]): boolean => {
      const index = nodes.findIndex((node) => node.tagId === tagId);
      if (index >= 0) {
        const [removed] = nodes.splice(index, 1);
        if (removed) {
          const queue = [removed];
          while (queue.length > 0) {
            const node = queue.shift();
            if (!node) continue;
            personalIndex.delete(node.tagId);
            queue.push(...(node.children ?? []));
          }
        }
        return true;
      }
      return nodes.some((node) => removeFrom(node.children ?? []));
    };
    removeFrom(personalRoots);
  };

  return {
    ...tagService,
    getRawTagTree: async (groupId, options) =>
      groupId ? tagService.getRawTagTree(groupId, options) : personalRoots,
    getRawTagById: (tagId, groupId) =>
      groupId ? tagService.getRawTagById(tagId, groupId) : personalIndex.get(tagId),
    addTag: async (params) => {
      if (params.groupId) return tagService.addTag(params);
      const parentId = params.parentId ?? '0';
      const parent = parentId === '0' ? undefined : personalIndex.get(parentId);
      const tag: TagTreeNode = {
        tagId: `tag-drive-${nextTagId++}`,
        tagName: params.tagName,
        isPath: parent?.isPath ?? false,
        parentId,
        children: [],
      };
      (parent ? (parent.children ??= []) : personalRoots).push(tag);
      personalIndex.set(tag.tagId, tag);
      return tag.tagId;
    },
    updateTag: async (params) => {
      if (params.groupId) return tagService.updateTag(params);
      const tag = personalIndex.get(params.targetTagId);
      if (tag && params.tagName !== undefined) tag.tagName = params.tagName;
    },
    moveTags: async (params) => {
      if (params.groupId) return tagService.moveTags(params);
      const moving = params.targetTagIds
        .map((tagId) => personalIndex.get(tagId))
        .filter((tag): tag is TagTreeNode => tag != null);
      moving.forEach((tag) => removePersonalTag(tag.tagId));
      const parent = params.newParentId ? personalIndex.get(params.newParentId) : undefined;
      const target = parent ? (parent.children ??= []) : personalRoots;
      moving.forEach((tag) => {
        tag.parentId = parent?.tagId ?? '0';
        target.push(tag);
        buildIndex([tag]).forEach((node, tagId) => personalIndex.set(tagId, node));
      });
    },
    removeTags: async (params) => {
      if (params.groupId) return tagService.removeTags(params);
      params.targetTagIds.forEach(removePersonalTag);
    },
  };
};
