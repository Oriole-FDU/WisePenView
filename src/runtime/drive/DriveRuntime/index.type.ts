import type {
  DriveContainerNode,
  DriveNodeScope,
  DriveResourceLocation,
  DriveResourceNode,
  DriveSystemFolderType,
  FolderNode,
  RootNode,
} from '@/domains/Drive';
import type { ResourceItem } from '@/domains/Resource';

import type { DriveActions } from '../actions/driveActions';
import type { DriveTreeRuntime } from '../DriveTreeRuntime/index.type';
import type { DriveTreeRequest } from '../model/DriveTreeState';

export interface GetDriveRootParams {
  rootId?: string;
  groupId?: string;
}

export interface GetDriveSystemFolderParams {
  scope: DriveNodeScope;
  type: DriveSystemFolderType;
}

export interface GetDriveNodePathParams {
  nodeId: string;
  scope: DriveNodeScope;
}

export interface GetDriveMountPathParams {
  location: DriveResourceLocation;
}

export interface ResolveDriveResourceNodeParams {
  resource: ResourceItem;
  location: DriveResourceLocation;
}

export interface DriveRuntime extends DriveActions {
  acquireTree(request: DriveTreeRequest): DriveTreeRuntime;
  releaseTree(runtime: DriveTreeRuntime): void;

  getRoot(params?: GetDriveRootParams): Promise<RootNode>;
  getSystemFolder(params: GetDriveSystemFolderParams): Promise<FolderNode>;
  getNodePath(params: GetDriveNodePathParams): Promise<Array<RootNode | FolderNode>>;
  getMountPath(params: GetDriveMountPathParams): Promise<Array<RootNode | FolderNode>>;
  resolveResourceNode(params: ResolveDriveResourceNodeParams): Promise<DriveResourceNode>;
  loadChildrenOnce(parent: DriveContainerNode): Promise<void>;

  /** 操作完成后通知对应作用域：清数据缓存，并让相关已挂载树重新对齐。 */
  notifyChanged(scope?: DriveNodeScope): void;
  reset(): void;
}
