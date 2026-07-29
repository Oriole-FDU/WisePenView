import type { DriveNode, FolderNode, LinkNode, ResourceNode, RootNode } from '../entity/drive';

export interface IDriveService {
  /**
   * 获取某个 Drive scope 的根节点。
   * - 个人盘 root 抽象为 ~/，背后绑定唯一顶层 root tag，可挂载资源。
   * - 小组 root 抽象为 group 本身，是虚拟容器，不可直接挂载资源。
   */
  getRootNode(params?: GetRootNodeParams): Promise<RootNode>;
  /** 获取当前 scope 的回收站文件夹节点 ID；未初始化或不存在时返回 undefined。 */
  getTrashFolderNodeId(groupId?: string): Promise<string | undefined>;
  /** nodeId 可独立携带 scope 信息；并列展示多个 root 时不强依赖全局 groupId。 */
  listNodeChildren(params: ListNodeChildrenParams): Promise<DriveNode[]>;
  getNodePath(params: GetNodePathParams): Promise<Array<RootNode | FolderNode>>;
  /** 按当前父目录定位资源挂载，供资源详情页识别主文件与 link。 */
  getResourceNode(params: GetResourceNodeParams): Promise<ResourceNode | LinkNode | undefined>;
  moveToFolder(params: MoveToFolderParams): Promise<void>;
  /** 为主文件在同一 scope 的目标目录创建 link。 */
  createLink(params: CreateLinkParams): Promise<void>;
  /** 批量移动并返回实际改变父目录的节点数。 */
  moveNodesToFolder(params: MoveNodesToFolderParams): Promise<number>;
  removeNode(params: RemoveNodeParams): Promise<void>;
  renameNode(params: RenameNodeParams): Promise<void>;
  createFolder(params: CreateFolderParams): Promise<string>;
  /** 获取后端初始化的个人云盘系统共享目录。 */
  getSharedFolderTagId(): Promise<string | undefined>;
}

export interface GetRootNodeParams {
  rootId?: string;
  groupId?: string;
}

export interface ListNodeChildrenParams {
  nodeId: string;
  groupId?: string;
  /** 仅限制返回的资源/link 数量，文件夹始终完整返回。 */
  resourceLimit?: number;
}

export interface GetNodePathParams {
  nodeId: string;
  groupId?: string;
}

export interface GetResourceNodeParams {
  resourceId: string;
  parentNodeId: string;
  nodeId?: string;
  groupId?: string;
}

export interface CreateLinkParams {
  nodeId: string;
  targetFolderNodeId: string;
  groupId?: string;
}

export interface MoveToFolderParams {
  nodeId: string;
  targetFolderNodeId: string;
  groupId?: string;
}

export interface MoveNodesToFolderParams {
  nodeIds: string[];
  targetFolderNodeId: string;
  groupId?: string;
}

export interface RemoveNodeParams {
  nodeId: string;
  groupId?: string;
}

export interface RenameNodeParams {
  nodeId: string;
  newName: string;
  groupId?: string;
}

export interface CreateFolderParams {
  parentId: string;
  name: string;
  groupId?: string;
}

/** Service 工厂选项：默认 pageSize = 50 */
export interface CreateDriveServiceOptions {
  pageSize?: number;
}
