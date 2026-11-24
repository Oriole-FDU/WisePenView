import type { ResourceItem } from '@/domains/Resource';

import type {
  DriveContainerNode,
  DriveNodeScope,
  DriveResourceLocation,
  DriveResourceNode,
  DriveSystemFolderType,
  FolderNode,
  LinkNode,
  ResourceNode,
  RootNode,
} from '../entity/drive';

export interface IDriveService {
  getRoot(params?: GetDriveRootParams): Promise<RootNode>;
  getSystemFolder(params: GetDriveSystemFolderParams): Promise<FolderNode>;
  loadNodeChildren(params: LoadDriveNodeChildrenParams): Promise<DriveNodeChildrenPage>;
  getNodePath(params: GetNodePathParams): Promise<Array<RootNode | FolderNode>>;
  getMountPath(params: GetMountPathParams): Promise<Array<RootNode | FolderNode>>;
  resolveResourceNode(params: ResolveResourceNodeParams): Promise<DriveResourceNode>;
}

export interface GetDriveRootParams {
  rootId?: string;
  groupId?: string;
}

export interface GetDriveSystemFolderParams {
  scope: DriveNodeScope;
  type: DriveSystemFolderType;
}

export interface LoadDriveNodeChildrenParams {
  parent: DriveContainerNode;
  cursor?: string;
  pageSize?: number;
  kinds?: Array<'folder' | 'resource' | 'link'>;
  resourceType?: string;
  refresh?: boolean;
}

export interface DriveNodeChildrenPage {
  folderNodes: FolderNode[];
  resourceNodes: DriveResourceNode[];
  folderTotal: number;
  resourceTotal: number;
  total: number;
  nextCursor?: string;
}

export interface GetNodePathParams {
  nodeId: string;
  scope: DriveNodeScope;
}

export interface GetMountPathParams {
  location: DriveResourceLocation;
}

export interface ResolveResourceNodeParams {
  resource: ResourceItem;
  location: DriveResourceLocation;
}

export interface CreateDriveServiceOptions {
  pageSize?: number;
}

export type { DriveContainerNode, LinkNode, ResourceNode, RootNode };
