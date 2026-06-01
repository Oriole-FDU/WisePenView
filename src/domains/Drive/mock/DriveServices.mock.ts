import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';
import type { DriveNode, FolderNode, TrashNode } from '../entity/drive';
import type {
  CreateDriveServiceOptions,
  CreateNodeParams,
  GetDriveTreeParams,
  GetPathByIdParams,
  IDriveService,
  LoadMoreParams,
  LoadNodeChildrenParams,
  MoveNodeParams,
  RemoveNodeParams,
  RenameNodeParams,
} from '../service/index.type';
import mockdata from './mockdata.json';

const DEFAULT_PAGE_SIZE = 50;
const NETWORK_DELAY_MS = 150;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type MockJson = {
  rootId: string;
  nodes: Record<string, DriveNode>;
};

const md = mockdata as unknown as MockJson;

function createDriveServiceMock(opts?: CreateDriveServiceOptions): IDriveService {
  const pageSize = opts?.pageSize ?? DEFAULT_PAGE_SIZE;

  /** 内存 nodeMap：从 JSON 反序列化的副本（避免污染原始 import） */
  const nodes = new Map<string, DriveNode>(
    Object.entries(md.nodes).map(([id, node]) => [id, { ...(node as DriveNode) }])
  );

  /** 每个 folder 已加载的页数；首次访问初始化为 1 */
  const loadedPages = new Map<string, number>();

  function getFolder(id: string): FolderNode | undefined {
    const node = nodes.get(id);
    return node && node.type === 'folder' ? node : undefined;
  }

  function getContainer(id: string): FolderNode | TrashNode | undefined {
    const node = nodes.get(id);
    return node && (node.type === 'folder' || node.type === 'trash') ? node : undefined;
  }

  /** 按当前已加载页数拼出 children；未拉满时末尾追加 LoadMoreNode */
  function buildChildren(parentId: string): DriveNode[] {
    const parent = getContainer(parentId);
    if (!parent) return [];
    const allIds = parent.childrenIds;
    const page = loadedPages.get(parentId) ?? 1;
    const loaded = Math.min(allIds.length, page * pageSize);

    const children: DriveNode[] = allIds
      .slice(0, loaded)
      .map((id) => nodes.get(id))
      .filter((n): n is DriveNode => n != null);

    if (loaded < allIds.length) {
      children.push({
        id: `loadMore-${parentId}`,
        type: 'loadMore',
        parentId,
        loaded,
        total: allIds.length,
      });
    }
    return children;
  }

  /** 从父节点 childrenIds 中移除指定 id */
  function detachFromParent(nodeId: string): void {
    const node = nodes.get(nodeId);
    if (!node || !node.parentId) return;
    const parent = getFolder(node.parentId);
    if (!parent) return;
    parent.childrenIds = parent.childrenIds.filter((id) => id !== nodeId);
  }

  return {
    async getDriveTree(params: GetDriveTreeParams) {
      await delay(NETWORK_DELAY_MS);
      const node = nodes.get(params.rootId);
      if (!node) {
        throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_NOT_FOUND, {
          nodeId: params.rootId,
        });
      }
      return node;
    },

    async loadNodeChildren(params: LoadNodeChildrenParams) {
      await delay(NETWORK_DELAY_MS);
      if (!loadedPages.has(params.nodeId)) loadedPages.set(params.nodeId, 1);
      return buildChildren(params.nodeId);
    },

    async loadMore(params: LoadMoreParams) {
      await delay(NETWORK_DELAY_MS);
      const current = loadedPages.get(params.parentNodeId) ?? 1;
      loadedPages.set(params.parentNodeId, current + 1);
      return buildChildren(params.parentNodeId);
    },

    async getPathById(params: GetPathByIdParams) {
      await delay(NETWORK_DELAY_MS);
      const path: DriveNode[] = [];
      let cur: DriveNode | undefined = nodes.get(params.nodeId);
      if (!cur) {
        throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_NOT_FOUND, {
          nodeId: params.nodeId,
        });
      }
      while (cur) {
        path.unshift(cur);
        cur = cur.parentId ? nodes.get(cur.parentId) : undefined;
      }
      return path;
    },

    async moveNode(params: MoveNodeParams) {
      await delay(NETWORK_DELAY_MS);
      const node = nodes.get(params.nodeId);
      const newParent = getFolder(params.newParentId);
      if (!node || !newParent) {
        throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_NOT_FOUND, {
          nodeId: node ? params.newParentId : params.nodeId,
        });
      }
      detachFromParent(params.nodeId);
      node.parentId = params.newParentId;
      newParent.childrenIds.push(params.nodeId);
    },

    async removeNode(params: RemoveNodeParams) {
      await delay(NETWORK_DELAY_MS);
      detachFromParent(params.nodeId);
      nodes.delete(params.nodeId);
    },

    async renameNode(params: RenameNodeParams) {
      await delay(NETWORK_DELAY_MS);
      const node = nodes.get(params.nodeId);
      if (!node) {
        throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_NOT_FOUND, {
          nodeId: params.nodeId,
        });
      }
      if (node.type === 'folder') {
        node.name = params.newName;
      } else if (node.type === 'resource' || node.type === 'link') {
        node.title = params.newName;
      }
    },

    async createNode(params: CreateNodeParams) {
      await delay(NETWORK_DELAY_MS);
      const parent = getFolder(params.parentId);
      if (!parent) {
        throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_NOT_FOUND, {
          nodeId: params.parentId,
        });
      }
      const newId = `${params.type}-mock-${Date.now()}`;
      let node: DriveNode;
      if (params.type === 'folder') {
        node = {
          id: newId,
          type: 'folder',
          parentId: params.parentId,
          tagId: `tag-${newId}`,
          name: params.name,
          expanded: false,
          childrenIds: [],
        };
      } else if (params.type === 'resource') {
        node = {
          id: newId,
          type: 'resource',
          parentId: params.parentId,
          resourceId: newId,
          title: params.name,
          resourceType: 'document',
        };
      } else if (params.type === 'link') {
        node = {
          id: newId,
          type: 'link',
          parentId: params.parentId,
          resourceId: newId,
          title: params.name,
          resourceType: 'document',
        };
      } else if (params.type === 'trash') {
        node = {
          id: newId,
          type: 'trash',
          parentId: params.parentId,
          tagId: `tag-${newId}`,
          childrenIds: [],
        };
      } else {
        throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_UNSUPPORTED_CREATE_TYPE, {
          type: params.type,
        });
      }
      nodes.set(newId, node);
      parent.childrenIds.push(newId);
    },
  };
}

/** mock 模式下注入的单例 service */
export const DriveServicesMock: IDriveService = createDriveServiceMock();
