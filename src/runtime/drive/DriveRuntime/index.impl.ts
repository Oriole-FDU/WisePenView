import { getDriveService } from '@/domains';
import type {
  AddResourcesToGroupParams,
  CreateFolderParams,
  DeleteTrashedNodesParams,
  DriveBatchOperationResult,
  DriveNodeScope,
  FolderNode,
  MoveNodesParams,
  MoveNodesToTrashParams,
  RemoveNodesFromGroupParams,
  RenameNodeParams,
  SetPersonalResourcesLocationParams,
} from '@/domains/Drive';

import { createDriveActions, type DriveActions } from '../actions/driveActions';
import { DriveTreeDataCache } from '../data/driveTreeCache';
import {
  buildNavigatorRuntimeKey,
  DriveNavigatorRuntime,
} from '../DriveNavigatorRuntime/index.impl';
import type {
  DriveNavigatorRequest,
  DriveNavigatorRuntime as DriveNavigatorRuntimeContract,
} from '../DriveNavigatorRuntime/index.type';
import { DriveTreeRuntime } from '../DriveTreeRuntime/index.impl';
import type { DriveTreeRuntime as DriveTreeRuntimeContract } from '../DriveTreeRuntime/index.type';
import type { DriveResourceCreationRequest } from '../model/DriveResourceCreation';
import { buildDriveTreeKey, type DriveTreeRequest } from '../model/DriveTreeState';
import type {
  DriveRuntime as DriveRuntimeContract,
  GetDriveMountPathParams,
  GetDriveNodePathParams,
  GetDriveRootParams,
  GetDriveSystemFolderParams,
  ResolveDriveResourceNodeParams,
} from './index.type';

const DRIVE_TREE_POOL_CAPACITY = 16;
const DRIVE_NAVIGATOR_POOL_CAPACITY = 8;

type TreePoolEntry = {
  runtime: DriveTreeRuntime;
  lastUsedAt: number;
};

type NavigatorPoolEntry = {
  runtime: DriveNavigatorRuntime;
  lastUsedAt: number;
};

export class DriveRuntime implements DriveRuntimeContract {
  private readonly treePool = new Map<string, TreePoolEntry>();
  private readonly navigatorPool = new Map<string, NavigatorPoolEntry>();
  private readonly dataCache = new DriveTreeDataCache();
  private readonly actions: DriveActions;

  constructor() {
    this.actions = createDriveActions((scope) => {
      this.notifyChanged(scope);
    });
  }

  acquireTree(request: DriveTreeRequest): DriveTreeRuntimeContract {
    const key = buildDriveTreeKey(request);
    const existing = this.treePool.get(key);
    if (existing) {
      existing.lastUsedAt = Date.now();
      return existing.runtime;
    }

    this.ensureCapacity();
    const runtime = new DriveTreeRuntime(request, this.dataCache);
    this.treePool.set(key, {
      runtime,
      lastUsedAt: Date.now(),
    });
    return runtime;
  }

  acquireNavigator(request: DriveNavigatorRequest): DriveNavigatorRuntimeContract {
    const key = buildNavigatorRuntimeKey(request);
    const existing = this.navigatorPool.get(key);
    if (existing) {
      existing.lastUsedAt = Date.now();
      return existing.runtime;
    }
    this.ensureNavigatorCapacity();
    const runtime = new DriveNavigatorRuntime(request);
    this.navigatorPool.set(key, {
      runtime,
      lastUsedAt: Date.now(),
    });
    return runtime;
  }

  getRoot(params?: GetDriveRootParams) {
    return getDriveService().getRoot(params);
  }

  getSystemFolder(params: GetDriveSystemFolderParams): Promise<FolderNode> {
    return getDriveService().getSystemFolder(params);
  }

  getNodePath(params: GetDriveNodePathParams) {
    return getDriveService().getNodePath(params);
  }

  getMountPath(params: GetDriveMountPathParams) {
    return getDriveService().getMountPath(params);
  }

  resolveResourceNode(params: ResolveDriveResourceNodeParams) {
    return getDriveService().resolveResourceNode(params);
  }

  createFolder(params: CreateFolderParams): Promise<FolderNode> {
    return this.actions.createFolder(params);
  }

  renameNode(params: RenameNodeParams): Promise<void> {
    return this.actions.renameNode(params);
  }

  setPersonalResourcesLocation(
    params: SetPersonalResourcesLocationParams
  ): Promise<DriveBatchOperationResult> {
    return this.actions.setPersonalResourcesLocation(params);
  }

  addResourcesToGroup(params: AddResourcesToGroupParams): Promise<DriveBatchOperationResult> {
    return this.actions.addResourcesToGroup(params);
  }

  moveNodes(params: MoveNodesParams): Promise<DriveBatchOperationResult> {
    return this.actions.moveNodes(params);
  }

  moveNodesToTrash(params: MoveNodesToTrashParams): Promise<DriveBatchOperationResult> {
    return this.actions.moveNodesToTrash(params);
  }

  removeNodesFromGroup(params: RemoveNodesFromGroupParams): Promise<DriveBatchOperationResult> {
    return this.actions.removeNodesFromGroup(params);
  }

  deleteTrashedNodes(params: DeleteTrashedNodesParams): Promise<DriveBatchOperationResult> {
    return this.actions.deleteTrashedNodes(params);
  }

  createResource(params: DriveResourceCreationRequest): Promise<string> {
    return this.actions.createResource(params);
  }

  notifyChanged(scope?: DriveNodeScope): void {
    if (scope) {
      this.dataCache.invalidateScope(scope.rootId);
    } else {
      this.dataCache.clear();
    }
    this.treePool.forEach(({ runtime }) => {
      if (!scope || runtime.request.scope.rootId === scope.rootId) {
        runtime.markInvalidated(scope?.rootId ?? runtime.request.scope.rootId);
      }
    });
  }

  reset(): void {
    this.dataCache.clear();
    this.treePool.forEach(({ runtime }) => runtime.dispose());
    this.treePool.clear();
    this.navigatorPool.forEach(({ runtime }) => runtime.dispose());
    this.navigatorPool.clear();
  }

  private ensureCapacity(): void {
    if (this.treePool.size < DRIVE_TREE_POOL_CAPACITY) return;
    let victimKey: string | undefined;
    let victimUsedAt = Number.POSITIVE_INFINITY;
    for (const [key, entry] of this.treePool) {
      if (entry.runtime.hasSubscribers()) continue;
      if (entry.lastUsedAt < victimUsedAt) {
        victimKey = key;
        victimUsedAt = entry.lastUsedAt;
      }
    }
    if (!victimKey) return;
    const victim = this.treePool.get(victimKey);
    this.treePool.delete(victimKey);
    victim?.runtime.dispose();
  }

  private ensureNavigatorCapacity(): void {
    if (this.navigatorPool.size < DRIVE_NAVIGATOR_POOL_CAPACITY) return;
    let victimKey: string | undefined;
    let victimUsedAt = Number.POSITIVE_INFINITY;
    for (const [key, entry] of this.navigatorPool) {
      if (entry.runtime.hasSubscribers()) continue;
      if (entry.lastUsedAt < victimUsedAt) {
        victimKey = key;
        victimUsedAt = entry.lastUsedAt;
      }
    }
    if (!victimKey) return;
    const victim = this.navigatorPool.get(victimKey);
    this.navigatorPool.delete(victimKey);
    victim?.runtime.dispose();
  }
}
