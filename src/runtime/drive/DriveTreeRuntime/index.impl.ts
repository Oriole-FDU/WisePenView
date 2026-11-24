import { getDriveService, getGroupService } from '@/domains';
import {
  buildDriveNodeScope,
  type DriveContainerNode,
  type DriveNode,
  type DriveNodeChildrenPage,
  type DriveNodeScope,
  type RootNode,
} from '@/domains/Drive';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

import {
  type DriveTreeDataCache,
  getDriveExpandedNodeIds,
  setDriveExpandedNodeIds,
} from '../data/driveTreeCache';
import {
  buildDriveNodeKey,
  type DriveTreePageState,
  getDriveNodeIdFromKey,
  isDriveNodeKeyInScope,
} from '../model/DriveTreeState';
import type {
  DriveTreeRequest,
  DriveTreeRuntime as DriveTreeRuntimeContract,
  DriveTreeScopeEntry,
  DriveTreeSelectOptions,
  DriveTreeSnapshot,
} from './index.type';

const GROUP_SCOPE_PAGE_SIZE = 20;

const isDriveContainer = (node: DriveNode | undefined): node is DriveContainerNode =>
  node?.type === 'root' || node?.type === 'folder';

const toDriveChildren = (page: DriveNodeChildrenPage): DriveNode[] => [
  ...page.folderNodes,
  ...page.resourceNodes,
];

const toDrivePageState = (page: DriveNodeChildrenPage): DriveTreePageState => ({
  total: page.total,
  hasMore: Boolean(page.nextCursor),
  nextCursor: page.nextCursor,
});

export const buildDriveTreeRuntimeKey = (request: DriveTreeRequest): string =>
  [
    request.scopeMode ?? 'single',
    request.surface,
    request.mode,
    request.scope.rootId,
    request.load?.kinds?.toSorted().join(',') ?? 'all',
    request.load?.resourceType?.trim().toLowerCase() ?? '',
    request.load?.pageSize ?? '',
    request.multiple ? 'multiple' : 'single',
    [...(request.selectableTypes ?? [])].toSorted().join(','),
    [...(request.excludedGroupIds ?? [])].toSorted().join(','),
    [...(request.initialSelectedIds ?? [])].toSorted().join(','),
    [...(request.disabledNodeIds ?? [])].toSorted().join(','),
    request.refreshTrigger ?? '',
  ].join('|');

export class DriveTreeRuntime implements DriveTreeRuntimeContract {
  readonly key: string;
  readonly request: DriveTreeRequest;
  readonly primaryRootKey: string;

  private readonly dataCache: DriveTreeDataCache;
  private readonly listeners = new Set<(snapshot: DriveTreeSnapshot) => void>();
  private readonly scopeVersions = new Map<string, number>();

  private scopeEntries: DriveTreeScopeEntry[] = [];
  private currentNodeKey: string | null = null;
  private pathNodeKeys: string[] = [];
  private nodeByKey = new Map<string, DriveNode>();
  private childrenByKey = new Map<string, readonly DriveNode[]>();
  private pageByKey = new Map<string, DriveTreePageState>();
  private expandedKeys = new Set<string>();
  private selectedKeys = new Set<string>();
  private checkedKeys = new Set<string>();
  private draggingKeys = new Set<string>();
  private activeDragKey: string | null = null;
  private loadingKeys = new Set<string>();
  private loadingMoreKeys = new Set<string>();
  private loading = false;
  private loadingMoreScopes = false;
  private hasMoreScopes = false;
  private initialized = false;
  private initialSelectionPending = true;
  private scopePage = 0;
  private detailPanelCollapsed = true;
  private disposed = false;
  private error: unknown;
  private initializePromise: Promise<void> | null = null;
  private cachedSnapshot: DriveTreeSnapshot;

  constructor(request: DriveTreeRequest, dataCache: DriveTreeDataCache) {
    this.request = request;
    this.key = buildDriveTreeRuntimeKey(request);
    this.primaryRootKey = buildDriveNodeKey(request.scope, request.scope.rootId);
    this.dataCache = dataCache;
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
    this.nodeByKey.clear();
    this.childrenByKey.clear();
    this.pageByKey.clear();
    this.draggingKeys.clear();
    this.activeDragKey = null;
  }

  initialize(): Promise<void> {
    this.assertAlive();
    if (this.initialized) return Promise.resolve();
    if (this.initializePromise) return this.initializePromise;
    this.initializePromise = this.runInitialize().finally(() => {
      this.initializePromise = null;
    });
    return this.initializePromise;
  }

  async focus(nodeId: string): Promise<void> {
    await this.initialize();
    this.assertAlive();
    const scope = this.request.scope;
    const version = this.nextScopeVersion(scope.rootId);
    this.loading = true;
    this.error = undefined;
    this.emit();

    try {
      const driveService = getDriveService();
      const root = await driveService.getRoot({
        rootId: scope.rootId,
        groupId: scope.type === 'group' ? scope.groupId : undefined,
      });
      const pathNodes =
        nodeId === root.id ? [root] : await driveService.getNodePath({ nodeId, scope });
      this.assertScopeCurrent(scope.rootId, version);

      const current = pathNodes.at(-1);
      if (!isDriveContainer(current)) {
        throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_NOT_FOUND, { nodeId });
      }

      this.addNodes(pathNodes);
      this.pathNodeKeys = pathNodes.map((node) => buildDriveNodeKey(node.scope, node.id));
      this.currentNodeKey = this.pathNodeKeys.at(-1) ?? null;
      await this.loadChildrenInternal(current, version);
      await this.restoreExpandedChildren(
        this.childrenByKey.get(this.currentNodeKey ?? '') ?? [],
        version
      );
      this.assertScopeCurrent(scope.rootId, version);
      this.initialized = true;
      this.loading = false;
      this.emit();
    } catch (error) {
      if (!this.isScopeCurrent(scope.rootId, version)) return;
      this.loading = false;
      this.error = error;
      this.emit();
      throw error;
    }
  }

  async refresh(): Promise<void> {
    await this.initialize();
    this.assertAlive();
    const scopes = this.scopeEntries
      .filter((entry) => entry.root !== null)
      .map((entry) => entry.scope);
    if (scopes.length === 0) return;
    await Promise.all(scopes.map((scope) => this.refreshScope(scope)));
  }

  async loadMoreScopes(): Promise<void> {
    await this.initialize();
    this.assertAlive();
    if (
      this.loading ||
      this.loadingMoreScopes ||
      !this.hasMoreScopes ||
      (this.request.scopeMode ?? 'single') === 'single'
    ) {
      return;
    }

    this.loadingMoreScopes = true;
    this.emit();
    try {
      const nextPage = this.scopePage + 1;
      const groups = await this.fetchScopeGroups(nextPage);
      const knownScopeIds = new Set(this.scopeEntries.map((entry) => entry.scope.rootId));
      const nextEntries = groups.entries
        .filter((entry) => !knownScopeIds.has(entry.scope.rootId))
        .map(({ scope, groupName }) => ({
          scope,
          groupName,
          rootKey: buildDriveNodeKey(scope, scope.rootId),
          root: null,
        }));
      this.scopeEntries = [...this.scopeEntries, ...nextEntries];
      this.emit();
      await Promise.all(nextEntries.map((entry) => this.initializeScope(entry.scope, false)));
      this.scopePage = nextPage;
      this.hasMoreScopes = groups.hasMore;
      this.applyInitialSelection();
      this.error = undefined;
    } catch (error) {
      if (!this.disposed) {
        this.error = error;
        this.emit();
      }
      throw error;
    } finally {
      this.loadingMoreScopes = false;
      this.emit();
    }
  }

  async expandNode(nodeKey: string): Promise<void> {
    this.assertAlive();
    const node = this.requireContainer(nodeKey);
    const version = this.getScopeVersion(node.scope.rootId);
    if (!this.childrenByKey.has(nodeKey)) {
      await this.loadChildrenInternal(node, version);
    }
    if (!this.expandedKeys.has(nodeKey)) {
      this.expandedKeys = new Set(this.expandedKeys).add(nodeKey);
      this.persistExpandedKeys(node.scope);
      this.emit();
    }
  }

  collapseNode(nodeKey: string): void {
    this.assertAlive();
    const node = this.nodeByKey.get(nodeKey);
    if (!node || !this.expandedKeys.has(nodeKey)) return;
    this.expandedKeys = new Set(
      [...this.expandedKeys].filter((expandedKey) => expandedKey !== nodeKey)
    );
    this.persistExpandedKeys(node.scope);
    this.emit();
  }

  setExpandedKeys(keys: readonly string[]): void {
    this.assertAlive();
    this.expandedKeys = new Set(keys);
    this.scopeEntries.forEach((entry) => this.persistExpandedKeys(entry.scope));
    this.emit();
  }

  collapseAll(): void {
    this.assertAlive();
    this.expandedKeys = new Set();
    this.scopeEntries.forEach((entry) => {
      setDriveExpandedNodeIds(entry.scope.rootId, []);
    });
    this.emit();
  }

  async loadMore(nodeKey: string): Promise<void> {
    this.assertAlive();
    const parent = this.requireContainer(nodeKey);
    const pageState = this.pageByKey.get(nodeKey);
    if (!pageState?.nextCursor || this.loadingMoreKeys.has(nodeKey)) return;

    const version = this.getScopeVersion(parent.scope.rootId);
    this.loadingMoreKeys = new Set(this.loadingMoreKeys).add(nodeKey);
    this.emit();
    try {
      const page = await this.loadChildrenPage(parent, pageState.nextCursor, false);
      this.assertScopeCurrent(parent.scope.rootId, version);
      const loaded = this.childrenByKey.get(nodeKey) ?? [];
      const children = [...loaded, ...toDriveChildren(page)];
      this.addNodes(children);
      this.childrenByKey = new Map(this.childrenByKey).set(nodeKey, children);
      this.pageByKey = new Map(this.pageByKey).set(nodeKey, toDrivePageState(page));
      this.error = undefined;
    } catch (error) {
      if (this.isScopeCurrent(parent.scope.rootId, version)) {
        this.error = error;
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
    this.selectedKeys = nodeKey ? new Set([nodeKey]) : new Set();
    this.emit();
  }

  setCheckedNodeKeys(nodeKeys: Iterable<string>): void {
    this.assertAlive();
    this.checkedKeys = new Set(nodeKeys);
    this.emit();
  }

  clearChecked(): void {
    this.assertAlive();
    if (this.checkedKeys.size === 0) return;
    this.checkedKeys = new Set();
    this.emit();
  }

  select({
    keys,
    clickedKey,
    clickedSelected,
    isNodeSelectable,
    isNodeDisabled,
  }: DriveTreeSelectOptions): DriveNode[] {
    this.assertAlive();
    this.initialSelectionPending = false;
    const normalized = this.normalizeSelectableKeys([...keys], isNodeSelectable, isNodeDisabled);
    const nextKeys = this.request.multiple
      ? normalized
      : (() => {
          const rawKeys = clickedSelected ? normalized : clickedKey ? [clickedKey] : normalized;
          const nextNormalized = this.normalizeSelectableKeys(
            rawKeys,
            isNodeSelectable,
            isNodeDisabled
          );
          return nextNormalized[0] ? [nextNormalized[0]] : [];
        })();
    this.selectedKeys = new Set(nextKeys);
    this.emit();
    return this.getSelectedNodes();
  }

  setDetailPanelCollapsed(collapsed: boolean): void {
    this.assertAlive();
    if (this.detailPanelCollapsed === collapsed) return;
    this.detailPanelCollapsed = collapsed;
    this.emit();
  }

  beginDrag(nodeKeys: Iterable<string>, activeNodeKey: string): void {
    this.assertAlive();
    this.draggingKeys = new Set(nodeKeys);
    this.activeDragKey = activeNodeKey;
    this.emit();
  }

  endDrag(): void {
    this.assertAlive();
    if (this.draggingKeys.size === 0 && this.activeDragKey === null) return;
    this.draggingKeys = new Set();
    this.activeDragKey = null;
    this.emit();
  }

  findNode(nodeKey: string): DriveNode | undefined {
    return this.nodeByKey.get(nodeKey);
  }

  markInvalidated(scopeRootId?: string): void {
    if (this.disposed || !this.initialized) return;
    this.scopeEntries
      .filter(
        (entry) => entry.root !== null && (!scopeRootId || entry.scope.rootId === scopeRootId)
      )
      .forEach((entry) => {
        void this.refreshScope(entry.scope).catch((error: unknown) => {
          if (this.disposed) return;
          this.error = error;
          this.emit();
        });
      });
  }

  private async runInitialize(): Promise<void> {
    this.reset();
    this.loading = true;
    this.error = undefined;
    this.emit();
    try {
      if ((this.request.scopeMode ?? 'single') === 'single') {
        this.scopeEntries = [
          {
            scope: this.request.scope,
            rootKey: this.primaryRootKey,
            root: null,
          },
        ];
        this.emit();
        await this.initializeScope(this.request.scope, true);
        if (this.request.mode === 'select') {
          this.expandedKeys = new Set([this.primaryRootKey]);
          this.persistExpandedKeys(this.request.scope);
        }
      } else {
        const groups = await this.fetchScopeGroups(1);
        this.scopePage = 1;
        this.hasMoreScopes = groups.hasMore;
        this.scopeEntries = groups.entries.map(({ scope, groupName }) => ({
          scope,
          groupName,
          rootKey: buildDriveNodeKey(scope, scope.rootId),
          root: null,
        }));
        this.emit();
        await Promise.all(
          this.scopeEntries.map((entry) =>
            this.initializeScope(entry.scope, entry.scope.rootId === this.request.scope.rootId)
          )
        );
      }
      this.applyInitialSelection();
      this.initialized = true;
      this.loading = false;
      this.emit();
    } catch (error) {
      this.loading = false;
      this.error = error;
      this.emit();
      throw error;
    }
  }

  private async initializeScope(scope: DriveNodeScope, isPrimary: boolean): Promise<void> {
    const root = await this.getRoot(scope);
    const rootKey = buildDriveNodeKey(scope, root.id);
    this.addNodes([root]);
    getDriveExpandedNodeIds(scope.rootId).forEach((nodeId) => {
      this.expandedKeys.add(buildDriveNodeKey(scope, nodeId));
    });
    this.updateScopeEntry(scope, rootKey, root);
    if (isPrimary) {
      this.currentNodeKey = rootKey;
      this.pathNodeKeys = [rootKey];
    }
    this.emit();
    await this.loadChildrenInternal(root, this.getScopeVersion(scope.rootId));
  }

  private async refreshScope(scope: DriveNodeScope): Promise<void> {
    this.assertAlive();
    const version = this.nextScopeVersion(scope.rootId);
    const root = await this.getRoot(scope);
    const isPrimary = scope.rootId === this.request.scope.rootId;
    const current =
      isPrimary && this.currentNodeKey ? this.nodeByKey.get(this.currentNodeKey) : undefined;
    this.assertScopeCurrent(scope.rootId, version);

    const pathNodes =
      isPrimary && current && isDriveContainer(current) && current.id !== root.id
        ? await getDriveService().getNodePath({ nodeId: current.id, scope })
        : [root];
    this.assertScopeCurrent(scope.rootId, version);
    const target = pathNodes.at(-1);
    if (!isDriveContainer(target)) {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_NOT_FOUND, {
        nodeId: current?.id,
      });
    }

    this.addNodes(pathNodes);
    if (isPrimary) {
      this.pathNodeKeys = pathNodes.map((node) => buildDriveNodeKey(node.scope, node.id));
      this.currentNodeKey = this.pathNodeKeys.at(-1) ?? null;
    }
    const targetKey = buildDriveNodeKey(target.scope, target.id);
    await this.loadChildrenInternal(target, version, true);
    await this.restoreExpandedChildren(this.childrenByKey.get(targetKey) ?? [], version);
    this.error = undefined;
    this.emit();
  }

  private async loadChildrenInternal(
    parent: DriveContainerNode,
    version: number,
    refresh = false
  ): Promise<void> {
    const parentKey = buildDriveNodeKey(parent.scope, parent.id);
    if (!refresh && this.childrenByKey.has(parentKey)) return;

    this.loadingKeys = new Set(this.loadingKeys).add(parentKey);
    if (this.initialized && parentKey === this.currentNodeKey) this.loading = true;
    this.emit();
    try {
      const page = await this.loadChildrenPage(parent, undefined, refresh);
      this.assertScopeCurrent(parent.scope.rootId, version);
      const children = toDriveChildren(page);
      this.addNodes(children);
      this.childrenByKey = new Map(this.childrenByKey).set(parentKey, children);
      this.pageByKey = new Map(this.pageByKey).set(parentKey, toDrivePageState(page));
      this.error = undefined;
    } finally {
      this.loadingKeys = new Set(
        [...this.loadingKeys].filter((loadingKey) => loadingKey !== parentKey)
      );
      if (
        this.initialized &&
        parentKey === this.currentNodeKey &&
        this.isScopeCurrent(parent.scope.rootId, version)
      ) {
        this.loading = false;
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
        if (!this.expandedKeys.has(nodeKey)) return;
        if (!this.childrenByKey.has(nodeKey)) {
          await this.loadChildrenInternal(node, version);
        }
        this.assertScopeCurrent(node.scope.rootId, version);
        await this.restoreExpandedChildren(this.childrenByKey.get(nodeKey) ?? [], version);
      })
    );
  }

  private async loadChildrenPage(
    parent: DriveContainerNode,
    cursor: string | undefined,
    refresh: boolean
  ): Promise<DriveNodeChildrenPage> {
    const options = {
      scope: parent.scope,
      parentId: parent.id,
      cursor,
      load: this.request.load,
    };
    if (!refresh) {
      const cached = this.dataCache.getChildren(options);
      if (cached) return cached;
    }
    const page = await getDriveService().loadNodeChildren({
      parent,
      cursor,
      pageSize: this.request.load?.pageSize,
      kinds: this.request.load?.kinds ? [...this.request.load.kinds] : undefined,
      resourceType: this.request.load?.resourceType,
      refresh,
    });
    return this.dataCache.setChildren(options, page);
  }

  private updateScopeEntry(scope: DriveNodeScope, rootKey: string, root: RootNode): void {
    const entryIndex = this.scopeEntries.findIndex((entry) => entry.scope.rootId === scope.rootId);
    if (entryIndex < 0) {
      this.scopeEntries = [
        ...this.scopeEntries,
        {
          scope,
          rootKey,
          root,
        },
      ];
      return;
    }
    this.scopeEntries = this.scopeEntries.with(entryIndex, {
      ...this.scopeEntries[entryIndex]!,
      rootKey,
      root,
    });
  }

  private reset(): void {
    this.scopeEntries = [];
    this.currentNodeKey = null;
    this.pathNodeKeys = [];
    this.nodeByKey = new Map();
    this.childrenByKey = new Map();
    this.pageByKey = new Map();
    this.expandedKeys = new Set();
    this.selectedKeys = new Set();
    this.checkedKeys = new Set();
    this.draggingKeys = new Set();
    this.activeDragKey = null;
    this.loadingKeys = new Set();
    this.loadingMoreKeys = new Set();
    this.scopeVersions.clear();
    this.scopePage = 0;
    this.hasMoreScopes = false;
    this.initialSelectionPending = true;
    this.initialized = false;
    this.error = undefined;
  }

  private async fetchScopeGroups(page: number): Promise<{
    entries: Array<{ scope: DriveNodeScope; groupName?: string }>;
    hasMore: boolean;
  }> {
    const result = await getGroupService().fetchGroupList({
      groupRoleFilter: 'ALL',
      page,
      size: GROUP_SCOPE_PAGE_SIZE,
    });
    const excluded = new Set(this.request.excludedGroupIds ?? []);
    const scopeMode = this.request.scopeMode ?? 'single';
    return {
      entries: [
        ...(page === 1 && scopeMode === 'all' ? [{ scope: buildDriveNodeScope() }] : []),
        ...result.groups
          .filter((group) => !excluded.has(group.groupId))
          .map((group) => ({
            scope: buildDriveNodeScope(group.groupId),
            groupName: group.groupName,
          })),
      ],
      hasMore: result.hasMore,
    };
  }

  private getRoot(scope: DriveNodeScope): Promise<RootNode> {
    return getDriveService().getRoot({
      rootId: scope.rootId,
      groupId: scope.type === 'group' ? scope.groupId : undefined,
    });
  }

  private addNodes(nodes: readonly DriveNode[]): void {
    nodes.forEach((node) => {
      this.nodeByKey.set(buildDriveNodeKey(node.scope, node.id), node);
    });
  }

  private applyInitialSelection(): void {
    if (!this.initialSelectionPending) return;
    const initialIds = new Set(this.request.initialSelectedIds ?? []);
    if (initialIds.size === 0) {
      this.initialSelectionPending = false;
      return;
    }
    const matchedKeys = this.normalizeSelectableKeys(
      [...this.nodeByKey.entries()]
        .filter(([, node]) =>
          node.type === 'resource' || node.type === 'link'
            ? initialIds.has(node.resourceId) || initialIds.has(node.id)
            : initialIds.has(node.id)
        )
        .map(([nodeKey]) => nodeKey)
    );
    if (matchedKeys.length === 0) return;
    this.selectedKeys = new Set(
      this.request.multiple
        ? [...this.selectedKeys, ...matchedKeys]
        : this.selectedKeys.size > 0
          ? this.selectedKeys
          : [matchedKeys[0]!]
    );
  }

  private normalizeSelectableKeys(
    keys: readonly string[],
    isNodeSelectable?: (node: DriveNode) => boolean,
    isNodeDisabled?: (node: DriveNode) => boolean
  ): string[] {
    const disabledIds = new Set(this.request.disabledNodeIds ?? []);
    const selectableTypes = new Set(
      this.request.selectableTypes ?? ['root', 'folder', 'resource', 'link']
    );
    return keys
      .map((key) => this.resolveInputKey(key))
      .filter((key): key is string => {
        if (!key) return false;
        const node = this.nodeByKey.get(key);
        return Boolean(
          node &&
          selectableTypes.has(node.type) &&
          !disabledIds.has(node.id) &&
          isNodeDisabled?.(node) !== true &&
          (isNodeSelectable?.(node) ?? true)
        );
      });
  }

  private resolveInputKey(key: string): string | undefined {
    if (this.nodeByKey.has(key)) return key;
    for (const [nodeKey, node] of this.nodeByKey) {
      if (node.id === key) return nodeKey;
      if ((node.type === 'resource' || node.type === 'link') && node.resourceId === key) {
        return nodeKey;
      }
    }
    return undefined;
  }

  private getSelectedNodes(): DriveNode[] {
    return [...this.selectedKeys]
      .map((key) => this.nodeByKey.get(key))
      .filter((node): node is DriveNode => Boolean(node));
  }

  private persistExpandedKeys(scope: DriveNodeScope): void {
    const nodeIds = [...this.expandedKeys]
      .filter((nodeKey) => isDriveNodeKeyInScope(nodeKey, scope.rootId))
      .map(getDriveNodeIdFromKey);
    setDriveExpandedNodeIds(scope.rootId, nodeIds);
  }

  private requireContainer(nodeKey: string): DriveContainerNode {
    const node = this.nodeByKey.get(nodeKey);
    if (!isDriveContainer(node)) {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_NOT_FOUND, {
        nodeId: nodeKey,
      });
    }
    return node;
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
    const currentNode = this.currentNodeKey ? this.nodeByKey.get(this.currentNodeKey) : undefined;
    return {
      key: this.key,
      request: this.request,
      scopeEntries: [...this.scopeEntries],
      primaryRootKey: this.primaryRootKey,
      currentNodeKey: this.currentNodeKey,
      currentNode: isDriveContainer(currentNode) ? currentNode : null,
      pathNodeKeys: [...this.pathNodeKeys],
      nodeByKey: new Map(this.nodeByKey),
      childrenByKey: new Map(this.childrenByKey),
      pageByKey: new Map(this.pageByKey),
      expandedKeys: new Set(this.expandedKeys),
      selectedKeys: new Set(this.selectedKeys),
      checkedKeys: new Set(this.checkedKeys),
      draggingKeys: new Set(this.draggingKeys),
      activeDragKey: this.activeDragKey,
      loadingKeys: new Set(this.loadingKeys),
      loadingMoreKeys: new Set(this.loadingMoreKeys),
      loading: this.loading,
      loadingMoreScopes: this.loadingMoreScopes,
      hasMoreScopes: this.hasMoreScopes,
      initialized: this.initialized,
      detailPanelCollapsed: this.detailPanelCollapsed,
      error: this.error,
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
