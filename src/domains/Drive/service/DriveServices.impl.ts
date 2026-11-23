import type {
  DriveContainerNode,
  DriveNodeScope,
  DriveSystemFolderType,
  FolderNode,
} from '@/domains/Drive';
import type { IResourceService, ResourceItem } from '@/domains/Resource';
import { RESOURCE_SORT_BY, RESOURCE_SORT_DIR } from '@/domains/Resource';
import { type ITagService, normalizeTagGroupId, type TagTreeNode } from '@/domains/Tag';
import {
  createClientError,
  FRONTEND_CLIENT_ERROR,
  type FrontendClientErrorCode,
} from '@/utils/error';

import {
  buildDriveRootNode,
  decodeNodeId,
  decodeRootNodeScope,
  DRIVE_ROOT_SYSTEM_FOLDER_TYPES,
  DRIVE_SYSTEM_FOLDER_DEFINITIONS,
  getDriveSystemFolderDefinition,
  mapResourceItemToChildNode,
  mapTagToFolderNode,
  orderDriveFolderNodes,
  resolveDriveSystemFolderType,
} from '../model/driveNode';
import type {
  CreateDriveServiceOptions,
  DriveNodeChildrenPage,
  GetDriveRootParams,
  GetDriveSystemFolderParams,
  GetMountPathParams,
  GetNodePathParams,
  IDriveService,
  LoadDriveNodeChildrenParams,
  ResolveResourceNodeParams,
} from './index.type';

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;
const HIDDEN_TAG_PREFIX = '.';

const DRIVE_SYSTEM_FOLDER_NOT_FOUND_CODES = {
  trash: FRONTEND_CLIENT_ERROR.DRIVE_TRASH_TAG_NOT_FOUND,
  shared: FRONTEND_CLIENT_ERROR.DRIVE_SHARED_TAG_NOT_FOUND,
  note: FRONTEND_CLIENT_ERROR.DRIVE_NOTE_TAG_NOT_FOUND,
  page: FRONTEND_CLIENT_ERROR.DRIVE_PAGE_TAG_NOT_FOUND,
} as const satisfies Record<DriveSystemFolderType, FrontendClientErrorCode>;

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
  const systemType = resolveDriveSystemFolderType(name);
  if (systemType) return DRIVE_SYSTEM_FOLDER_DEFINITIONS[systemType].visible;
  return !name.startsWith(HIDDEN_TAG_PREFIX);
};

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

export const createDriveServices = (
  deps: DriveServicesDeps,
  opts?: CreateDriveServiceOptions
): IDriveService => {
  const { tagService, resourceService } = deps;
  const defaultPageSize = normalizePageSize(opts?.pageSize, DEFAULT_PAGE_SIZE);

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
      const systemTags = DRIVE_ROOT_SYSTEM_FOLDER_TYPES.flatMap((type) => {
        const { tagName } = getDriveSystemFolderDefinition(type);
        const tag = roots.find((candidate) => candidate.tagName === tagName);
        return tag ? [tag] : [];
      });
      return [...systemTags, ...(personalRoot?.children ?? [])].filter(isVisibleFolderTag);
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
    const notFoundCode = DRIVE_SYSTEM_FOLDER_NOT_FOUND_CODES[type];
    if (scope.type !== 'personal') throw createClientError(notFoundCode);
    const { tagName: systemTagName } = getDriveSystemFolderDefinition(type);
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

  return {
    getRoot,
    getSystemFolder,
    loadNodeChildren,
    getNodePath,
    getMountPath,
    resolveResourceNode,
  };
};
