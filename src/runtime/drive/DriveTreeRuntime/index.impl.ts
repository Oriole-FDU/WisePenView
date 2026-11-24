import type { DriveContainerNode, DriveNode } from '@/domains/Drive';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

import type { DriveTreeDataCache } from '../data/driveTreeCache';
import { buildDriveNodeKey } from '../model/DriveTreeState';
import { DriveTreeExpansion } from './DriveTreeExpansion';
import { DriveTreeInteractionState } from './DriveTreeInteractionState';
import { DriveTreeLoadCoordinator } from './DriveTreeLoadCoordinator';
import { DriveTreeLoader } from './DriveTreeLoader';
import { isDriveContainer, toDriveChildren, toDrivePageState } from './driveTreeModel';
import { DriveTreeNodeStore } from './DriveTreeNodeStore';
import { buildDriveTreeRuntimeKey } from './driveTreeRuntimeKey';
import { DriveTreeSelection } from './DriveTreeSelection';
import type {
  DriveTreeRequest,
  DriveTreeRuntime as DriveTreeRuntimeContract,
  DriveTreeSelectOptions,
  DriveTreeSnapshot,
} from './index.type';

export { buildDriveTreeRuntimeKey } from './driveTreeRuntimeKey';

export class DriveTreeRuntime implements DriveTreeRuntimeContract {
  readonly key: string;
  readonly request: DriveTreeRequest;
  readonly primaryRootKey: string;

  private readonly listeners = new Set<(snapshot: DriveTreeSnapshot) => void>();
  private readonly scopeVersions = new Map<string, number>();
  private readonly store: DriveTreeNodeStore;
  private readonly loader: DriveTreeLoader;
  private readonly selection: DriveTreeSelection;
  private readonly expansion: DriveTreeExpansion;
  private readonly interaction = new DriveTreeInteractionState();
  private readonly loadCoordinator: DriveTreeLoadCoordinator;

  private loadingKeys = new Set<string>();
  private loadingMoreKeys = new Set<string>();
  private disposed = false;
  private cachedSnapshot: DriveTreeSnapshot;

  constructor(request: DriveTreeRequest, dataCache: DriveTreeDataCache) {
    this.request = request;
    this.key = buildDriveTreeRuntimeKey(request);
    this.primaryRootKey = buildDriveNodeKey(request.scope, request.scope.rootId);
    this.store = new DriveTreeNodeStore();
    this.loader = new DriveTreeLoader(request, dataCache);
    this.selection = new DriveTreeSelection(request, this.store);
    this.expansion = new DriveTreeExpansion();
    this.loadCoordinator = new DriveTreeLoadCoordinator(
      request,
      this.store,
      this.loader,
      this.selection,
      this.expansion,
      {
        getScopeVersion: (scopeRootId) => this.getScopeVersion(scopeRootId),
        nextScopeVersion: (scopeRootId) => this.nextScopeVersion(scopeRootId),
        isScopeCurrent: (scopeRootId, version) => this.isScopeCurrent(scopeRootId, version),
        assertScopeCurrent: (scopeRootId, version) => this.assertScopeCurrent(scopeRootId, version),
        loadChildrenInternal: (parent, version, refresh) =>
          this.loadChildrenInternal(parent, version, refresh),
        restoreExpandedChildren: (nodes, version) => this.restoreExpandedChildren(nodes, version),
        resetState: () => this.resetState(),
        emit: () => this.emit(),
      }
    );
    this.cachedSnapshot = this.buildSnapshot();
  }

  getSnapshot(): DriveTreeSnapshot {
    return this.cachedSnapshot;
  }

  subscribe(listener: (snapshot: DriveTreeSnapshot) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  hasSubscribers(): boolean {
    return this.listeners.size > 0;
  }

  dispose(): void {
    this.disposed = true;
    this.listeners.clear();
    this.store.reset();
    this.selection.reset();
    this.expansion.reset();
    this.interaction.reset();
  }

  initialize(): Promise<void> {
    this.assertAlive();
    return this.loadCoordinator.initialize();
  }

  async focus(nodeId: string): Promise<void> {
    await this.initialize();
    this.assertAlive();
    const scope = this.request.scope;
    const version = this.nextScopeVersion(scope.rootId);
    this.loadCoordinator.beginFocus();

    try {
      const root = await this.loader.getRoot(scope);
      const pathNodes = await this.loader.getPath(scope, nodeId, root);
      this.assertScopeCurrent(scope.rootId, version);

      const current = pathNodes.at(-1);
      if (!isDriveContainer(current)) {
        throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_NOT_FOUND, { nodeId });
      }

      this.store.setCurrentPath(pathNodes);
      const currentKey = this.store.currentKey;
      await this.loadChildrenInternal(current, version);
      await this.restoreExpandedChildren(this.store.getChildren(currentKey ?? '') ?? [], version);
      this.assertScopeCurrent(scope.rootId, version);
      this.loadCoordinator.finishFocus();
    } catch (error) {
      if (!this.isScopeCurrent(scope.rootId, version)) return;
      this.loadCoordinator.failFocus(error);
      throw error;
    }
  }

  async refresh(): Promise<void> {
    await this.initialize();
    this.assertAlive();
    await this.loadCoordinator.refresh();
  }

  async loadMoreScopes(): Promise<void> {
    await this.initialize();
    this.assertAlive();
    await this.loadCoordinator.loadMoreScopes();
  }

  async expandNode(nodeKey: string): Promise<void> {
    this.assertAlive();
    const node = this.store.requireContainer(nodeKey);
    const version = this.getScopeVersion(node.scope.rootId);
    if (!this.store.hasChildren(nodeKey)) {
      await this.loadChildrenInternal(node, version);
    }
    if (this.expansion.expand(nodeKey, node.scope)) this.emit();
  }

  collapseNode(nodeKey: string): void {
    this.assertAlive();
    const node = this.store.getNode(nodeKey);
    if (node && this.expansion.collapse(nodeKey, node.scope)) this.emit();
  }

  setExpandedKeys(keys: readonly string[]): void {
    this.assertAlive();
    this.expansion.setKeys(
      keys,
      this.store.scopeEntryList.map((entry) => entry.scope)
    );
    this.emit();
  }

  collapseAll(): void {
    this.assertAlive();
    this.expansion.collapseAll(this.store.scopeEntryList.map((entry) => entry.scope));
    this.emit();
  }

  async loadMore(nodeKey: string): Promise<void> {
    this.assertAlive();
    const parent = this.store.requireContainer(nodeKey);
    const pageState = this.store.getPage(nodeKey);
    if (!pageState?.nextCursor || this.loadingMoreKeys.has(nodeKey)) return;

    const version = this.getScopeVersion(parent.scope.rootId);
    this.loadingMoreKeys = new Set(this.loadingMoreKeys).add(nodeKey);
    this.emit();
    try {
      const page = await this.loader.loadChildren(parent, pageState.nextCursor, false);
      this.assertScopeCurrent(parent.scope.rootId, version);
      this.store.appendChildren(nodeKey, toDriveChildren(page), toDrivePageState(page));
      this.loadCoordinator.clearError();
    } catch (error) {
      if (this.isScopeCurrent(parent.scope.rootId, version)) {
        this.loadCoordinator.setError(error);
      }
      throw error;
    } finally {
      this.loadingMoreKeys = new Set(
        [...this.loadingMoreKeys].filter((loadingKey) => loadingKey !== nodeKey)
      );
      this.emit();
    }
  }

  selectNode(nodeKey: string | null): void {
    this.assertAlive();
    this.selection.setNode(nodeKey);
    this.emit();
  }

  setCheckedNodeKeys(nodeKeys: Iterable<string>): void {
    this.assertAlive();
    this.selection.setChecked(nodeKeys);
    this.emit();
  }

  clearChecked(): void {
    this.assertAlive();
    if (this.selection.clearChecked()) this.emit();
  }

  select(options: DriveTreeSelectOptions): DriveNode[] {
    this.assertAlive();
    const selected = this.selection.select(options);
    this.emit();
    return selected;
  }

  setDetailPanelCollapsed(collapsed: boolean): void {
    this.assertAlive();
    if (this.interaction.setDetailPanelCollapsed(collapsed)) this.emit();
  }

  beginDrag(nodeKeys: Iterable<string>, activeNodeKey: string): void {
    this.assertAlive();
    this.interaction.beginDrag(nodeKeys, activeNodeKey);
    this.emit();
  }

  endDrag(): void {
    this.assertAlive();
    if (this.interaction.endDrag()) this.emit();
  }

  findNode(nodeKey: string): DriveNode | undefined {
    return this.store.getNode(nodeKey);
  }

  markInvalidated(scopeRootId?: string): void {
    if (this.disposed) return;
    this.loadCoordinator.markInvalidated(scopeRootId);
  }

  private resetState(): void {
    this.store.reset();
    this.selection.reset();
    this.expansion.reset();
    this.interaction.reset();
    this.loadingKeys = new Set();
    this.loadingMoreKeys = new Set();
    this.scopeVersions.clear();
  }

  private async loadChildrenInternal(
    parent: DriveContainerNode,
    version: number,
    refresh = false
  ): Promise<void> {
    const parentKey = buildDriveNodeKey(parent.scope, parent.id);
    if (!refresh && this.store.hasChildren(parentKey)) return;

    this.loadingKeys = new Set(this.loadingKeys).add(parentKey);
    if (this.loadCoordinator.isInitialized && parentKey === this.store.currentKey) {
      this.loadCoordinator.setNodeLoading(true);
    }
    this.emit();
    try {
      const page = await this.loader.loadChildren(parent, undefined, refresh);
      this.assertScopeCurrent(parent.scope.rootId, version);
      this.store.replaceChildren(parentKey, toDriveChildren(page), toDrivePageState(page));
      this.loadCoordinator.clearError();
    } finally {
      this.loadingKeys = new Set(
        [...this.loadingKeys].filter((loadingKey) => loadingKey !== parentKey)
      );
      if (
        this.loadCoordinator.isInitialized &&
        parentKey === this.store.currentKey &&
        this.isScopeCurrent(parent.scope.rootId, version)
      ) {
        this.loadCoordinator.setNodeLoading(false);
      }
      this.emit();
    }
  }

  private async restoreExpandedChildren(
    nodes: readonly DriveNode[],
    version: number
  ): Promise<void> {
    await Promise.all(
      nodes.map(async (node) => {
        if (!isDriveContainer(node)) return;
        const nodeKey = buildDriveNodeKey(node.scope, node.id);
        if (!this.expansion.keys.has(nodeKey)) return;
        if (!this.store.hasChildren(nodeKey)) {
          await this.loadChildrenInternal(node, version);
        }
        this.assertScopeCurrent(node.scope.rootId, version);
        await this.restoreExpandedChildren(this.store.getChildren(nodeKey) ?? [], version);
      })
    );
  }

  private getScopeVersion(scopeRootId: string): number {
    return this.scopeVersions.get(scopeRootId) ?? 0;
  }

  private nextScopeVersion(scopeRootId: string): number {
    const next = this.getScopeVersion(scopeRootId) + 1;
    this.scopeVersions.set(scopeRootId, next);
    return next;
  }

  private isScopeCurrent(scopeRootId: string, version: number): boolean {
    return !this.disposed && version === this.getScopeVersion(scopeRootId);
  }

  private assertScopeCurrent(scopeRootId: string, version: number): void {
    this.assertAlive();
    if (this.isScopeCurrent(scopeRootId, version)) return;
    throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
      reason: 'Drive 树位置已变化',
    });
  }

  private buildSnapshot(): DriveTreeSnapshot {
    return {
      key: this.key,
      request: this.request,
      primaryRootKey: this.primaryRootKey,
      ...this.store.buildSnapshot(),
      ...this.selection.buildSnapshot(),
      expandedKeys: new Set(this.expansion.keys),
      ...this.interaction.buildSnapshot(),
      loadingKeys: new Set(this.loadingKeys),
      loadingMoreKeys: new Set(this.loadingMoreKeys),
      ...this.loadCoordinator.buildSnapshot(),
    };
  }

  private emit(): void {
    if (this.disposed) return;
    this.cachedSnapshot = this.buildSnapshot();
    for (const listener of this.listeners) {
      listener(this.cachedSnapshot);
    }
  }

  private assertAlive(): void {
    if (!this.disposed) return;
    throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
      reason: 'DriveTreeRuntime 已销毁',
    });
  }
}
