import type {
  DriveContainerNode,
  DriveMutableNode,
  DriveNode,
  DriveNodeScope,
  DriveResourceNode,
  FolderNode,
} from '@/domains/Drive';
import type { IResourceService, ResourceItem } from '@/domains/Resource';
import { RESOURCE_SORT_BY, RESOURCE_SORT_DIR } from '@/domains/Resource';
import type { ITagService, TagTreeNode } from '@/domains/Tag';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';
import { normalizeTagGroupId } from '@/utils/normalize/normalizeTagGroupId';

import {
  buildDriveRootNode,
  decodeNodeId,
  decodeRootNodeScope,
  DRIVE_SHARED_TAG_NAME,
  DRIVE_TRASH_TAG_NAME,
  mapResourceItemToChildNode,
  mapTagToFolderNode,
  orderDriveFolderNodes,
} from '../mapper/DriveServices.map';
import { useDriveRefreshStore } from '../store/useDriveRefreshStore';
import type {
  AddResourcesToGroupParams,
  CreateDriveServiceOptions,
  CreateFolderParams,
  DeleteTrashedNodesParams,
  DriveNodeChildrenPage,
  GetDriveRootParams,
  GetDriveSystemFolderParams,
  GetMountPathParams,
  GetNodePathParams,
  IDriveService,
  LoadDriveNodeChildrenParams,
  MoveNodesParams,
  MoveNodesToTrashParams,
  RemoveNodesFromGroupParams,
  RenameNodeParams,
  ResolveResourceNodeParams,
  SetPersonalResourcesLocationParams,
} from './index.type';

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;
const HIDDEN_TAG_PREFIX = '.';

interface DriveServicesDeps {
  tagService: ITagService;
  resourceService: IResourceService;
}

interface ResourceCursor {
  parentId: string;
  page: number;
  pageSize: number;
}

const isVisibleFolderTag = (node: TagTreeNode): boolean => {
  const name = (node.tagName ?? '').trim();
  if (name === DRIVE_TRASH_TAG_NAME) return false;
  if (name === DRIVE_SHARED_TAG_NAME) return true;
  return !name.startsWith(HIDDEN_TAG_PREFIX);
};

const normalizeIds = (ids: string[]): string[] =>
  Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean)));

const normalizePageSize = (pageSize: number | undefined, fallback: number): number =>
  Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(pageSize ?? fallback)));

const encodeResourceCursor = (cursor: ResourceCursor): string =>
  encodeURIComponent(JSON.stringify(cursor));

const decodeResourceCursor = (value: string): ResourceCursor => {
  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(value));
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      typeof (parsed as ResourceCursor).parentId !== 'string' ||
      !Number.isInteger((parsed as ResourceCursor).page) ||
      !Number.isInteger((parsed as ResourceCursor).pageSize)
    ) {
      throw createClientError(FRONTEND_CLIENT_ERROR.VALIDATION, { field: 'cursor' });
    }
    return parsed as ResourceCursor;
  } catch (error) {
    if (error instanceof Error && error.name === 'WisePenError') throw error;
    throw createClientError(FRONTEND_CLIENT_ERROR.VALIDATION, { field: 'cursor' }, error);
  }
};

const getGroupId = (scope: DriveNodeScope): string | undefined =>
  scope.type === 'group' ? scope.groupId : undefined;

const sameScope = (left: DriveNodeScope, right: DriveNodeScope): boolean =>
  left.rootId === right.rootId;

const isResourceNode = (node: DriveNode): node is DriveResourceNode =>
  node.type === 'resource' || node.type === 'link';

export const createDriveService = (
  deps: DriveServicesDeps,
  opts?: CreateDriveServiceOptions
): IDriveService => {
  const { tagService, resourceService } = deps;
  const defaultPageSize = normalizePageSize(opts?.pageSize, DEFAULT_PAGE_SIZE);
  const notifyDriveRefresh = (): void => {
    useDriveRefreshStore.getState().requestRefresh();
  };

  const getPersonalRootTag = async (refresh = false): Promise<TagTreeNode> => {
    const roots = await tagService.getRawTagTree(undefined, { refresh });
    const root = roots.find((tag) => tag.tagName === '/');
    if (!root) {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_PERSONAL_ROOT_NOT_FOUND);
    }
    return root;
  };

  const getRoot: IDriveService['getRoot'] = async (params?: GetDriveRootParams) => {
    const scope = decodeRootNodeScope(params?.rootId, normalizeTagGroupId(params?.groupId));
    const personalRootTag = scope.type === 'personal' ? await getPersonalRootTag() : undefined;
    return buildDriveRootNode({
      groupId: getGroupId(scope),
      personalRootTag,
    });
  };

  const getTagAncestors = (tagId: string, groupId?: string): string[] => {
    const ancestors: string[] = [];
    let current = tagService.getRawTagById(tagId, groupId);
    while (current?.parentId) {
      ancestors.unshift(current.parentId);
      current = tagService.getRawTagById(current.parentId, groupId);
    }
    return ancestors;
  };

  const mapFolder = (tag: TagTreeNode, parentNodeId: string, scope: DriveNodeScope): FolderNode =>
    mapTagToFolderNode(tag, parentNodeId, scope, getTagAncestors(tag.tagId, getGroupId(scope)));

  const getDirectFolderTags = async (
    parent: DriveContainerNode,
    refresh = false
  ): Promise<TagTreeNode[]> => {
    const groupId = getGroupId(parent.scope);
    const roots = await tagService.getRawTagTree(groupId, { refresh });
    if (parent.type === 'root') {
      if (groupId) return roots.filter(isVisibleFolderTag);
      const personalRoot = roots.find((tag) => tag.tagName === '/');
      const sharedTag = roots.find((tag) => tag.tagName === DRIVE_SHARED_TAG_NAME);
      return [...(sharedTag ? [sharedTag] : []), ...(personalRoot?.children ?? [])].filter(
        isVisibleFolderTag
      );
    }
    const tag = tagService.getRawTagById(parent.tagId, groupId);
    return (tag?.children ?? []).filter(isVisibleFolderTag);
  };

  const getParentTagId = async (
    parent: DriveContainerNode,
    refresh = false
  ): Promise<string | undefined> => {
    if (parent.type === 'folder') return parent.tagId;
    if (parent.scope.type === 'group') return undefined;
    return (await getPersonalRootTag(refresh)).tagId;
  };

  const loadNodeChildren: IDriveService['loadNodeChildren'] = async ({
    parent,
    cursor,
    pageSize,
    kinds = ['folder', 'resource', 'link'],
    resourceType,
    refresh = false,
  }: LoadDriveNodeChildrenParams): Promise<DriveNodeChildrenPage> => {
    const resolvedSize = normalizePageSize(pageSize, defaultPageSize);
    const cursorState = cursor ? decodeResourceCursor(cursor) : undefined;
    if (cursorState && cursorState.parentId !== parent.id) {
      throw createClientError(FRONTEND_CLIENT_ERROR.VALIDATION, { field: 'cursor' });
    }

    const includeFolders = !cursor && kinds.includes('folder');
    const includeResources = kinds.includes('resource') || kinds.includes('link');
    const directFolderTags = await getDirectFolderTags(parent, refresh);
    const folderTags = includeFolders ? directFolderTags : [];
    const folderNodes = orderDriveFolderNodes(
      folderTags.map((tag) => mapFolder(tag, parent.id, parent.scope))
    );
    const parentTagId = await getParentTagId(parent, Boolean(refresh && !cursor));
    if (
      !includeResources ||
      !parentTagId ||
      (parent.scope.type === 'group' && parent.type === 'root')
    ) {
      return {
        folderNodes,
        resourceNodes: [],
        folderTotal: directFolderTags.length,
        resourceTotal: 0,
        total: directFolderTags.length,
      };
    }

    const resourcePage = cursorState?.page ?? 1;
    const resourcePageSize = cursorState?.pageSize ?? resolvedSize;
    const result =
      parent.scope.type === 'group'
        ? await resourceService.getGroupResources({
            page: resourcePage,
            size: resourcePageSize,
            sortBy: RESOURCE_SORT_BY.UPDATE_TIME,
            sortDir: RESOURCE_SORT_DIR.DESC,
            resourceType,
            tagIds: [parentTagId],
            tagQueryLogicMode: 'AND',
            groupId: parent.scope.groupId,
          })
        : await resourceService.getUserResources({
            page: resourcePage,
            size: resourcePageSize,
            sortBy: RESOURCE_SORT_BY.UPDATE_TIME,
            sortDir: RESOURCE_SORT_DIR.DESC,
            resourceType,
            tagIds: [parentTagId],
            tagQueryLogicMode: 'AND',
          });
    const resourceNodes = result.list
      .map((item: ResourceItem) =>
        mapResourceItemToChildNode(item, parentTagId, parent.id, parent.scope)
      )
      .filter((node) => kinds.includes(node.type));
    const resolvedPage = Math.max(1, result.page || resourcePage);
    const resolvedTotal = Math.max(0, result.total || 0);
    const resolvedTotalPage = Math.max(0, result.totalPage || 0);
    const hasMore =
      resolvedTotalPage > 0
        ? resolvedPage < resolvedTotalPage
        : (resolvedPage - 1) * resourcePageSize + resourceNodes.length < resolvedTotal;
    return {
      folderNodes,
      resourceNodes,
      folderTotal: directFolderTags.length,
      resourceTotal: resolvedTotal,
      total: directFolderTags.length + resolvedTotal,
      ...(hasMore
        ? {
            nextCursor: encodeResourceCursor({
              parentId: parent.id,
              page: resolvedPage + 1,
              pageSize: resourcePageSize,
            }),
          }
        : {}),
    };
  };

  const getMountPath: IDriveService['getMountPath'] = async ({ location }: GetMountPathParams) => {
    const { scope, mountTagId } = location;
    const root = await getRoot({ rootId: scope.rootId, groupId: getGroupId(scope) });
    if (root.tagId === mountTagId) return [root];
    const groupId = getGroupId(scope);
    await tagService.getRawTagTree(groupId);
    const chain: TagTreeNode[] = [];
    let current = tagService.getRawTagById(mountTagId, groupId);
    if (!current) {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_NOT_FOUND, {
        nodeId: mountTagId,
      });
    }
    while (current) {
      if (scope.type === 'personal' && current.tagName === '/') break;
      chain.unshift(current);
      current = current.parentId ? tagService.getRawTagById(current.parentId, groupId) : undefined;
    }
    let parentId = root.id;
    return [
      root,
      ...chain.map((tag) => {
        const folder = mapFolder(tag, parentId, scope);
        parentId = folder.id;
        return folder;
      }),
    ];
  };

  const getNodePath: IDriveService['getNodePath'] = async ({
    nodeId,
    scope,
  }: GetNodePathParams) => {
    const root = await getRoot({ rootId: scope.rootId, groupId: getGroupId(scope) });
    if (nodeId === root.id) return [root];
    const decoded = decodeNodeId(nodeId);
    if (decoded.kind !== 'folder') {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_NOT_FOUND, { nodeId });
    }
    return getMountPath({ location: { scope, mountTagId: decoded.tagId } });
  };

  const resolveResourceNode: IDriveService['resolveResourceNode'] = async ({
    resource,
    location,
  }: ResolveResourceNodeParams) => {
    const { scope, mountTagId } = location;
    const groupId = getGroupId(scope);
    const tagBind = resource.tagBinds?.find(
      (bind) =>
        normalizeTagGroupId(bind.groupId) === groupId &&
        Object.prototype.hasOwnProperty.call(bind.tags ?? {}, mountTagId)
    );
    if (!tagBind) {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_RESOURCE_TAG_INFO_MISSING, {
        resourceId: resource.resourceId,
        tagId: mountTagId,
      });
    }
    const path = await getMountPath({ location });
    const parent = path.at(-1);
    if (!parent) {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_NOT_FOUND, {
        nodeId: mountTagId,
      });
    }
    const primaryTagId = tagBind.primaryTagId ?? Object.keys(tagBind.tags ?? {})[0];
    return mapResourceItemToChildNode(resource, mountTagId, parent.id, scope, primaryTagId);
  };

  const getSystemFolder: IDriveService['getSystemFolder'] = async ({
    scope,
    type,
  }: GetDriveSystemFolderParams) => {
    const notFoundCode =
      type === 'trash'
        ? FRONTEND_CLIENT_ERROR.DRIVE_TRASH_TAG_NOT_FOUND
        : FRONTEND_CLIENT_ERROR.DRIVE_SHARED_TAG_NOT_FOUND;
    if (scope.type !== 'personal') throw createClientError(notFoundCode);
    const systemTagName = type === 'trash' ? DRIVE_TRASH_TAG_NAME : DRIVE_SHARED_TAG_NAME;
    const roots = await tagService.getRawTagTree();
    const queue = [...roots];
    while (queue.length > 0) {
      const tag = queue.shift();
      if (!tag) continue;
      if (tag.tagName === systemTagName) return mapFolder(tag, scope.rootId, scope);
      queue.push(...(tag.children ?? []));
    }
    throw createClientError(notFoundCode);
  };

  const assertActionScope = (nodes: DriveMutableNode[]): DriveNodeScope => {
    if (nodes.length === 0) {
      throw createClientError(FRONTEND_CLIENT_ERROR.VALIDATION, { field: 'nodes' });
    }
    const [first] = nodes;
    if (nodes.some((node) => !sameScope(node.scope, first.scope))) {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_UNSUPPORTED_MOVE);
    }
    return first.scope;
  };

  const assertNoSystemFolder = (nodes: DriveMutableNode[]): void => {
    if (nodes.some((node) => node.type === 'folder' && node.systemType)) {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_SELECTION_CONTAINS_SYSTEM_FOLDER);
    }
  };

  const isDescendantOfFolder = (node: DriveMutableNode, folder: FolderNode): boolean => {
    if (node.id === folder.id) return false;
    if (node.type === 'folder') return node.ancestorTagIds.includes(folder.tagId);
    if (node.mountTagId === folder.tagId) return true;
    const groupId = getGroupId(folder.scope);
    return getTagAncestors(node.mountTagId, groupId).includes(folder.tagId);
  };

  const normalizeActionNodes = (nodes: DriveMutableNode[]): DriveMutableNode[] => {
    const byNodeId = new Map(nodes.map((node) => [node.id, node]));
    const uniqueNodes = [...byNodeId.values()];
    const folders = uniqueNodes.filter((node): node is FolderNode => node.type === 'folder');
    return uniqueNodes.filter(
      (node) => !folders.some((folder) => isDescendantOfFolder(node, folder))
    );
  };

  const groupResourcesById = (nodes: DriveResourceNode[]): Map<string, DriveResourceNode[]> => {
    const groups = new Map<string, DriveResourceNode[]>();
    nodes.forEach((node) => {
      const group = groups.get(node.resourceId) ?? [];
      group.push(node);
      groups.set(node.resourceId, group);
    });
    return groups;
  };

  const assertSingleMountPerResource = (nodes: DriveResourceNode[]): void => {
    const containsMultipleMounts = [...groupResourcesById(nodes).values()].some(
      (group) => new Set(group.map((node) => node.mountTagId)).size > 1
    );
    if (containsMultipleMounts) {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_MULTIPLE_MOUNTS_MOVE_UNSUPPORTED);
    }
  };

  const buildResourceUnmountRounds = (
    nodes: DriveResourceNode[]
  ): Array<Record<string, string>> => {
    const remainingByResourceId = new Map<string, DriveResourceNode[]>();
    groupResourcesById(nodes).forEach((group, resourceId) => {
      const primaryMount = group.find((node) => node.type === 'resource');
      if (primaryMount) {
        remainingByResourceId.set(resourceId, [primaryMount]);
        return;
      }
      const uniqueMounts = new Map(group.map((node) => [node.mountTagId, node]));
      remainingByResourceId.set(resourceId, [...uniqueMounts.values()]);
    });

    const rounds: Array<Record<string, string>> = [];
    while ([...remainingByResourceId.values()].some((group) => group.length > 0)) {
      const round: Record<string, string> = {};
      remainingByResourceId.forEach((group, resourceId) => {
        const node = group.shift();
        if (node) round[resourceId] = node.mountTagId;
      });
      rounds.push(round);
    }
    return rounds;
  };

  const getTargetTagIdOrThrow = (target: DriveContainerNode): string => {
    const tagId = target.tagId;
    if (!tagId) {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_TARGET_TAG_ID_MISSING);
    }
    if (target.type === 'folder' && target.systemType) {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_UNSUPPORTED_MOVE);
    }
    return tagId;
  };

  const assertValidMoveTarget = (folders: FolderNode[], target: DriveContainerNode): void => {
    if (target.type === 'folder' && target.systemType) {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_UNSUPPORTED_MOVE);
    }
    if (
      target.type === 'folder' &&
      folders.some(
        (folder) => folder.id === target.id || target.ancestorTagIds.includes(folder.tagId)
      )
    ) {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_UNSUPPORTED_MOVE);
    }
  };

  const resourceIds = (nodes: DriveResourceNode[]): string[] =>
    normalizeIds(nodes.map((node) => node.resourceId));

  const moveNodes: IDriveService['moveNodes'] = async ({ nodes, target }: MoveNodesParams) => {
    const normalizedNodes = normalizeActionNodes(nodes);
    assertNoSystemFolder(normalizedNodes);
    const scope = assertActionScope(normalizedNodes);
    if (!sameScope(scope, target.scope)) {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_UNSUPPORTED_MOVE);
    }
    const groupId = getGroupId(scope);
    const resources = normalizedNodes.filter(isResourceNode);
    const folders = normalizedNodes.filter((node): node is FolderNode => node.type === 'folder');
    assertValidMoveTarget(folders, target);
    if (groupId) assertSingleMountPerResource(resources);
    const movingResources = resources.filter((node) => node.mountTagId !== target.tagId);
    const movingFolders = folders.filter((folder) => folder.parentId !== target.id);
    const resourceTargetTagId =
      movingResources.length > 0 ? getTargetTagIdOrThrow(target) : undefined;
    const targetTagId = target.tagId;
    let affectedCount = 0;

    if (movingResources.length > 0 && resourceTargetTagId) {
      if (groupId) {
        affectedCount += await resourceService.moveResourcesInGroup({
          groupId,
          resourceSourceTagMap: Object.fromEntries(
            movingResources.map((node) => [node.resourceId, node.mountTagId])
          ),
          targetTagId: resourceTargetTagId,
        });
      } else {
        const ids = resourceIds(movingResources);
        affectedCount += await resourceService.setPersonalResourcesPathTag({
          resourceIds: ids,
          targetPathTagId: resourceTargetTagId,
        });
      }
    }
    if (movingFolders.length > 0) {
      const ids = normalizeIds(movingFolders.map((folder) => folder.tagId));
      await tagService.moveTags({ groupId, targetTagIds: ids, newParentId: targetTagId });
      affectedCount += ids.length;
    }
    notifyDriveRefresh();
    return {
      requestedCount: normalizedNodes.length,
      affectedCount,
    };
  };

  const moveNodesToTrash: IDriveService['moveNodesToTrash'] = async ({
    nodes,
  }: MoveNodesToTrashParams) => {
    const normalizedNodes = normalizeActionNodes(nodes);
    assertNoSystemFolder(normalizedNodes);
    const scope = assertActionScope(normalizedNodes);
    if (scope.type !== 'personal') {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_UNSUPPORTED_DELETE);
    }
    const resources = normalizedNodes.filter(isResourceNode);
    const folders = normalizedNodes.filter((node): node is FolderNode => node.type === 'folder');
    let affectedCount = 0;
    if (resources.length > 0) {
      const ids = resourceIds(resources);
      affectedCount += await resourceService.movePersonalResourcesToTrash({ resourceIds: ids });
    }
    if (folders.length > 0) {
      const trash = await getSystemFolder({ scope, type: 'trash' });
      const ids = normalizeIds(folders.map((folder) => folder.tagId));
      await tagService.moveTags({ targetTagIds: ids, newParentId: trash.tagId });
      affectedCount += ids.length;
    }
    notifyDriveRefresh();
    return { requestedCount: normalizedNodes.length, affectedCount };
  };

  const removeNodesFromGroup: IDriveService['removeNodesFromGroup'] = async ({
    nodes,
  }: RemoveNodesFromGroupParams) => {
    const normalizedNodes = normalizeActionNodes(nodes);
    assertNoSystemFolder(normalizedNodes);
    const scope = assertActionScope(normalizedNodes);
    if (scope.type !== 'group') {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_UNSUPPORTED_DELETE);
    }
    const groupId = scope.groupId;
    const resources = normalizedNodes.filter(isResourceNode);
    const folders = normalizedNodes.filter((node): node is FolderNode => node.type === 'folder');
    let affectedCount = 0;

    for (const resourceSourceTagMap of buildResourceUnmountRounds(resources)) {
      affectedCount += await resourceService.unmountResourcesToGroup({
        groupId,
        resourceSourceTagMap,
      });
    }
    if (folders.length > 0) {
      const ids = normalizeIds(folders.map((folder) => folder.tagId));
      await tagService.removeTags({ groupId, targetTagIds: ids });
      affectedCount += ids.length;
    }
    notifyDriveRefresh();
    return { requestedCount: normalizedNodes.length, affectedCount };
  };

  const deleteTrashedNodes: IDriveService['deleteTrashedNodes'] = async ({
    nodes,
  }: DeleteTrashedNodesParams) => {
    const normalizedNodes = normalizeActionNodes(nodes);
    assertNoSystemFolder(normalizedNodes);
    const scope = assertActionScope(normalizedNodes);
    if (scope.type !== 'personal') {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_UNSUPPORTED_DELETE);
    }
    const trash = await getSystemFolder({ scope, type: 'trash' });
    if (normalizedNodes.some((node) => !isDescendantOfFolder(node, trash))) {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_UNSUPPORTED_DELETE);
    }
    const resources = normalizedNodes.filter(isResourceNode);
    const folders = normalizedNodes.filter(
      (node): node is FolderNode => node.type === 'folder' && node.id !== trash.id
    );
    let affectedCount = 0;
    const ids = resourceIds(resources);
    if (ids.length > 0) {
      await resourceService.removeResources({ resourceIds: ids });
      affectedCount += ids.length;
    }
    if (folders.length > 0) {
      const tagIds = normalizeIds(folders.map((folder) => folder.tagId));
      await tagService.removeTags({ targetTagIds: tagIds });
      affectedCount += tagIds.length;
    }
    notifyDriveRefresh();
    return { requestedCount: normalizedNodes.length, affectedCount };
  };

  const setPersonalResourcesLocation: IDriveService['setPersonalResourcesLocation'] = async ({
    resourceIds: inputResourceIds,
    target,
  }: SetPersonalResourcesLocationParams) => {
    const ids = normalizeIds(inputResourceIds);
    if (target.scope.type !== 'personal') {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_UNSUPPORTED_MOVE);
    }
    const targetTagId = getTargetTagIdOrThrow(target);
    let affectedCount = 0;
    if (ids.length > 0) {
      affectedCount = await resourceService.setPersonalResourcesPathTag({
        resourceIds: ids,
        targetPathTagId: targetTagId,
      });
    }
    notifyDriveRefresh();
    return { requestedCount: ids.length, affectedCount };
  };

  const addResourcesToGroup: IDriveService['addResourcesToGroup'] = async ({
    resourceIds: inputResourceIds,
    target,
  }: AddResourcesToGroupParams) => {
    if (target.scope.type !== 'group') {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_UNSUPPORTED_MOVE);
    }
    const ids = normalizeIds(inputResourceIds);
    let affectedCount = 0;
    if (ids.length > 0) {
      affectedCount = await resourceService.mountResourcesToGroup({
        resourceIds: ids,
        groupId: target.scope.groupId,
        targetTagId: target.tagId,
      });
    }
    notifyDriveRefresh();
    return { requestedCount: ids.length, affectedCount };
  };

  const createFolder: IDriveService['createFolder'] = async ({
    parent,
    name,
  }: CreateFolderParams) => {
    const tagName = name.trim();
    if (!tagName) {
      throw createClientError(FRONTEND_CLIENT_ERROR.VALIDATION, { field: 'name' });
    }
    if (parent.type === 'folder' && parent.systemType) {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_UNSUPPORTED_MOVE);
    }
    const tagId = await tagService.addTag({
      groupId: getGroupId(parent.scope),
      parentId: parent.tagId ?? '0',
      tagName: parent.scope.type === 'personal' ? `/${tagName}` : tagName,
      isPath: parent.scope.type === 'personal',
    });
    await tagService.getRawTagTree(getGroupId(parent.scope), { refresh: true });
    const tag = tagService.getRawTagById(tagId, getGroupId(parent.scope));
    if (!tag) {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_NOT_FOUND, { nodeId: tagId });
    }
    notifyDriveRefresh();
    return mapFolder(tag, parent.id, parent.scope);
  };

  const renameNode: IDriveService['renameNode'] = async ({ node, newName }: RenameNodeParams) => {
    const name = newName.trim();
    if (!name) {
      throw createClientError(FRONTEND_CLIENT_ERROR.VALIDATION, { field: 'newName' });
    }
    const groupId = getGroupId(node.scope);
    if (node.type === 'folder') {
      if (node.systemType) {
        throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_UNSUPPORTED_RENAME);
      }
      await tagService.updateTag({
        groupId,
        targetTagId: node.tagId,
        tagName: node.scope.type === 'personal' ? `/${name}` : name,
      });
      notifyDriveRefresh();
      return;
    }
    if (node.type === 'link') {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_LINK_UNSUPPORTED_RENAME);
    }
    if (node.type === 'resource') {
      await resourceService.renameResource({ resourceId: node.resourceId, newName: name });
      notifyDriveRefresh();
      return;
    }
    throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_UNSUPPORTED_RENAME);
  };

  return {
    getRoot,
    getSystemFolder,
    loadNodeChildren,
    getNodePath,
    getMountPath,
    resolveResourceNode,
    createFolder,
    renameNode,
    setPersonalResourcesLocation,
    addResourcesToGroup,
    moveNodes,
    moveNodesToTrash,
    removeNodesFromGroup,
    deleteTrashedNodes,
  };
};

export const createDriveServices = createDriveService;
