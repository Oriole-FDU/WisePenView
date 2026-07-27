import { resolveResourceIconType } from '@/domains/Resource';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';
import type { DriveNode, FolderNode, RootNode } from '../entity/drive';
import {
  buildDriveNodeScope,
  decodeRootNodeScope,
  orderDriveFolderNodes,
} from '../mapper/DriveServices.map';
import type {
  CreateDriveServiceOptions,
  CreateFolderParams,
  GetNodePathParams,
  GetRootNodeParams,
  IDriveService,
  ListNodeChildrenParams,
  MoveNodesToFolderParams,
  MoveToFolderParams,
  RemoveNodeParams,
  RenameNodeParams,
} from '../service/index.type';
import mockdata from './mockdata.json';

const DEFAULT_PAGE_SIZE = 50;
const NETWORK_DELAY_MS = 150;
const ROOT_ID = 'drive-root';
const GROUP_ROOT_PREFIX = 'drive-root:group:';
const SHARED_FOLDER_NODE_ID = 'folder-shared';
const SHARED_FOLDER_TAG_ID = 'tag-shared';
const TRASH_FOLDER_NODE_ID = 'trash-root';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type LegacyNode = {
  id?: string;
  type?: string;
  parentId?: string | null;
  tagId?: string;
  name?: string;
  childrenIds?: string[];
  expanded?: boolean;
  resourceId?: string;
  title?: string;
  resourceType?: string;
  primaryTagId?: string;
};

type MockJson = {
  rootId: string;
  nodes: Record<string, LegacyNode>;
};

interface MockMovePlan {
  node: DriveNode;
  newParent: RootNode | FolderNode;
  targetTagId?: string;
}

const md = mockdata as unknown as MockJson;

const isGroupRootId = (id: string): boolean => id.startsWith(GROUP_ROOT_PREFIX);

const getGroupIdFromRootId = (id: string): string | undefined =>
  isGroupRootId(id) ? id.slice(GROUP_ROOT_PREFIX.length) : undefined;

const toRootNode = (node: LegacyNode): RootNode => ({
  id: ROOT_ID,
  type: 'root',
  parentId: null,
  name: node.name ?? '个人云盘',
  scope: buildDriveNodeScope(),
  tagId: node.tagId,
  isVirtual: false,
  canMountResources: Boolean(node.tagId),
  childrenIds: node.childrenIds ?? [],
});

const normalizeNode = (node: LegacyNode): DriveNode | null => {
  if (!node.id) return null;
  if (node.id === ROOT_ID || node.type === 'root') return toRootNode(node);
  if (node.type === 'folder' && node.tagId) {
    return {
      id: node.id,
      type: 'folder',
      parentId: node.parentId ?? null,
      scope: buildDriveNodeScope(),
      tagId: node.tagId,
      name: node.name ?? '未命名文件夹',
      systemType: node.id === SHARED_FOLDER_NODE_ID ? 'shared' : undefined,
      childrenIds: node.childrenIds ?? [],
    };
  }
  if (node.type === 'resource' && node.resourceId && node.parentId) {
    return {
      id: node.id,
      type: 'resource',
      parentId: node.parentId,
      scope: buildDriveNodeScope(),
      resourceId: node.resourceId,
      title: node.title ?? '未命名文件',
      resourceType: node.resourceType,
      resourceIconType: resolveResourceIconType(node.resourceType),
      folderTagId: node.tagId ?? node.parentId ?? '',
    };
  }
  if (node.type === 'link' && node.resourceId && node.parentId) {
    return {
      id: node.id,
      type: 'link',
      parentId: node.parentId,
      scope: buildDriveNodeScope(),
      resourceId: node.resourceId,
      title: node.title ?? '未命名文件',
      resourceType: node.resourceType,
      resourceIconType: resolveResourceIconType(node.resourceType),
      folderTagId: node.tagId ?? node.parentId ?? '',
      primaryTagId: node.primaryTagId,
    };
  }
  return null;
};

function createDriveServiceMock(opts?: CreateDriveServiceOptions): IDriveService {
  const pageSize = opts?.pageSize ?? DEFAULT_PAGE_SIZE;
  void pageSize;

  /** 内存 nodeMap：从 JSON 反序列化的副本（避免污染原始 import） */
  const nodes = new Map<string, DriveNode>();
  for (const [id, node] of Object.entries(md.nodes)) {
    const normalized = normalizeNode({ ...node, id: node.id ?? id });
    if (normalized) nodes.set(id, normalized);
  }
  if (!nodes.has(ROOT_ID)) {
    nodes.set(ROOT_ID, {
      id: ROOT_ID,
      type: 'root',
      parentId: null,
      name: '个人云盘',
      scope: buildDriveNodeScope(),
      isVirtual: false,
      canMountResources: false,
      childrenIds: [],
    });
  }
  for (const node of nodes.values()) {
    if (node.type === 'root' || node.type === 'folder') {
      node.childrenIds = node.childrenIds.filter((id) => nodes.has(id));
    }
  }

  function ensureGroupRoot(rootId: string): RootNode | undefined {
    const groupId = getGroupIdFromRootId(rootId);
    if (!groupId) return undefined;
    const existing = nodes.get(rootId);
    if (existing?.type === 'root') return existing;
    const scope = buildDriveNodeScope(groupId);
    const root: RootNode = {
      id: scope.rootId,
      type: 'root',
      parentId: null,
      name: '小组云盘',
      scope,
      isVirtual: true,
      canMountResources: false,
      childrenIds: [],
    };
    nodes.set(rootId, root);
    return root;
  }

  function getContainer(id: string): RootNode | FolderNode | undefined {
    const node = nodes.get(id) ?? ensureGroupRoot(id);
    return node && (node.type === 'root' || node.type === 'folder') ? node : undefined;
  }

  function isDescendantOf(nodeId: string, ancestorId: string): boolean {
    let cur = nodes.get(nodeId);
    while (cur?.parentId) {
      if (cur.parentId === ancestorId) return true;
      cur = nodes.get(cur.parentId);
    }
    return false;
  }

  function detachFromParent(nodeId: string): void {
    const node = nodes.get(nodeId);
    if (!node || !node.parentId) return;
    const parent = getContainer(node.parentId);
    if (!parent) return;
    parent.childrenIds = parent.childrenIds.filter((id) => id !== nodeId);
  }

  function buildPath(nodeId: string): Array<RootNode | FolderNode> {
    const path: Array<RootNode | FolderNode> = [];
    let cur: DriveNode | undefined = nodes.get(nodeId);
    if (!cur) {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_NOT_FOUND, { nodeId });
    }
    if (cur.type !== 'root' && cur.type !== 'folder') {
      cur = cur.parentId ? nodes.get(cur.parentId) : undefined;
    }
    while (cur) {
      if (cur.type === 'root' || cur.type === 'folder') path.unshift(cur);
      cur = cur.parentId ? nodes.get(cur.parentId) : undefined;
    }
    return path;
  }

  const getRootNode = async (_params?: GetRootNodeParams): Promise<RootNode> => {
    await delay(NETWORK_DELAY_MS);
    const scope = decodeRootNodeScope(_params?.rootId, _params?.groupId);
    if (scope.type === 'group') {
      const root = ensureGroupRoot(scope.rootId);
      if (root) return root;
    }
    const root = nodes.get(ROOT_ID);
    if (!root || root.type !== 'root') {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_NOT_FOUND, { nodeId: ROOT_ID });
    }
    return root;
  };

  const listNodeChildren = async (params: ListNodeChildrenParams): Promise<DriveNode[]> => {
    await delay(NETWORK_DELAY_MS);
    const parent = getContainer(params.nodeId);
    if (!parent) return [];
    const children = parent.childrenIds
      .map((id) => nodes.get(id))
      .filter((node): node is DriveNode => node != null && node.type !== 'loading');
    const folderNodes = children.filter((node): node is FolderNode => node.type === 'folder');
    const otherNodes = children.filter((node) => node.type !== 'folder');
    const normalizedResourceLimit =
      params.resourceLimit == null ? undefined : Math.max(0, Math.floor(params.resourceLimit));
    return [
      ...orderDriveFolderNodes(folderNodes),
      ...(normalizedResourceLimit == null
        ? otherNodes
        : otherNodes.slice(0, normalizedResourceLimit)),
    ];
  };

  const getNodePath: IDriveService['getNodePath'] = async (params: GetNodePathParams) => {
    await delay(NETWORK_DELAY_MS);
    return buildPath(params.nodeId);
  };

  const getResourceNode: IDriveService['getResourceNode'] = async (params) => {
    await delay(NETWORK_DELAY_MS);
    const parent = getContainer(params.parentNodeId);
    return parent?.childrenIds
      .map((id) => nodes.get(id))
      .find(
        (node): node is Extract<DriveNode, { type: 'resource' | 'link' }> =>
          (node?.type === 'resource' || node?.type === 'link') &&
          node.resourceId === params.resourceId &&
          (!params.nodeId || node.id === params.nodeId)
      );
  };

  const createLink: IDriveService['createLink'] = async (params) => {
    await delay(NETWORK_DELAY_MS);
    const source = nodes.get(params.nodeId);
    const target = getContainer(params.targetFolderNodeId);
    if (
      source?.scope.type !== 'group' ||
      source.type !== 'resource' ||
      !target ||
      source.scope.rootId !== target.scope.rootId
    ) {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_UNSUPPORTED_MOVE);
    }
    const targetTagId = target.tagId;
    if (!targetTagId) {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_UNSUPPORTED_MOVE);
    }
    const linkId = `link:${source.resourceId}:${targetTagId}`;
    if (nodes.has(linkId)) return;
    nodes.set(linkId, {
      ...source,
      id: linkId,
      type: 'link',
      parentId: target.id,
      folderTagId: targetTagId,
      primaryTagId: source.folderTagId,
    });
    target.childrenIds.push(linkId);
  };

  function createMovePlan(params: MoveToFolderParams): MockMovePlan {
    const node = nodes.get(params.nodeId);
    const newParent = getContainer(params.targetFolderNodeId);
    if (!node || !newParent) {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_NOT_FOUND, {
        nodeId: node ? params.targetFolderNodeId : params.nodeId,
      });
    }
    if (node.type !== 'folder' && node.type !== 'resource' && node.type !== 'link') {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_UNSUPPORTED_MOVE);
    }
    if (node.id === newParent.id) {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_UNSUPPORTED_MOVE);
    }
    if (node.scope.rootId !== newParent.scope.rootId) {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_UNSUPPORTED_MOVE);
    }
    if (node.type === 'folder' && isDescendantOf(params.targetFolderNodeId, node.id)) {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_UNSUPPORTED_MOVE);
    }
    const targetTagId = newParent.tagId;
    if ((node.type === 'resource' || node.type === 'link') && !targetTagId) {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_UNSUPPORTED_MOVE);
    }
    if (node.type === 'link' && targetTagId && node.primaryTagId === targetTagId) {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_LINK_MOVE_TO_PRIMARY_TAG);
    }

    return { node, newParent, targetTagId };
  }

  function executeMovePlan(plan: MockMovePlan): void {
    if (plan.node.type === 'link' && plan.targetTagId) {
      plan.node.folderTagId = plan.targetTagId;
    }
    if (plan.node.type === 'resource' && plan.targetTagId) {
      plan.node.folderTagId = plan.targetTagId;
    }
    detachFromParent(plan.node.id);
    plan.node.parentId = plan.newParent.id;
    plan.newParent.childrenIds.push(plan.node.id);
  }

  const moveToFolder = async (params: MoveToFolderParams): Promise<void> => {
    await delay(NETWORK_DELAY_MS);
    executeMovePlan(createMovePlan(params));
  };

  const moveNodesToFolder = async (params: MoveNodesToFolderParams): Promise<number> => {
    await delay(NETWORK_DELAY_MS);
    const sources = [...new Set(params.nodeIds)].map((nodeId) => {
      const node = nodes.get(nodeId);
      if (!node) {
        throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_NOT_FOUND, { nodeId });
      }
      return node;
    });
    if (sources.some((source) => source.type === 'folder' && source.systemType)) {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_SELECTION_CONTAINS_SYSTEM_FOLDER);
    }
    if (sources.some((source) => source.id === params.targetFolderNodeId)) {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_UNSUPPORTED_MOVE);
    }

    const sourceIdSet = new Set(sources.map((source) => source.id));
    const sourceNodeIds = sources
      .filter((source) => {
        let parentId = source.parentId;
        while (parentId) {
          if (sourceIdSet.has(parentId)) {
            return false;
          }
          parentId = nodes.get(parentId)?.parentId ?? null;
        }
        return true;
      })
      .filter((source) => source.parentId !== params.targetFolderNodeId)
      .map((source) => source.id);
    const plans = sourceNodeIds.map((nodeId) =>
      createMovePlan({
        nodeId,
        targetFolderNodeId: params.targetFolderNodeId,
        groupId: params.groupId,
      })
    );
    for (const plan of plans) {
      executeMovePlan(plan);
    }
    return plans.length;
  };

  const removeNode = async (params: RemoveNodeParams): Promise<void> => {
    await delay(NETWORK_DELAY_MS);
    detachFromParent(params.nodeId);
    nodes.delete(params.nodeId);
  };

  const renameNode = async (params: RenameNodeParams): Promise<void> => {
    await delay(NETWORK_DELAY_MS);
    const node = nodes.get(params.nodeId);
    if (!node) {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_NOT_FOUND, {
        nodeId: params.nodeId,
      });
    }
    if (node.type === 'folder' || node.type === 'root') {
      node.name = params.newName;
    } else if (node.type === 'resource' || node.type === 'link') {
      node.title = params.newName;
    }
  };

  const createFolder = async (params: CreateFolderParams): Promise<string> => {
    await delay(NETWORK_DELAY_MS);
    const parent = getContainer(params.parentId);
    if (!parent) {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_NOT_FOUND, {
        nodeId: params.parentId,
      });
    }
    const newId = `folder-mock-${Date.now()}`;
    const node: FolderNode = {
      id: newId,
      type: 'folder',
      parentId: params.parentId,
      scope: parent.scope,
      tagId: `tag-${newId}`,
      name: params.name,
      childrenIds: [],
    };
    nodes.set(newId, node);
    parent.childrenIds.push(newId);
    return node.tagId;
  };

  const ensureSharedFolder = async (): Promise<string> => {
    await delay(NETWORK_DELAY_MS);
    const existing = nodes.get(SHARED_FOLDER_NODE_ID);
    if (existing?.type === 'folder') {
      return existing.tagId;
    }
    const root = getContainer(ROOT_ID);
    if (!root) {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_NOT_FOUND, { nodeId: ROOT_ID });
    }
    const node: FolderNode = {
      id: SHARED_FOLDER_NODE_ID,
      type: 'folder',
      parentId: ROOT_ID,
      scope: buildDriveNodeScope(),
      tagId: SHARED_FOLDER_TAG_ID,
      name: '',
      systemType: 'shared',
      childrenIds: [],
    };
    nodes.set(SHARED_FOLDER_NODE_ID, node);
    if (!root.childrenIds.includes(SHARED_FOLDER_NODE_ID)) {
      root.childrenIds.push(SHARED_FOLDER_NODE_ID);
    }
    return node.tagId;
  };

  const getTrashFolderNodeId = async (): Promise<string | undefined> => {
    await delay(NETWORK_DELAY_MS);
    return md.nodes[TRASH_FOLDER_NODE_ID] ? TRASH_FOLDER_NODE_ID : undefined;
  };

  return {
    getRootNode,
    getTrashFolderNodeId,
    listNodeChildren,
    getNodePath,
    getResourceNode,
    moveToFolder,
    createLink,
    moveNodesToFolder,
    removeNode,
    renameNode,
    createFolder,
    ensureSharedFolder,
  };
}

/** mock 模式下注入的单例 service */
export const DriveServicesMock: IDriveService = createDriveServiceMock();
