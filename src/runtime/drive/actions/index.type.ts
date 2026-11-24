import type {
  AddResourcesToGroupParams,
  CreateFolderParams,
  DeleteTrashedNodesParams,
  DriveBatchOperationResult,
  FolderNode,
  MoveNodesParams,
  MoveNodesToTrashParams,
  RemoveNodesFromGroupParams,
  RenameNodeParams,
  SetPersonalResourcesLocationParams,
} from '@/domains/Drive';

import type { DriveResourceCreationRequest } from '../model/DriveResourceCreation';

export interface DriveActions {
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
  createResource(params: DriveResourceCreationRequest): Promise<string>;
}
