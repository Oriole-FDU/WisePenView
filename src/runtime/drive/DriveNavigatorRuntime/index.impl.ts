import { getGroupService } from '@/domains';
import { buildDriveNodeScope, type DriveNode, type DriveNodeScope } from '@/domains/Drive';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

import type { DriveTreeRuntime } from '../DriveTreeRuntime/index.type';
import { getDriveRuntime } from '../getDriveRuntime';
import {
  DRIVE_TREE_MODE,
  DRIVE_TREE_SURFACE,
  type DriveTreeSnapshot,
} from '../model/DriveTreeState';
import type {
  DriveNavigatorRequest,
  DriveNavigatorRuntime as DriveNavigatorRuntimeContract,
  DriveNavigatorScopeEntry,
  DriveNavigatorSelectOptions,
  DriveNavigatorSnapshot,
} from './index.type';

const GROUP_SCOPE_PAGE_SIZE = 20;
const TREE_KEY_SEPARATOR = '\u001f';

export const buildDriveNavigatorTreeKey = (scope: DriveNodeScope, nodeId: string): string =>
  `${scope.rootId}${TREE_KEY_SEPARATOR}${nodeId}`;

export const buildNavigatorRuntimeKey = (request: DriveNavigatorRequest): string =>
  [
    request.scopeMode,
    request.scope.rootId,
    request.resourceType?.trim().toLowerCase() ?? '',
    request.pageSize,
    request.multiple ? 'multiple' : 'single',
    request.renderableTypes.toSorted().join(','),
    request.selectableTypes.toSorted().join(','),
    [...(request.excludedGroupIds ?? [])].toSorted().join(','),
    [...(request.initialSelectedIds ?? [])].toSorted().join(','),
    [...(request.disabledNodeIds ?? [])].toSorted().join(','),
    request.refreshTrigger ?? '',
  ].join('|');

type AttachedTree = {
  runtime: DriveTreeRuntime;
  unsubscribe: () => void;
};

export class DriveNavigatorRuntime implements DriveNavigatorRuntimeContract {
  readonly key: string;
  readonly request: DriveNavigatorRequest;

  private readonly listeners = new Set<(snapshot: DriveNavigatorSnapshot) => void>();
  private readonly attachedTrees = new Map<string, AttachedTree>();
  private scopeEntries: DriveNavigatorScopeEntry[] = [];
  private selectedTreeKeys = new Set<string>();
  private expandedTreeKeys = new Set<string>();
  private loading = false;
  private loadingMoreScopes = false;
  private hasMoreScopes = false;
  private initialized = false;
  private initialSelectionPending = true;
  private scopePage = 0;
  private disposed = false;
  private error: unknown;
  private cachedSnapshot: DriveNavigatorSnapshot;

  constructor(request: DriveNavigatorRequest) {
    this.request = request;
    this.key = buildNavigatorRuntimeKey(request);
    this.cachedSnapshot = this.buildSnapshot();
  }

  getSnapshot(): DriveNavigatorSnapshot {
    return this.cachedSnapshot;
  }

  subscribe(listener: (snapshot: DriveNavigatorSnapshot) => void): () => void {
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
    this.attachedTrees.forEach(({ unsubscribe }) => unsubscribe());
    this.attachedTrees.clear();
  }

  async initialize(): Promise<void> {
    this.assertAlive();
    this.reset();
    this.loading = true;
    this.error = undefined;
    this.emit();
    try {
      if (this.request.scopeMode === 'single') {
        await this.attachScope(this.request.scope);
        const root = this.scopeEntries[0]?.root;
        if (root) {
          this.expandedTreeKeys = new Set([
            buildDriveNavigatorTreeKey(this.request.scope, root.id),
          ]);
        }
      } else {
        const groups = await this.fetchScopeGroups(1);
        this.scopePage = 1;
        this.hasMoreScopes = groups.hasMore;
        this.scopeEntries = groups.entries.map(({ scope: entryScope, groupName }) => ({
          scope: entryScope,
          groupName,
          root: null,
        }));
        this.emit();
        await Promise.all(
          groups.entries.map(({ scope, groupName }) => this.attachScope(scope, groupName))
        );
      }
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

  refresh(): Promise<void> {
    return this.initialize();
  }

  async loadMoreScopes(): Promise<void> {
    this.assertAlive();
    if (this.loadingMoreScopes || !this.hasMoreScopes || this.request.scopeMode === 'single') {
      return;
    }
    this.loadingMoreScopes = true;
    this.emit();
    try {
      const nextPage = this.scopePage + 1;
      const groups = await this.fetchScopeGroups(nextPage);
      this.scopeEntries = [
        ...this.scopeEntries,
        ...groups.entries.map(({ scope: entryScope, groupName }) => ({
          scope: entryScope,
          groupName,
          root: null,
        })),
      ];
      await Promise.all(
        groups.entries.map(({ scope, groupName }) => this.attachScope(scope, groupName))
      );
      this.scopePage = nextPage;
      this.hasMoreScopes = groups.hasMore;
      this.error = undefined;
    } catch (error) {
      this.error = error;
      throw error;
    } finally {
      this.loadingMoreScopes = false;
      this.emit();
    }
  }

  async loadChildren(treeKey: string): Promise<void> {
    this.assertAlive();
    const node = this.findNode(treeKey);
    const tree = node ? this.attachedTrees.get(node.scope.rootId)?.runtime : undefined;
    if (tree && node && (node.type === 'root' || node.type === 'folder')) {
      await tree.loadChildren(node);
      await tree.expandNode(node.id);
    }
  }

  async loadMore(treeKey: string): Promise<void> {
    this.assertAlive();
    const node = this.findNode(treeKey);
    const tree = node ? this.attachedTrees.get(node.scope.rootId)?.runtime : undefined;
    if (tree && node) {
      await tree.loadMore(node.id);
    }
  }

  setExpandedKeys(keys: readonly string[]): void {
    this.expandedTreeKeys = new Set(keys);
    this.attachedTrees.forEach(({ runtime }, rootId) => {
      const expandedNodeIds = keys
        .filter((key) => key.startsWith(`${rootId}${TREE_KEY_SEPARATOR}`))
        .map((key) => key.slice(rootId.length + TREE_KEY_SEPARATOR.length));
      runtime.setExpandedNodeIds(expandedNodeIds);
    });
    this.emit();
  }

  select({
    keys,
    clickedKey,
    clickedSelected,
    isNodeSelectable,
    isNodeDisabled,
  }: DriveNavigatorSelectOptions): DriveNode[] {
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
    this.selectedTreeKeys = new Set(nextKeys);
    this.emit();
    return this.getSelectedNodes();
  }

  findNode(treeKey: string): DriveNode | undefined {
    return this.buildNodeByTreeKey().get(treeKey);
  }

  private async attachScope(scope: DriveNodeScope, groupName?: string): Promise<void> {
    if (this.attachedTrees.has(scope.rootId)) return;
    const driveRuntime = getDriveRuntime();
    const root = await driveRuntime.getRoot({
      rootId: scope.rootId,
      groupId: scope.type === 'group' ? scope.groupId : undefined,
    });
    const runtime = driveRuntime.acquireTree({
      scope,
      surface: DRIVE_TREE_SURFACE.navigator,
      mode: DRIVE_TREE_MODE.select,
      load: {
        pageSize: this.request.pageSize,
        resourceType: this.request.resourceType,
        kinds: this.request.showResources ? ['folder', 'resource', 'link'] : ['folder'],
      },
    });
    const unsubscribe = runtime.subscribe(() => {
      this.applyInitialSelection();
      this.emit();
    });
    this.attachedTrees.set(scope.rootId, { runtime, unsubscribe });
    const entry = {
      scope,
      groupName,
      root,
    };
    const entryIndex = this.scopeEntries.findIndex(
      (candidate) => candidate.scope.rootId === scope.rootId
    );
    this.scopeEntries =
      entryIndex >= 0
        ? this.scopeEntries.with(entryIndex, entry)
        : [
            ...this.scopeEntries,
            {
              ...entry,
            },
          ];
    this.emit();
    await runtime.focus(root.id);
    if (this.request.scopeMode === 'single') {
      await runtime.expandNode(root.id);
    }
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
    return {
      entries: [
        ...(page === 1 && this.request.scopeMode === 'all' ? [{ scope: this.request.scope }] : []),
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

  private reset(): void {
    this.attachedTrees.forEach(({ unsubscribe }) => unsubscribe());
    this.attachedTrees.clear();
    this.scopeEntries = [];
    this.selectedTreeKeys = new Set();
    this.expandedTreeKeys = new Set();
    this.scopePage = 0;
    this.hasMoreScopes = false;
    this.initialSelectionPending = true;
    this.error = undefined;
  }

  private applyInitialSelection(): void {
    if (!this.initialSelectionPending) return;
    const initialIds = new Set(this.request.initialSelectedIds ?? []);
    if (initialIds.size === 0) return;
    const matchedKeys = this.normalizeSelectableKeys(
      [...this.buildNodeByTreeKey().entries()]
        .filter(([, node]) =>
          node.type === 'resource' || node.type === 'link'
            ? initialIds.has(node.resourceId) || initialIds.has(node.id)
            : initialIds.has(node.id)
        )
        .map(([treeKey]) => treeKey)
    );
    if (matchedKeys.length === 0) return;
    this.selectedTreeKeys = new Set(
      this.request.multiple
        ? [...this.selectedTreeKeys, ...matchedKeys]
        : this.selectedTreeKeys.size > 0
          ? this.selectedTreeKeys
          : [matchedKeys[0]!]
    );
  }

  private normalizeSelectableKeys(
    keys: readonly string[],
    isNodeSelectable?: (node: DriveNode) => boolean,
    isNodeDisabled?: (node: DriveNode) => boolean
  ): string[] {
    const nodeByTreeKey = this.buildNodeByTreeKey();
    const disabledIds = new Set(this.request.disabledNodeIds ?? []);
    return keys
      .map((key) => this.resolveInputKey(key, nodeByTreeKey))
      .filter((key): key is string => {
        if (!key) return false;
        const node = nodeByTreeKey.get(key);
        return Boolean(
          node &&
          this.request.selectableTypes.includes(node.type) &&
          !disabledIds.has(node.id) &&
          isNodeDisabled?.(node) !== true &&
          (isNodeSelectable?.(node) ?? true)
        );
      });
  }

  private resolveInputKey(
    key: string,
    nodeByTreeKey: ReadonlyMap<string, DriveNode>
  ): string | undefined {
    if (nodeByTreeKey.has(key)) return key;
    for (const [treeKey, node] of nodeByTreeKey) {
      if (node.id === key) return treeKey;
      if ((node.type === 'resource' || node.type === 'link') && node.resourceId === key) {
        return treeKey;
      }
    }
    return undefined;
  }

  private getSelectedNodes(): DriveNode[] {
    const nodeByTreeKey = this.buildNodeByTreeKey();
    return [...this.selectedTreeKeys]
      .map((key) => nodeByTreeKey.get(key))
      .filter((node): node is DriveNode => Boolean(node));
  }

  private buildTreeSnapshots(): Map<string, DriveTreeSnapshot> {
    const snapshots = new Map<string, DriveTreeSnapshot>();
    this.attachedTrees.forEach(({ runtime }, rootId) => {
      snapshots.set(rootId, runtime.getSnapshot());
    });
    return snapshots;
  }

  private buildNodeByTreeKey(): Map<string, DriveNode> {
    const result = new Map<string, DriveNode>();
    this.attachedTrees.forEach(({ runtime }) => {
      const snapshot = runtime.getSnapshot();
      snapshot.nodeById.forEach((node) => {
        result.set(buildDriveNavigatorTreeKey(node.scope, node.id), node);
      });
    });
    return result;
  }

  private buildSnapshot(): DriveNavigatorSnapshot {
    return {
      key: this.key,
      scopeEntries: this.scopeEntries,
      treeSnapshots: this.buildTreeSnapshots(),
      nodeByTreeKey: this.buildNodeByTreeKey(),
      selectedTreeKeys: this.selectedTreeKeys,
      expandedTreeKeys: this.expandedTreeKeys,
      loading: this.loading,
      loadingMoreScopes: this.loadingMoreScopes,
      hasMoreScopes: this.hasMoreScopes,
      initialized: this.initialized,
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
      reason: 'DriveNavigatorRuntime 已销毁',
    });
  }
}
