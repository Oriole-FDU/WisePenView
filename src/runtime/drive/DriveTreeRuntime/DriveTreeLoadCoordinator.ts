import type { DriveContainerNode, DriveNode, DriveNodeScope } from '@/domains/Drive';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

import { buildDriveNodeKey } from '../model/DriveTreeState';
import type { DriveTreeExpansion } from './DriveTreeExpansion';
import type { DriveTreeLoader } from './DriveTreeLoader';
import { isDriveContainer } from './driveTreeModel';
import type { DriveTreeNodeStore } from './DriveTreeNodeStore';
import type { DriveTreeSelection } from './DriveTreeSelection';
import type { DriveTreeRequest, DriveTreeScopeEntry, DriveTreeSnapshot } from './index.type';

type DriveTreeLoadSnapshot = Pick<
  DriveTreeSnapshot,
  'loading' | 'loadingMoreScopes' | 'hasMoreScopes' | 'initialized' | 'error'
>;

interface DriveTreeLoadHost {
  getScopeVersion(scopeRootId: string): number;
  nextScopeVersion(scopeRootId: string): number;
  isScopeCurrent(scopeRootId: string, version: number): boolean;
  assertScopeCurrent(scopeRootId: string, version: number): void;
  loadChildrenInternal(
    parent: DriveContainerNode,
    version: number,
    refresh?: boolean
  ): Promise<void>;
  restoreExpandedChildren(nodes: readonly DriveNode[], version: number): Promise<void>;
  resetState(): void;
  emit(): void;
}

export class DriveTreeLoadCoordinator {
  private readonly request: DriveTreeRequest;
  private readonly store: DriveTreeNodeStore;
  private readonly loader: DriveTreeLoader;
  private readonly selection: DriveTreeSelection;
  private readonly expansion: DriveTreeExpansion;
  private readonly host: DriveTreeLoadHost;

  private loading = false;
  private loadingMoreScopes = false;
  private hasMoreScopes = false;
  private initialized = false;
  private scopePage = 0;
  private error: unknown;
  private initializePromise: Promise<void> | null = null;

  constructor(
    request: DriveTreeRequest,
    store: DriveTreeNodeStore,
    loader: DriveTreeLoader,
    selection: DriveTreeSelection,
    expansion: DriveTreeExpansion,
    host: DriveTreeLoadHost
  ) {
    this.request = request;
    this.store = store;
    this.loader = loader;
    this.selection = selection;
    this.expansion = expansion;
    this.host = host;
  }

  get isInitialized(): boolean {
    return this.initialized;
  }

  initialize(): Promise<void> {
    if (this.initialized) return Promise.resolve();
    if (this.initializePromise) return this.initializePromise;
    this.initializePromise = this.runInitialize().finally(() => {
      this.initializePromise = null;
    });
    return this.initializePromise;
  }

  beginFocus(): void {
    this.loading = true;
    this.error = undefined;
    this.host.emit();
  }

  finishFocus(): void {
    this.loading = false;
    this.host.emit();
  }

  failFocus(error: unknown): void {
    this.loading = false;
    this.error = error;
    this.host.emit();
  }

  setNodeLoading(loading: boolean): void {
    if (this.loading === loading) return;
    this.loading = loading;
    this.host.emit();
  }

  setError(error: unknown): void {
    this.error = error;
  }

  clearError(): void {
    this.error = undefined;
  }

  async refresh(): Promise<void> {
    await this.initialize();
    const scopes = this.store.getLoadedScopes();
    if (scopes.length === 0) return;
    await Promise.all(scopes.map((scope) => this.refreshScope(scope)));
  }

  async loadMoreScopes(): Promise<void> {
    await this.initialize();
    if (
      this.loading ||
      this.loadingMoreScopes ||
      !this.hasMoreScopes ||
      (this.request.scopeMode ?? 'single') === 'single'
    ) {
      return;
    }

    this.loadingMoreScopes = true;
    this.host.emit();
    try {
      const nextPage = this.scopePage + 1;
      const groups = await this.loader.fetchScopePage(nextPage);
      const knownScopeIds = new Set(this.store.scopeEntryList.map((entry) => entry.scope.rootId));
      const nextEntries = groups.entries
        .filter((entry) => !knownScopeIds.has(entry.scope.rootId))
        .map(({ scope, groupName }) => createScopeEntry(scope, groupName));
      this.store.appendScopeEntries(nextEntries);
      this.host.emit();
      await Promise.all(nextEntries.map((entry) => this.initializeScope(entry.scope, false)));
      this.scopePage = nextPage;
      this.hasMoreScopes = groups.hasMore;
      this.selection.applyInitialSelection();
      this.error = undefined;
    } catch (error) {
      this.error = error;
      this.host.emit();
      throw error;
    } finally {
      this.loadingMoreScopes = false;
      this.host.emit();
    }
  }

  markInvalidated(scopeRootId?: string): void {
    if (!this.initialized) return;
    this.store.scopeEntryList
      .filter(
        (entry) => entry.root !== null && (!scopeRootId || entry.scope.rootId === scopeRootId)
      )
      .forEach((entry) => {
        void this.refreshScope(entry.scope).catch((error: unknown) => {
          this.error = error;
          this.host.emit();
        });
      });
  }

  buildSnapshot(): DriveTreeLoadSnapshot {
    return {
      loading: this.loading,
      loadingMoreScopes: this.loadingMoreScopes,
      hasMoreScopes: this.hasMoreScopes,
      initialized: this.initialized,
      error: this.error,
    };
  }

  private async runInitialize(): Promise<void> {
    this.host.resetState();
    this.resetLoadState();
    this.loading = true;
    this.host.emit();
    try {
      if ((this.request.scopeMode ?? 'single') === 'single') {
        this.store.setScopeEntries([createScopeEntry(this.request.scope)]);
        this.host.emit();
        await this.initializeScope(this.request.scope, true);
        if (this.request.mode === 'select') {
          this.expansion.setKeys(
            [buildDriveNodeKey(this.request.scope, this.request.scope.rootId)],
            [this.request.scope]
          );
        }
      } else {
        const groups = await this.loader.fetchScopePage(1);
        this.scopePage = 1;
        this.hasMoreScopes = groups.hasMore;
        this.store.setScopeEntries(
          groups.entries.map(({ scope, groupName }) => createScopeEntry(scope, groupName))
        );
        this.host.emit();
        await Promise.all(
          this.store.scopeEntryList.map((entry) =>
            this.initializeScope(entry.scope, entry.scope.rootId === this.request.scope.rootId)
          )
        );
      }
      this.selection.applyInitialSelection();
      this.initialized = true;
      this.loading = false;
      this.host.emit();
    } catch (error) {
      this.loading = false;
      this.error = error;
      this.host.emit();
      throw error;
    }
  }

  private async initializeScope(scope: DriveNodeScope, isPrimary: boolean): Promise<void> {
    const root = await this.loader.getRoot(scope);
    this.store.addNodes([root]);
    this.expansion.initializeScope(scope);
    this.store.updateScopeEntry(scope, root);
    if (isPrimary) this.store.setCurrentRoot(scope);
    this.host.emit();
    await this.host.loadChildrenInternal(root, this.host.getScopeVersion(scope.rootId));
  }

  private async refreshScope(scope: DriveNodeScope): Promise<void> {
    const version = this.host.nextScopeVersion(scope.rootId);
    const root = await this.loader.getRoot(scope);
    const isPrimary = scope.rootId === this.request.scope.rootId;
    const current =
      isPrimary && this.store.currentKey ? this.store.getNode(this.store.currentKey) : undefined;
    this.host.assertScopeCurrent(scope.rootId, version);

    const pathNodes = await this.loader.getPath(
      scope,
      isDriveContainer(current) ? current.id : root.id,
      root
    );
    this.host.assertScopeCurrent(scope.rootId, version);
    const target = pathNodes.at(-1);
    if (!isDriveContainer(target)) {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_NOT_FOUND, {
        nodeId: current?.id,
      });
    }

    if (isPrimary) this.store.setCurrentPath(pathNodes);
    const targetKey = buildDriveNodeKey(target.scope, target.id);
    await this.host.loadChildrenInternal(target, version, true);
    await this.host.restoreExpandedChildren(this.store.getChildren(targetKey) ?? [], version);
    this.error = undefined;
    this.host.emit();
  }

  private resetLoadState(): void {
    this.loading = false;
    this.loadingMoreScopes = false;
    this.hasMoreScopes = false;
    this.scopePage = 0;
    this.initialized = false;
    this.error = undefined;
  }
}

const createScopeEntry = (
  scope: DriveTreeScopeEntry['scope'],
  groupName?: string
): DriveTreeScopeEntry => ({
  scope,
  groupName,
  rootKey: buildDriveNodeKey(scope, scope.rootId),
  root: null,
});
