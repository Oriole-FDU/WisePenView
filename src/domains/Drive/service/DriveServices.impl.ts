import { registerServiceCacheCleaner } from '@/domains/_shared/cacheRegistry';
import type { DriveNode, FolderNode, LinkNode, ResourceNode, TrashNode } from '@/domains/Drive';
import type { IResourceService, ResourceItem } from '@/domains/Resource';
import { RESOURCE_SORT_BY, RESOURCE_SORT_DIR } from '@/domains/Resource';
import type { ITagService, TagTreeNode } from '@/domains/Tag';
import { useTrashTagStore } from '@/store';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';
import { normalizeTagGroupId } from '@/utils/normalize/normalizeTagGroupId';
import {
  buildDriveRootNode,
  buildLoadMoreNode,
  decodeNodeId,
  DRIVE_ROOT_ID,
  encodeNodeId,
  isFolderLikeNode,
  mapResourceItemToChildNode,
  mapTagToFolderNode,
  mapTrashTagToTrashNode,
} from '../mapper/DriveServices.map';
import type { CreateDriveServiceOptions, IDriveService } from './index.type';

const CACHE_KEY_DEFAULT = '__default__';
const DEFAULT_PAGE_SIZE = 50;
const TRASH_TAG_NAME = '.Trash';
const HIDDEN_TAG_PREFIX = '.';

export interface DriveServicesDeps {
  tagService: ITagService;
  resourceService: IResourceService;
}

const isVisibleTagNode = (node: TagTreeNode): boolean => {
  const name = (node.tagName ?? '').trim();
  if (name === TRASH_TAG_NAME) return false;
  return !name.startsWith(HIDDEN_TAG_PREFIX);
};

const findTrashTag = (roots: TagTreeNode[]): TagTreeNode | undefined => {
  return roots.find((node) => node.tagName === TRASH_TAG_NAME);
};

const resolveGroupKey = (groupId?: string): string => {
  return normalizeTagGroupId(groupId) ?? CACHE_KEY_DEFAULT;
};

const resolveGroupIdFromKey = (groupKey: string): string | undefined => {
  return groupKey === CACHE_KEY_DEFAULT ? undefined : groupKey;
};

export const createDriveServices = (
  deps: DriveServicesDeps,
  opts?: CreateDriveServiceOptions
): IDriveService => {
  const { tagService, resourceService } = deps;
  const pageSize = opts?.pageSize ?? DEFAULT_PAGE_SIZE;

  const nodeMap = new Map<string, DriveNode>();
  const nodeGroupKeyMap = new Map<string, string>();
  const loadedPages = new Map<string, number>();
  const loadedResourceNodes = new Map<string, Array<ResourceNode | LinkNode>>();
  const resourceItemByNodeId = new Map<string, ResourceItem>();
  const personalRootTagIdByGroup = new Map<string, string>();

  const clearCache = (): void => {
    nodeMap.clear();
    nodeGroupKeyMap.clear();
    loadedPages.clear();
    loadedResourceNodes.clear();
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

  const readRawRoots = async (groupId?: string): Promise<TagTreeNode[]> => {
    const normalized = normalizeTagGroupId(groupId);
    const roots = await tagService.getRawTagTree(normalized);
    const trashTag = findTrashTag(roots);
    useTrashTagStore.getState().setTrashTagId(normalized, trashTag?.tagId);
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

  const resolveRootNode = async (groupId?: string): Promise<FolderNode> => {
    const groupKey = resolveGroupKey(groupId);
    const normalizedGroupId = resolveGroupIdFromKey(groupKey);
    const personalRootTag = normalizedGroupId ? undefined : await getPersonalRootTag(groupId);
    const rootNode = buildDriveRootNode({ groupId: normalizedGroupId, personalRootTag });
    trackNode(rootNode, groupKey);
    return rootNode;
  };

  const getNodeGroupId = (nodeId: string): string | undefined => {
    const groupKey = nodeGroupKeyMap.get(nodeId);
    if (groupKey) return resolveGroupIdFromKey(groupKey);
    return undefined;
  };

  const getNodeOrThrow = (nodeId: string): DriveNode => {
    const node = nodeMap.get(nodeId);
    if (!node) {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_NOT_FOUND, { nodeId });
    }
    return node;
  };

  const resolveParentTagId = async (
    nodeId: string,
    groupId?: string
  ): Promise<{ parentTagId?: string; isGroupVirtualRoot: boolean }> => {
    const decoded = decodeNodeId(nodeId);
    if (decoded.kind === 'root') {
      if (normalizeTagGroupId(groupId)) return { parentTagId: undefined, isGroupVirtualRoot: true };
      const personalRootTag = await getPersonalRootTag(groupId);
      return { parentTagId: personalRootTag.tagId, isGroupVirtualRoot: false };
    }
    if (decoded.kind === 'folder') return { parentTagId: decoded.tagId, isGroupVirtualRoot: false };
    if (decoded.kind === 'trash') return { parentTagId: decoded.tagId, isGroupVirtualRoot: false };
    return { parentTagId: undefined, isGroupVirtualRoot: false };
  };

  const loadFolderNodes = async (nodeId: string, groupId?: string): Promise<FolderNode[]> => {
    const decoded = decodeNodeId(nodeId);
    if (decoded.kind === 'trash') {
      const trashTag = tagService.getRawTagById(decoded.tagId, groupId);
      const children = trashTag?.children ?? [];
      return children
        .filter(isVisibleTagNode)
        .map((child) => mapTagToFolderNode(child, encodeNodeId('trash', decoded.tagId)));
    }
    if (decoded.kind === 'root') {
      const normalizedGroupId = normalizeTagGroupId(groupId);
      if (normalizedGroupId) {
        const roots = await readRawRoots(normalizedGroupId);
        return roots.filter(isVisibleTagNode).map((tag) => mapTagToFolderNode(tag, DRIVE_ROOT_ID));
      }
      const personalRoot = await getPersonalRootTag(groupId);
      const children = personalRoot.children ?? [];
      return children.filter(isVisibleTagNode).map((tag) => mapTagToFolderNode(tag, DRIVE_ROOT_ID));
    }
    if (decoded.kind !== 'folder') return [];
    const tag = tagService.getRawTagById(decoded.tagId, groupId);
    const children = tag?.children ?? [];
    return children
      .filter(isVisibleTagNode)
      .map((child) => mapTagToFolderNode(child, encodeNodeId('folder', decoded.tagId)));
  };

  const fetchResourceNodes = async (
    nodeId: string,
    groupId: string | undefined,
    page: number
  ): Promise<{ nodes: Array<ResourceNode | LinkNode>; total: number }> => {
    const { parentTagId, isGroupVirtualRoot } = await resolveParentTagId(nodeId, groupId);
    if (!parentTagId || isGroupVirtualRoot) {
      return { nodes: [], total: 0 };
    }
    const listParams = {
      page,
      size: pageSize,
      sortBy: RESOURCE_SORT_BY.UPDATE_TIME,
      sortDir: RESOURCE_SORT_DIR.DESC,
      tagIds: [parentTagId],
      tagQueryLogicMode: 'AND' as const,
    };
    const normalizedGroupId = normalizeTagGroupId(groupId);
    const result = normalizedGroupId
      ? await resourceService.getGroupResources({ ...listParams, groupId: normalizedGroupId })
      : await resourceService.getUserResources(listParams);
    const nodes = result.list.map((item) => {
      const childNode = mapResourceItemToChildNode(item, parentTagId, nodeId);
      resourceItemByNodeId.set(childNode.id, item);
      return childNode;
    });
    return { nodes, total: result.total };
  };

  const appendTrashNodeIfNeeded = async (
    nodeId: string,
    groupId?: string
  ): Promise<TrashNode | undefined> => {
    if (nodeId !== DRIVE_ROOT_ID) return undefined;
    const trashTagId = useTrashTagStore.getState().getTrashTagId(groupId);
    if (!trashTagId) return undefined;
    const trashTag = tagService.getRawTagById(trashTagId, groupId);
    if (!trashTag) return undefined;
    return mapTrashTagToTrashNode(trashTag, DRIVE_ROOT_ID);
  };

  const updateParentChildren = (parentId: string, children: DriveNode[]): void => {
    const parent = nodeMap.get(parentId);
    if (!parent || !isFolderLikeNode(parent)) return;
    parent.childrenIds = children.filter((node) => node.type !== 'loadMore').map((node) => node.id);
    nodeMap.set(parentId, parent);
  };

  const buildChildrenForNode = async (
    nodeId: string,
    groupId: string | undefined,
    page: number
  ): Promise<DriveNode[]> => {
    const groupKey = resolveGroupKey(groupId);
    const folderNodes = await loadFolderNodes(nodeId, groupId);
    const previousResources = page > 1 ? (loadedResourceNodes.get(nodeId) ?? []) : [];
    const { nodes: pageResources, total } = await fetchResourceNodes(nodeId, groupId, page);
    const dedup = new Map<string, ResourceNode | LinkNode>();
    [...previousResources, ...pageResources].forEach((node) => dedup.set(node.id, node));
    const mergedResources = [...dedup.values()];
    loadedResourceNodes.set(nodeId, mergedResources);

    const children: DriveNode[] = [...folderNodes, ...mergedResources];
    const trashNode = await appendTrashNodeIfNeeded(nodeId, groupId);
    if (trashNode) children.push(trashNode);
    const loadedCount = page * pageSize;
    if (total > loadedCount) {
      children.push(buildLoadMoreNode(nodeId, loadedCount, total));
    }

    trackNodes(children, groupKey);
    updateParentChildren(nodeId, children);
    return children;
  };

  const ensureTrashTagId = async (groupId?: string): Promise<string> => {
    let trashTagId = useTrashTagStore.getState().getTrashTagId(groupId);
    if (trashTagId) return trashTagId;
    await readRawRoots(groupId);
    trashTagId = useTrashTagStore.getState().getTrashTagId(groupId);
    if (!trashTagId) {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_TRASH_TAG_NOT_FOUND);
    }
    return trashTagId;
  };

  const buildPathByFolderTag = async (tagId: string, groupId?: string): Promise<DriveNode[]> => {
    const groupKey = resolveGroupKey(groupId);
    const root = await resolveRootNode(groupId);
    const path: DriveNode[] = [root];
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
    let parentId: string = DRIVE_ROOT_ID;
    chain.forEach((tag) => {
      const node = mapTagToFolderNode(tag, parentId);
      parentId = node.id;
      trackNode(node, groupKey);
      path.push(node);
    });
    return path;
  };

  const moveResourceNode = async (
    source: Extract<DriveNode, { type: 'resource' | 'link' }>,
    targetTagId: string,
    groupId?: string
  ): Promise<void> => {
    const sourceItem = resourceItemByNodeId.get(source.id);
    if (!sourceItem) {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_RESOURCE_TAG_INFO_MISSING);
    }
    const currentTags = sourceItem.currentTags ?? {};
    const nonFolderTagIds = Object.entries(currentTags)
      .filter(([, tagName]) => !tagName.startsWith('/'))
      .map(([tagId]) => tagId);
    const tagIds = [...nonFolderTagIds, targetTagId];
    await resourceService.updateResourceTags({
      resourceId: source.resourceId,
      tagIds,
      groupId,
    });
  };

  const getDriveTree: IDriveService['getDriveTree'] = async ({ rootId, groupId }) => {
    if (rootId !== DRIVE_ROOT_ID) {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_UNSUPPORTED_ROOT, { rootId });
    }
    await readRawRoots(groupId);
    return resolveRootNode(groupId);
  };

  const loadNodeChildren: IDriveService['loadNodeChildren'] = async ({ nodeId, groupId }) => {
    loadedPages.set(nodeId, 1);
    return buildChildrenForNode(nodeId, groupId, 1);
  };

  const loadMore: IDriveService['loadMore'] = async ({ parentNodeId, groupId }) => {
    const current = loadedPages.get(parentNodeId) ?? 1;
    const next = current + 1;
    loadedPages.set(parentNodeId, next);
    return buildChildrenForNode(parentNodeId, groupId, next);
  };

  const getPathById: IDriveService['getPathById'] = async ({ nodeId, groupId }) => {
    if (nodeId === DRIVE_ROOT_ID) {
      return [await resolveRootNode(groupId)];
    }
    const decoded = decodeNodeId(nodeId);
    if (decoded.kind === 'trash') {
      const root = await resolveRootNode(groupId);
      const trashTag = tagService.getRawTagById(decoded.tagId, groupId);
      if (!trashTag) return [root];
      const trashNode = mapTrashTagToTrashNode(trashTag, DRIVE_ROOT_ID);
      trackNode(trashNode, resolveGroupKey(groupId));
      return [root, trashNode];
    }
    if (decoded.kind === 'folder') {
      return buildPathByFolderTag(decoded.tagId, groupId);
    }
    if (decoded.kind === 'resource' || decoded.kind === 'link') {
      const folderPath = await buildPathByFolderTag(decoded.parentTagId, groupId);
      const existing = nodeMap.get(nodeId);
      if (existing) return [...folderPath, existing];
      const parentId = folderPath[folderPath.length - 1]?.id ?? DRIVE_ROOT_ID;
      const fallbackNode: ResourceNode | LinkNode =
        decoded.kind === 'resource'
          ? {
              id: nodeId,
              type: 'resource',
              parentId,
              resourceId: decoded.resourceId,
              title: decoded.resourceId,
              resourceType: 'document',
            }
          : {
              id: nodeId,
              type: 'link',
              parentId,
              resourceId: decoded.resourceId,
              title: decoded.resourceId,
              resourceType: 'document',
            };
      trackNode(fallbackNode, resolveGroupKey(groupId));
      return [...folderPath, fallbackNode];
    }
    return [await resolveRootNode(groupId)];
  };

  const moveNode: IDriveService['moveNode'] = async (params) => {
    const { nodeId, newParentId } = params;
    const source = getNodeOrThrow(nodeId);
    const target = getNodeOrThrow(newParentId);
    const groupId =
      normalizeTagGroupId(params.groupId) ?? getNodeGroupId(nodeId) ?? getNodeGroupId(newParentId);
    if (target.type !== 'folder' && target.type !== 'trash') {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_TARGET_UNSUPPORTED_DROP);
    }
    if (source.type === 'folder') {
      const newParentTagId =
        target.id === DRIVE_ROOT_ID
          ? groupId
            ? undefined
            : (await getPersonalRootTag(groupId)).tagId
          : target.tagId;
      await tagService.moveTag({
        targetTagId: source.tagId,
        newParentId: newParentTagId,
        groupId,
      });
    } else if (source.type === 'resource' || source.type === 'link') {
      await moveResourceNode(source, target.tagId, groupId);
    } else {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_UNSUPPORTED_MOVE);
    }
    clearCache();
  };

  const removeNode: IDriveService['removeNode'] = async (params) => {
    const { nodeId } = params;
    const source = getNodeOrThrow(nodeId);
    const groupId = normalizeTagGroupId(params.groupId) ?? getNodeGroupId(nodeId);
    const trashTagId = await ensureTrashTagId(groupId);
    if (source.type === 'folder') {
      await tagService.moveTag({
        targetTagId: source.tagId,
        newParentId: trashTagId,
        groupId,
      });
    } else if (source.type === 'resource' || source.type === 'link') {
      await moveResourceNode(source, trashTagId, groupId);
    } else {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_UNSUPPORTED_DELETE);
    }
    clearCache();
  };

  const renameNode: IDriveService['renameNode'] = async (params) => {
    const { nodeId, newName } = params;
    const source = getNodeOrThrow(nodeId);
    const groupId = normalizeTagGroupId(params.groupId) ?? getNodeGroupId(nodeId);
    if (source.type === 'folder') {
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

  const createNode: IDriveService['createNode'] = async (params) => {
    const { parentId, name, type } = params;
    if (type !== 'folder') {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_UNSUPPORTED_CREATE_TYPE, { type });
    }
    const groupId = normalizeTagGroupId(params.groupId) ?? getNodeGroupId(parentId);
    const decodedParent = decodeNodeId(parentId);
    let targetParentTagId: string | undefined;
    if (decodedParent.kind === 'root') {
      targetParentTagId = groupId ? undefined : (await getPersonalRootTag(groupId)).tagId;
    } else if (decodedParent.kind === 'folder') {
      targetParentTagId = decodedParent.tagId;
    } else {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_CREATE_FOLDER_ONLY);
    }
    await tagService.addTag({
      groupId,
      parentId: targetParentTagId,
      tagName: `/${name}`,
    });
    clearCache();
  };

  return {
    getDriveTree,
    loadNodeChildren,
    loadMore,
    getPathById,
    moveNode,
    removeNode,
    renameNode,
    createNode,
  };
};
