import type { ResourceItem } from '@/domains/Resource';

import type {
  DriveContainerNode,
  DriveMutableNode,
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

  createFolder(params: CreateFolderParams): Promise<FolderNode>;
  renameNode(params: RenameNodeParams): Promise<void>;

  setPersonalResourcesLocation(
    params: SetPersonalResourcesLocationParams
  ): Promise<DriveBatchOperationResult>;
  addResourcesToGroup(params: AddResourcesToGroupParams): Promise<DriveBatchOperationResult>;
  moveNodes(params: MoveNodesParams): Promise<DriveBatchOperationResult>;
  moveNodesToTrash(params: MoveNodesToTrashParams): Promise<DriveBatchOperationResult>;
  removeNodesFromGroup(params: RemoveNodesFromGroupParams): Promise<DriveBatchOperationResult>;
  deleteTrashedNodes(params: DeleteTrashedNodesParams): Promise<DriveBatchOperationResult>;
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

export interface CreateFolderParams {
  parent: DriveContainerNode;
  name: string;
}

export interface RenameNodeParams {
  node: DriveMutableNode;
  newName: string;
}

export interface SetPersonalResourcesLocationParams {
  resourceIds: string[];
  target: DriveContainerNode;
}

export interface AddResourcesToGroupParams {
  resourceIds: string[];
  target: FolderNode;
}

export interface MoveNodesParams {
  nodes: DriveMutableNode[];
  target: DriveContainerNode;
}

export interface MoveNodesToTrashParams {
  nodes: DriveMutableNode[];
}

export interface RemoveNodesFromGroupParams {
  nodes: DriveMutableNode[];
}

export interface DeleteTrashedNodesParams {
  nodes: DriveMutableNode[];
}

export interface DriveBatchOperationResult {
  requestedCount: number;
  affectedCount: number;
}

export interface CreateDriveServiceOptions {
  pageSize?: number;
}

export type { DriveContainerNode, DriveMutableNode, LinkNode, ResourceNode, RootNode };
