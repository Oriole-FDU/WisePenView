import type { DriveNodeScope } from '@/domains/Drive';

import { getDriveExpandedNodeIds, setDriveExpandedNodeIds } from '../data/driveTreeCache';
import {
  buildDriveNodeKey,
  getDriveNodeIdFromKey,
  isDriveNodeKeyInScope,
} from '../model/DriveTreeState';

export class DriveTreeExpansion {
  private expandedKeys = new Set<string>();

  get keys(): ReadonlySet<string> {
    return this.expandedKeys;
  }

  initializeScope(scope: DriveNodeScope): void {
    getDriveExpandedNodeIds(scope.rootId).forEach((nodeId) => {
      this.expandedKeys.add(buildDriveNodeKey(scope, nodeId));
    });
  }

  expand(nodeKey: string, scope: DriveNodeScope): boolean {
    if (this.expandedKeys.has(nodeKey)) return false;
    this.expandedKeys = new Set(this.expandedKeys).add(nodeKey);
    this.persist(scope);
    return true;
  }

  collapse(nodeKey: string, scope: DriveNodeScope): boolean {
    if (!this.expandedKeys.has(nodeKey)) return false;
    this.expandedKeys = new Set(
      [...this.expandedKeys].filter((expandedKey) => expandedKey !== nodeKey)
    );
    this.persist(scope);
    return true;
  }

  setKeys(keys: readonly string[], scopes: readonly DriveNodeScope[]): void {
    this.expandedKeys = new Set(keys);
    scopes.forEach((scope) => this.persist(scope));
  }

  collapseAll(scopes: readonly DriveNodeScope[]): void {
    this.expandedKeys = new Set();
    scopes.forEach((scope) => setDriveExpandedNodeIds(scope.rootId, []));
  }

  reset(): void {
    this.expandedKeys = new Set();
  }

  private persist(scope: DriveNodeScope): void {
    const nodeIds = [...this.expandedKeys]
      .filter((nodeKey) => isDriveNodeKeyInScope(nodeKey, scope.rootId))
      .map(getDriveNodeIdFromKey);
    setDriveExpandedNodeIds(scope.rootId, nodeIds);
  }
}
