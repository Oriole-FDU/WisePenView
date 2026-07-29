import { registerServiceCacheCleaner } from '@/domains/_shared/cacheRegistry';
import type { DriveNode, FolderNode, LinkNode, ResourceNode, RootNode } from '@/domains/Drive';
import type { IResourceService, ResourceItem } from '@/domains/Resource';
import { RESOURCE_SORT_BY, RESOURCE_SORT_DIR } from '@/domains/Resource';
import type { ITagService, TagTreeNode } from '@/domains/Tag';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';
import { normalizeTagGroupId } from '@/utils/normalize/normalizeTagGroupId';
import {
  buildDriveNodeScope,
  buildDriveRootNode,
  decodeNodeId,
  decodeRootNodeScope,
  DRIVE_SHARED_TAG_NAME,
  encodeNodeId,
  encodeRootNodeId,
  isContainerNode,
  mapResourceItemToChildNode,
  mapTagToFolderNode,
  orderDriveFolderNodes,
} from '../mapper/DriveServices.map';
import type { CreateDriveServiceOptions, IDriveService, MoveToFolderParams } from './index.type';

const CACHE_KEY_DEFAULT = '__default__';
const DEFAULT_PAGE_SIZE = 50;
const TRASH_TAG_NAME = '.Trash';
const HIDDEN_TAG_PREFIX = '.';

interface DriveServicesDeps {
  tagService: ITagService;
  resourceService: IResourceService;
}

const isVisibleFolderTag = (node: TagTreeNode): boolean => {
  const name = (node.tagName ?? '').trim();
  if (name === TRASH_TAG_NAME) return false;
  return !name.startsWith(HIDDEN_TAG_PREFIX);
};

const findSharedFolderTag = (roots: TagTreeNode[]): TagTreeNode | undefined => {
  const queue: TagTreeNode[] = [...roots];
  while (queue.length > 0) {
    const node = queue.shift();
    if (!node) continue;
    if (node.tagName === DRIVE_SHARED_TAG_NAME) return node;
    if (Array.isArray(node.children) && node.children.length > 0) {
      queue.push(...node.children);
    }
  }
  return undefined;
};

const resolveGroupKey = (groupId?: string): string => {
  return normalizeTagGroupId(groupId) ?? CACHE_KEY_DEFAULT;
};

const resolveGroupIdFromKey = (groupKey: string): string | undefined => {
  return groupKey === CACHE_KEY_DEFAULT ? undefined : groupKey;
};

const isResourceNode = (node: DriveNode): node is ResourceNode | LinkNode => {
  return node.type === 'resource' || node.type === 'link';
};

interface CascadeDeletePlan {
  tagIdsByDepth: Map<number, Set<string>>;
  resourceIdsToDelete: Set<string>;
  groupResourceIdsToUnmount: Set<string>;
  linkTagIdsToUnmount: Map<
    string,
    {
      source: LinkNode;
      tagIds: Set<string>;
    }
  >;
}

interface MoveNodeToFolderPlan {
  source: DriveNode;
  targetTagId?: string;
  groupId?: string;
}

const createCascadeDeletePlan = (): CascadeDeletePlan => ({
  tagIdsByDepth: new Map<number, Set<string>>(),
  resourceIdsToDelete: new Set<string>(),
  groupResourceIdsToUnmount: new Set<string>(),
  linkTagIdsToUnmount: new Map(),
});

const addTagIdToDeletePlan = (plan: CascadeDeletePlan, tagId: string, depth: number): void => {
  const ids = plan.tagIdsByDepth.get(depth) ?? new Set<string>();
  ids.add(tagId);
  plan.tagIdsByDepth.set(depth, ids);
};

const addLinkTagToUnmountPlan = (
  plan: CascadeDeletePlan,
  source: LinkNode,
  tagId: string
): void => {
  const entry = plan.linkTagIdsToUnmount.get(source.resourceId) ?? {
    source,
    tagIds: new Set<string>(),
  };
  entry.tagIds.add(tagId);
  plan.linkTagIdsToUnmount.set(source.resourceId, entry);
};

export const createDriveServices = (
  deps: DriveServicesDeps,
  opts?: CreateDriveServiceOptions
): IDriveService => {
  const { tagService, resourceService } = deps;
  const pageSize = opts?.pageSize ?? DEFAULT_PAGE_SIZE;

  const nodeMap = new Map<string, DriveNode>();
  const nodeGroupKeyMap = new Map<string, string>();
  const resourceItemByNodeId = new Map<string, ResourceItem>();
  const personalRootTagIdByGroup = new Map<string, string>();

  const clearCache = (): void => {
    nodeMap.clear();
    nodeGroupKeyMap.clear();
    resourceItemByNodeId.clear();
    personalRootTagIdByGroup.clear();
  };

  registerServiceCacheCleaner(clearCache);

  const trackNode = (node: DriveNode, groupKey: string): void => {
    nodeMap.set(node.id, node);
    nodeGroupKeyMap.set(node.id, groupKey);
  };

  const trackNodes = (nodes: DriveNode[], groupKey: string): void => {
    nodes.forEach((node) => trackNode(node, groupKey));
  };

  const readRawRoots = async (
    groupId?: string,
    options?: { refresh?: boolean }
  ): Promise<TagTreeNode[]> => {
    const normalized = normalizeTagGroupId(groupId);
    const roots = await tagService.getRawTagTree(normalized, options);
    return roots;
  };

  const getPersonalRootTag = async (groupId?: string): Promise<TagTreeNode> => {
    const groupKey = resolveGroupKey(groupId);
    const cachedRootTagId = personalRootTagIdByGroup.get(groupKey);
    if (cachedRootTagId) {
      const existing = tagService.getRawTagById(cachedRootTagId, resolveGroupIdFromKey(groupKey));
      if (existing) return existing;
    }

    const roots = await readRawRoots(groupId);
    const rootTag = roots.find((item) => item.tagName === '/');
    if (!rootTag) {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_PERSONAL_ROOT_NOT_FOUND);
    }
    personalRootTagIdByGroup.set(groupKey, rootTag.tagId);
    return rootTag;
  };

  const getSharedFolderTagId: IDriveService['getSharedFolderTagId'] = async () => {
    const roots = await readRawRoots();
    const existingSharedTag = findSharedFolderTag(roots);
    return existingSharedTag?.tagId;
  };

  const getRootNode: IDriveService['getRootNode'] = async (params) => {
    const requestedScope = decodeRootNodeScope(
      params?.rootId,
      normalizeTagGroupId(params?.groupId)
    );
    const requestedGroupId =
      requestedScope.type === 'group' ? normalizeTagGroupId(requestedScope.groupId) : undefined;
    const groupKey = resolveGroupKey(requestedGroupId);
    const normalizedGroupId = resolveGroupIdFromKey(groupKey);
    const personalRootTag = normalizedGroupId ? undefined : await getPersonalRootTag();
    const rootNode = buildDriveRootNode({ groupId: normalizedGroupId, personalRootTag });
    trackNode(rootNode, groupKey);
    return rootNode;
  };

  const getNodeGroupId = (nodeId: string): string | undefined => {
    const node = nodeMap.get(nodeId);
    if (node?.scope.type === 'group') return normalizeTagGroupId(node.scope.groupId);
    const groupKey = nodeGroupKeyMap.get(nodeId);
    if (groupKey) return resolveGroupIdFromKey(groupKey);
    const decoded = decodeNodeId(nodeId);
    if (decoded.kind === 'root') return normalizeTagGroupId(decoded.groupId);
    return undefined;
  };

  const resolveEffectiveGroupId = (nodeId: string, groupId?: string): string | undefined =>
    normalizeTagGroupId(groupId) ?? getNodeGroupId(nodeId);

  const getNodeOrThrow = (nodeId: string): DriveNode => {
    const node = nodeMap.get(nodeId);
    if (!node) {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_NOT_FOUND, { nodeId });
    }
    return node;
  };

  const isDescendantTag = (tagId: string, ancestorTagId: string, groupId?: string): boolean => {
    let current = tagService.getRawTagById(tagId, groupId);
    while (current) {
      if (current.tagId === ancestorTagId) return true;
      if (!current.parentId) return false;
      current = tagService.getRawTagById(current.parentId, groupId);
    }
    return false;
  };

  const resolveParentTagId = async (
    nodeId: string,
    groupId?: string
  ): Promise<{ parentTagId?: string; isVirtualRoot: boolean }> => {
    const decoded = decodeNodeId(nodeId);
    const effectiveGroupId =
      decoded.kind === 'root'
        ? (normalizeTagGroupId(decoded.groupId) ?? normalizeTagGroupId(groupId))
        : resolveEffectiveGroupId(nodeId, groupId);
    if (decoded.kind === 'root') {
      if (effectiveGroupId) return { parentTagId: undefined, isVirtualRoot: true };
      const personalRootTag = await getPersonalRootTag();
      return { parentTagId: personalRootTag.tagId, isVirtualRoot: false };
    }
    if (decoded.kind === 'folder') return { parentTagId: decoded.tagId, isVirtualRoot: false };
    return { parentTagId: undefined, isVirtualRoot: false };
  };

  const loadFolderNodes = async (nodeId: string, groupId?: string): Promise<FolderNode[]> => {
    const decoded = decodeNodeId(nodeId);
    if (decoded.kind === 'root') {
      const normalizedGroupId =
        normalizeTagGroupId(decoded.groupId) ?? normalizeTagGroupId(groupId);
      const rootNodeId = encodeRootNodeId(normalizedGroupId);
      const scope = buildDriveNodeScope(normalizedGroupId);
      if (normalizedGroupId) {
        const roots = await readRawRoots(normalizedGroupId);
        return orderDriveFolderNodes(
          roots.filter(isVisibleFolderTag).map((tag) => mapTagToFolderNode(tag, rootNodeId, scope))
        );
      }
      const personalRoot = await getPersonalRootTag();
      const children = personalRoot.children ?? [];
      return orderDriveFolderNodes(
        children.filter(isVisibleFolderTag).map((tag) => mapTagToFolderNode(tag, rootNodeId, scope))
      );
    }

    if (decoded.kind !== 'folder') return [];
    const normalizedGroupId = resolveEffectiveGroupId(nodeId, groupId);
    const scope = buildDriveNodeScope(normalizedGroupId);
    await readRawRoots(normalizedGroupId);
    const tag = tagService.getRawTagById(decoded.tagId, normalizedGroupId);
    const children = tag?.children ?? [];
    return orderDriveFolderNodes(
      children
        .filter(isVisibleFolderTag)
        .map((child) => mapTagToFolderNode(child, encodeNodeId('folder', decoded.tagId), scope))
    );
  };

  const fetchResourceNodes = async (
    nodeId: string,
    groupId: string | undefined,
    resourceLimit?: number
  ): Promise<Array<ResourceNode | LinkNode>> => {
    const { parentTagId, isVirtualRoot } = await resolveParentTagId(nodeId, groupId);
    if (!parentTagId || isVirtualRoot) {
      return [];
    }

    const normalizedGroupId = normalizeTagGroupId(groupId);
    const scope = buildDriveNodeScope(normalizedGroupId);
    const nodes: Array<ResourceNode | LinkNode> = [];
    let page = 1;

    const normalizedResourceLimit =
      resourceLimit == null ? undefined : Math.max(0, Math.floor(resourceLimit));
    if (normalizedResourceLimit === 0) return [];

    while (true) {
      const requestSize = normalizedResourceLimit
        ? Math.min(pageSize, normalizedResourceLimit - nodes.length)
        : pageSize;
      const listParams = {
        page,
        size: requestSize,
        sortBy: RESOURCE_SORT_BY.UPDATE_TIME,
        sortDir: RESOURCE_SORT_DIR.DESC,
        tagIds: [parentTagId],
        tagQueryLogicMode: 'AND' as const,
      };
      const result = normalizedGroupId
        ? await resourceService.getGroupResources({ ...listParams, groupId: normalizedGroupId })
        : await resourceService.getUserResources(listParams);

      for (const item of result.list) {
        const childNode = mapResourceItemToChildNode(item, parentTagId, nodeId, scope);
        resourceItemByNodeId.set(childNode.id, item);
        nodes.push(childNode);
      }

      if (normalizedResourceLimit && nodes.length >= normalizedResourceLimit) {
        return nodes.slice(0, normalizedResourceLimit);
      }

      const reachedKnownTotal = result.total > 0 && nodes.length >= result.total;
      const reachedKnownLastPage = result.totalPage > 0 && page >= result.totalPage;
      const reachedShortPage = result.list.length < requestSize;
      if (reachedKnownTotal || reachedKnownLastPage || reachedShortPage) {
        break;
      }
      page += 1;
    }

    return nodes;
  };

  const updateParentChildren = (parentId: string, children: DriveNode[]): void => {
    const parent = nodeMap.get(parentId);
    if (!parent || !isContainerNode(parent)) return;
    parent.childrenIds = children.filter((node) => node.type !== 'loading').map((node) => node.id);
    nodeMap.set(parentId, parent);
  };

  const listNodeChildren: IDriveService['listNodeChildren'] = async ({
    nodeId,
    groupId,
    resourceLimit,
  }) => {
    const effectiveGroupId = resolveEffectiveGroupId(nodeId, groupId);
    const groupKey = resolveGroupKey(effectiveGroupId);
    const folderNodes = await loadFolderNodes(nodeId, effectiveGroupId);
    const resourceNodes = await fetchResourceNodes(nodeId, effectiveGroupId, resourceLimit);
    const dedup = new Map<string, DriveNode>();
    [...folderNodes, ...resourceNodes].forEach((node) => dedup.set(node.id, node));
    const children = [...dedup.values()];

    trackNodes(children, groupKey);
    if (resourceLimit == null) {
      updateParentChildren(nodeId, children);
    }
    return children;
  };

  const ensureTrashTagId = async (groupId?: string): Promise<string> => {
    let trashTagId = tagService.getTrashTagId(groupId);
    if (trashTagId) return trashTagId;
    await readRawRoots(groupId);
    trashTagId = tagService.getTrashTagId(groupId);
    if (!trashTagId) {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_TRASH_TAG_NOT_FOUND);
    }
    return trashTagId;
  };

  const movePersonalResourceNodeToTrash = async (source: ResourceNode): Promise<void> => {
    const trashTagId = await ensureTrashTagId();
    await resourceService.updateResourceTags({
      resourceId: source.resourceId,
      tagIds: [trashTagId],
      primaryTagId: trashTagId,
    });
  };

  const getTrashFolderNodeId: IDriveService['getTrashFolderNodeId'] = async (groupId) => {
    await readRawRoots(groupId);
    const trashTagId = tagService.getTrashTagId(groupId);
    return trashTagId ? encodeNodeId('folder', trashTagId) : undefined;
  };

  const buildPathByFolderTag = async (
    tagId: string,
    groupId?: string
  ): Promise<Array<RootNode | FolderNode>> => {
    await readRawRoots(groupId);
    const groupKey = resolveGroupKey(groupId);
    const root = await getRootNode({ groupId });
    const path: Array<RootNode | FolderNode> = [root];
    const chain: TagTreeNode[] = [];
    let current = tagService.getRawTagById(tagId, groupId);
    while (current) {
      if (
        !resolveGroupIdFromKey(groupKey) &&
        current.tagId === personalRootTagIdByGroup.get(groupKey)
      ) {
        break;
      }
      chain.unshift(current);
      if (!current.parentId) break;
      current = tagService.getRawTagById(current.parentId, groupId);
    }
    let parentId: string = root.id;
    chain.forEach((tag) => {
      const node = mapTagToFolderNode(tag, parentId, root.scope);
      parentId = node.id;
      trackNode(node, groupKey);
      path.push(node);
    });
    return path;
  };

  const resolveResourceTagIds = (
    source: Extract<DriveNode, { type: 'resource' | 'link' }>,
    targetTagId: string
  ): string[] => {
    const sourceItem = resourceItemByNodeId.get(source.id);
    if (!sourceItem) {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_RESOURCE_TAG_INFO_MISSING);
    }

    const currentTags = sourceItem.currentTags ?? {};
    if (source.type === 'link') {
      const primaryTagId = source.primaryTagId;
      if (!primaryTagId) {
        throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_RESOURCE_TAG_INFO_MISSING);
      }
      if (targetTagId === primaryTagId) {
        throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_LINK_MOVE_TO_PRIMARY_TAG);
      }
      const linkTagIds = Object.keys(currentTags).filter(
        (tagId) => tagId !== primaryTagId && tagId !== source.folderTagId && tagId !== targetTagId
      );

      // link 移动只替换辅助 tag，主 tag 仍保持在首位。
      return [primaryTagId, ...linkTagIds, targetTagId];
    }

    const linkTagIds = Object.keys(currentTags).filter(
      (tagId) => tagId !== source.folderTagId && tagId !== targetTagId
    );

    // resource 移动替换主 tag，其余辅助 tag 保持不变。
    return [targetTagId, ...linkTagIds];
  };

  const moveResourceNode = async (
    source: Extract<DriveNode, { type: 'resource' | 'link' }>,
    targetTagId: string,
    groupId?: string
  ): Promise<void> => {
    await resourceService.updateResourceTags({
      resourceId: source.resourceId,
      tagIds: resolveResourceTagIds(source, targetTagId),
      groupId,
    });
  };

  const resolveGroupResourceUnmountTagIds = (
    source: Extract<DriveNode, { type: 'resource' | 'link' }>
  ): string[] => {
    const sourceItem = resourceItemByNodeId.get(source.id);
    if (!sourceItem) {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_RESOURCE_TAG_INFO_MISSING);
    }

    if (source.type === 'resource') {
      // 小组主挂载删除会移除该资源在当前小组下的全部挂载关系。
      return [];
    }

    const primaryTagId = source.primaryTagId;
    if (!primaryTagId) {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_RESOURCE_TAG_INFO_MISSING);
    }
    const currentTags = sourceItem.currentTags ?? {};
    const linkTagIds = Object.keys(currentTags).filter(
      (tagId) => tagId !== primaryTagId && tagId !== source.folderTagId
    );

    return [primaryTagId, ...linkTagIds];
  };

  const resolveLinkTagIdsAfterUnmount = (
    source: LinkNode,
    removedTagIds: Set<string>
  ): string[] => {
    const sourceItem = resourceItemByNodeId.get(source.id);
    if (!sourceItem) {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_RESOURCE_TAG_INFO_MISSING);
    }

    const primaryTagId = source.primaryTagId;
    if (!primaryTagId) {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_RESOURCE_TAG_INFO_MISSING);
    }

    const currentTags = sourceItem.currentTags ?? {};
    const linkTagIds = Object.keys(currentTags).filter(
      (tagId) => tagId !== primaryTagId && !removedTagIds.has(tagId)
    );

    return [primaryTagId, ...linkTagIds];
  };

  const unmountGroupResourceNode = async (
    source: Extract<DriveNode, { type: 'resource' | 'link' }>,
    groupId: string
  ): Promise<void> => {
    await resourceService.updateResourceTags({
      resourceId: source.resourceId,
      tagIds: resolveGroupResourceUnmountTagIds(source),
      groupId,
    });
  };

  const removePersonalResourceNodePermanently = async (
    source: Extract<DriveNode, { type: 'resource' | 'link' }>
  ): Promise<void> => {
    if (source.type === 'resource') {
      await resourceService.removeResources({ resourceIds: [source.resourceId] });
      return;
    }

    await resourceService.updateResourceTags({
      resourceId: source.resourceId,
      tagIds: resolveLinkTagIdsAfterUnmount(source, new Set([source.folderTagId])),
    });
  };

  const collectFolderCascadeDeletePlan = async (
    folder: FolderNode,
    groupId: string | undefined,
    plan: CascadeDeletePlan,
    depth = 0
  ): Promise<void> => {
    const [folderChildren, resourceChildren] = await Promise.all([
      loadFolderNodes(folder.id, groupId),
      fetchResourceNodes(folder.id, groupId),
    ]);

    addTagIdToDeletePlan(plan, folder.tagId, depth);

    for (const resource of resourceChildren) {
      if (groupId) {
        if (resource.type === 'resource') {
          plan.groupResourceIdsToUnmount.add(resource.resourceId);
        } else {
          addLinkTagToUnmountPlan(plan, resource, resource.folderTagId);
        }
      } else if (resource.type === 'resource') {
        plan.resourceIdsToDelete.add(resource.resourceId);
      } else {
        addLinkTagToUnmountPlan(plan, resource, resource.folderTagId);
      }
    }

    await Promise.all(
      folderChildren.map((child) => collectFolderCascadeDeletePlan(child, groupId, plan, depth + 1))
    );
  };

  const executeCascadeDeletePlan = async (
    plan: CascadeDeletePlan,
    groupId?: string
  ): Promise<void> => {
    const resourceIdsToDelete = [...plan.resourceIdsToDelete];
    const groupResourceIdsToUnmount = [...plan.groupResourceIdsToUnmount];
    const linkUnmountEntries = [...plan.linkTagIdsToUnmount.entries()].filter(
      ([resourceId]) =>
        !plan.resourceIdsToDelete.has(resourceId) && !plan.groupResourceIdsToUnmount.has(resourceId)
    );

    await Promise.all([
      resourceIdsToDelete.length > 0
        ? resourceService.removeResources({ resourceIds: resourceIdsToDelete })
        : Promise.resolve(),
      Promise.all(
        groupResourceIdsToUnmount.map((resourceId) =>
          resourceService.updateResourceTags({ resourceId, tagIds: [], groupId })
        )
      ),
      Promise.all(
        linkUnmountEntries.map(([resourceId, entry]) =>
          resourceService.updateResourceTags({
            resourceId,
            tagIds: resolveLinkTagIdsAfterUnmount(entry.source, entry.tagIds),
            groupId,
          })
        )
      ),
    ]);

    const depths = [...plan.tagIdsByDepth.keys()].sort((a, b) => b - a);
    for (const depth of depths) {
      const tagIds = [...(plan.tagIdsByDepth.get(depth) ?? [])];
      await Promise.all(
        tagIds.map((targetTagId) =>
          tagService.deleteTag({
            targetTagId,
            groupId,
          })
        )
      );
    }
  };

  const removeFolderNodeCascade = async (source: FolderNode, groupId?: string): Promise<void> => {
    const plan = createCascadeDeletePlan();
    await collectFolderCascadeDeletePlan(source, groupId, plan);
    await executeCascadeDeletePlan(plan, groupId);
  };

  const isTagInTrash = async (tagId: string): Promise<boolean> => {
    await readRawRoots();
    const trashTagId = await ensureTrashTagId();
    return tagId === trashTagId || isDescendantTag(tagId, trashTagId);
  };

  const isNodeInPersonalTrash = async (
    source: Extract<DriveNode, { type: 'folder' | 'resource' | 'link' }>
  ): Promise<boolean> => {
    if (source.type === 'folder') {
      await readRawRoots();
      const trashTagId = await ensureTrashTagId();
      return source.tagId !== trashTagId && isDescendantTag(source.tagId, trashTagId);
    }

    return isTagInTrash(source.folderTagId);
  };

  const getNodePath: IDriveService['getNodePath'] = async ({ nodeId, groupId }) => {
    const effectiveGroupId = resolveEffectiveGroupId(nodeId, groupId);
    const decoded = decodeNodeId(nodeId);
    if (decoded.kind === 'root') {
      return [await getRootNode({ groupId: effectiveGroupId })];
    }
    if (decoded.kind === 'folder') {
      return buildPathByFolderTag(decoded.tagId, effectiveGroupId);
    }
    if (decoded.kind === 'resource' || decoded.kind === 'link') {
      return buildPathByFolderTag(decoded.parentTagId, effectiveGroupId);
    }
    return [await getRootNode({ groupId: effectiveGroupId })];
  };

  const getResourceNode: IDriveService['getResourceNode'] = async (params) => {
    const children = await listNodeChildren({
      nodeId: params.parentNodeId,
      groupId: params.groupId,
    });
    return children.find(
      (node): node is ResourceNode | LinkNode =>
        (node.type === 'resource' || node.type === 'link') &&
        node.resourceId === params.resourceId &&
        (!params.nodeId || node.id === params.nodeId)
    );
  };

  const createLink: IDriveService['createLink'] = async (params) => {
    await ensureMoveRootTargetTracked(params);
    const source = getNodeOrThrow(params.nodeId);
    const target = getNodeOrThrow(params.targetFolderNodeId);
    const groupId =
      normalizeTagGroupId(params.groupId) ?? getNodeGroupId(source.id) ?? getNodeGroupId(target.id);

    if (
      !groupId ||
      source.type !== 'resource' ||
      (target.type !== 'folder' && target.type !== 'root')
    ) {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_UNSUPPORTED_MOVE);
    }
    if (source.scope.rootId !== target.scope.rootId) {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_UNSUPPORTED_MOVE);
    }

    const targetTagId =
      target.type === 'root' ? (target.canMountResources ? target.tagId : undefined) : target.tagId;
    if (!targetTagId || targetTagId === source.folderTagId) {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_UNSUPPORTED_MOVE);
    }

    const sourceItem = resourceItemByNodeId.get(source.id);
    if (!sourceItem) {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_RESOURCE_TAG_INFO_MISSING);
    }
    const currentTagIds = Object.keys(sourceItem.currentTags ?? {});
    if (currentTagIds.includes(targetTagId)) {
      return;
    }

    await resourceService.updateResourceTags({
      resourceId: source.resourceId,
      groupId,
      tagIds: [
        source.folderTagId,
        ...currentTagIds.filter((id) => id !== source.folderTagId),
        targetTagId,
      ],
    });
    clearCache();
  };

  const createMoveNodeToFolderPlan = (params: MoveToFolderParams): MoveNodeToFolderPlan => {
    const { nodeId, targetFolderNodeId } = params;
    const source = getNodeOrThrow(nodeId);
    const target = getNodeOrThrow(targetFolderNodeId);
    const groupId =
      normalizeTagGroupId(params.groupId) ??
      getNodeGroupId(nodeId) ??
      getNodeGroupId(targetFolderNodeId);

    if (target.type !== 'folder' && target.type !== 'root') {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_TARGET_UNSUPPORTED_DROP);
    }
    if (source.scope.rootId !== target.scope.rootId) {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_UNSUPPORTED_MOVE);
    }

    const targetTagId =
      target.type === 'root' ? (target.canMountResources ? target.tagId : undefined) : target.tagId;

    if (source.type === 'folder') {
      if (source.systemType) {
        throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_UNSUPPORTED_MOVE);
      }
      if (targetTagId && isDescendantTag(targetTagId, source.tagId, groupId)) {
        throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_UNSUPPORTED_MOVE);
      }
      return { source, targetTagId, groupId };
    }

    if (isResourceNode(source) && targetTagId) {
      return { source, targetTagId, groupId };
    }

    throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_UNSUPPORTED_MOVE);
  };

  const ensureMoveRootTargetTracked = async (
    params: Pick<MoveToFolderParams, 'targetFolderNodeId' | 'groupId'>
  ): Promise<void> => {
    // 移动会清空节点缓存，路径状态可能仍保留尚未重新登记的抽象根节点。
    if (nodeMap.has(params.targetFolderNodeId)) {
      return;
    }
    const decodedTarget = decodeNodeId(params.targetFolderNodeId);
    if (decodedTarget.kind !== 'root') {
      return;
    }
    await getRootNode({ rootId: params.targetFolderNodeId, groupId: params.groupId });
  };

  const executeMoveNodeToFolderPlan = async (plan: MoveNodeToFolderPlan): Promise<void> => {
    if (plan.source.type === 'folder') {
      await tagService.moveTag({
        targetTagId: plan.source.tagId,
        newParentId: plan.targetTagId,
        groupId: plan.groupId,
      });
      return;
    }

    if (isResourceNode(plan.source) && plan.targetTagId) {
      await moveResourceNode(plan.source, plan.targetTagId, plan.groupId);
      return;
    }

    throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_UNSUPPORTED_MOVE);
  };

  const moveNodeToFolder = async (
    params: MoveToFolderParams,
    options?: { clearCacheAfterMove?: boolean }
  ): Promise<void> => {
    await ensureMoveRootTargetTracked(params);
    const plan = createMoveNodeToFolderPlan(params);
    await executeMoveNodeToFolderPlan(plan);
    if (options?.clearCacheAfterMove !== false) {
      clearCache();
    }
  };

  const resolveBatchMoveSourceIds = (params: {
    nodeIds: string[];
    targetFolderNodeId: string;
  }): string[] => {
    const sources = [...new Set(params.nodeIds)].map((nodeId) => getNodeOrThrow(nodeId));
    if (sources.some((source) => source.type === 'folder' && source.systemType)) {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_SELECTION_CONTAINS_SYSTEM_FOLDER);
    }
    if (sources.some((source) => source.id === params.targetFolderNodeId)) {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_UNSUPPORTED_MOVE);
    }

    const sourceIdSet = new Set(sources.map((source) => source.id));
    return sources
      .filter((source) => {
        let parentId = source.parentId;
        while (parentId) {
          if (sourceIdSet.has(parentId)) {
            return false;
          }
          parentId = nodeMap.get(parentId)?.parentId ?? null;
        }
        return true;
      })
      .filter((source) => source.parentId !== params.targetFolderNodeId)
      .map((source) => source.id);
  };

  const moveNodesToFolder: IDriveService['moveNodesToFolder'] = async (params) => {
    await ensureMoveRootTargetTracked(params);
    const sourceNodeIds = resolveBatchMoveSourceIds(params);
    if (sourceNodeIds.length === 0) {
      return 0;
    }
    const plans = sourceNodeIds.map((nodeId) =>
      createMoveNodeToFolderPlan({
        nodeId,
        targetFolderNodeId: params.targetFolderNodeId,
        groupId: params.groupId,
      })
    );

    for (const plan of plans) {
      await executeMoveNodeToFolderPlan(plan);
    }
    clearCache();
    return plans.length;
  };

  const removeNode: IDriveService['removeNode'] = async (params) => {
    const { nodeId } = params;
    const source = getNodeOrThrow(nodeId);
    const groupId = normalizeTagGroupId(params.groupId) ?? getNodeGroupId(nodeId);

    if (groupId) {
      if (source.type === 'folder') {
        if (source.systemType) {
          throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_UNSUPPORTED_DELETE);
        }
        await removeFolderNodeCascade(source, groupId);
      } else if (isResourceNode(source)) {
        await unmountGroupResourceNode(source, groupId);
      } else {
        throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_UNSUPPORTED_DELETE);
      }
      clearCache();
      return;
    }

    if (source.type === 'folder' && source.systemType) {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_UNSUPPORTED_DELETE);
    } else if (source.type === 'folder' && (await isNodeInPersonalTrash(source))) {
      await removeFolderNodeCascade(source);
    } else if (isResourceNode(source) && (await isNodeInPersonalTrash(source))) {
      await removePersonalResourceNodePermanently(source);
    } else if (source.type === 'folder') {
      const trashTagId = await ensureTrashTagId(groupId);
      await tagService.moveTag({
        targetTagId: source.tagId,
        newParentId: trashTagId,
        groupId,
      });
    } else if (source.type === 'link') {
      await resourceService.updateResourceTags({
        resourceId: source.resourceId,
        tagIds: resolveLinkTagIdsAfterUnmount(source, new Set([source.folderTagId])),
      });
    } else if (source.type === 'resource') {
      await movePersonalResourceNodeToTrash(source);
    } else {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_UNSUPPORTED_DELETE);
    }
    clearCache();
  };

  const renameNode: IDriveService['renameNode'] = async (params) => {
    const { nodeId, newName } = params;
    const source = getNodeOrThrow(nodeId);
    // 重命名必须以目标节点所属 scope 为准，避免侧栏切换作用域后将个人目录误提交到小组。
    const groupId = source.scope.type === 'group' ? source.scope.groupId : undefined;
    if (source.type === 'folder') {
      if (source.systemType) {
        throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_UNSUPPORTED_RENAME);
      }
      await tagService.updateTag({
        targetTagId: source.tagId,
        tagName: `/${newName}`,
        groupId,
      });
      clearCache();
      return;
    }
    if (source.type === 'resource') {
      await resourceService.renameResource({
        resourceId: source.resourceId,
        newName,
      });
      clearCache();
      return;
    }
    if (source.type === 'link') {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_LINK_UNSUPPORTED_RENAME);
    }
    throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_UNSUPPORTED_RENAME);
  };

  const createFolder: IDriveService['createFolder'] = async (params) => {
    const { parentId, name } = params;
    const groupId = resolveEffectiveGroupId(parentId, params.groupId);
    const decodedParent = decodeNodeId(parentId);
    let targetParentTagId: string | undefined;
    if (decodedParent.kind === 'root') {
      const rootNode = nodeMap.get(parentId);
      targetParentTagId =
        rootNode?.type === 'root' && rootNode.canMountResources
          ? rootNode.tagId
          : groupId
            ? undefined
            : (await getPersonalRootTag()).tagId;
    } else if (decodedParent.kind === 'folder') {
      targetParentTagId = decodedParent.tagId;
    } else {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_CREATE_FOLDER_ONLY);
    }
    const tagId = await tagService.addTag({
      groupId,
      parentId: targetParentTagId,
      tagName: `/${name}`,
    });
    clearCache();
    return tagId;
  };

  return {
    getRootNode,
    getTrashFolderNodeId,
    listNodeChildren,
    getNodePath,
    getResourceNode,
    moveToFolder: moveNodeToFolder,
    createLink,
    moveNodesToFolder,
    removeNode,
    renameNode,
    createFolder,
    getSharedFolderTagId,
  };
};
