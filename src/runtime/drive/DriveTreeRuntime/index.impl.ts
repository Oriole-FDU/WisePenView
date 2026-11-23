import { getDriveService } from '@/domains';
import type {
  DriveContainerNode,
  DriveNode,
  DriveNodeChildrenPage,
  DriveNodeScope,
  RootNode,
} from '@/domains/Drive';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

import {
  type DriveTreeDataCache,
  getDriveExpandedNodeIds,
  setDriveExpandedNodeIds,
} from '../data/driveTreeCache';
import {
  buildDriveTreeKey,
  type DriveTreePageState,
  type DriveTreeRequest,
  type DriveTreeSnapshot,
} from '../model/DriveTreeState';
import type {
  DriveTreeFocusOptions,
  DriveTreeLoadOptions,
  DriveTreeRuntime as DriveTreeRuntimeContract,
} from './index.type';

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

export class DriveTreeRuntime implements DriveTreeRuntimeContract {
  readonly key: string;
  readonly request: DriveTreeRequest;

  private readonly dataCache: DriveTreeDataCache;
  private readonly listeners = new Set<(snapshot: DriveTreeSnapshot) => void>();
  private readonly scope: DriveNodeScope;
  private references = 0;
  private disposed = false;
  private operationVersion = 0;

  private root: RootNode | null = null;
  private currentNodeId: string;
  private pathNodes: DriveNode[] = [];
  private childrenByParent = new Map<string, DriveNode[]>();
  private pageByParent = new Map<string, DriveTreePageState>();
  private expandedNodeIds: Set<string>;
  private selectedNodeIds = new Set<string>();
  private checkedNodeIds = new Set<string>();
  private draggingNodeIds = new Set<string>();
  private loadingNodeIds = new Set<string>();
  private loadingMoreNodeIds = new Set<string>();
  private loading = false;
  private initialized = false;
  private detailPanelCollapsed = true;
  private error: unknown;

  constructor(request: DriveTreeRequest, dataCache: DriveTreeDataCache) {
    this.request = request;
    this.scope = request.scope;
    this.key = buildDriveTreeKey(request);
    this.dataCache = dataCache;
    this.currentNodeId = request.scope.rootId;
    this.expandedNodeIds = new Set(getDriveExpandedNodeIds(request.scope.rootId));
  }

  getSnapshot(): DriveTreeSnapshot {
    const nodeById = new Map<string, DriveNode>();
    this.pathNodes.forEach((node) => nodeById.set(node.id, node));
    this.childrenByParent.forEach((nodes) => {
      nodes.forEach((node) => nodeById.set(node.id, node));
    });
    if (this.root) nodeById.set(this.root.id, this.root);
    const currentNode = this.pathNodes.at(-1);
    const currentContainer = isDriveContainer(currentNode) ? currentNode : null;

    return {
      key: this.key,
      scope: this.scope,
      surface: this.request.surface,
      mode: this.request.mode,
      currentNodeId: this.currentNodeId,
      root: this.root,
      currentContainer,
      pathNodes: this.pathNodes,
      nodeById,
      childrenByParent: this.childrenByParent,
      pageByParent: this.pageByParent,
      expandedNodeIds: this.expandedNodeIds,
      selectedNodeIds: this.selectedNodeIds,
      checkedNodeIds: this.checkedNodeIds,
      draggingNodeIds: this.draggingNodeIds,
      loadingNodeIds: this.loadingNodeIds,
      loadingMoreNodeIds: this.loadingMoreNodeIds,
      initialized: this.initialized,
      loading: this.loading,
      detailPanelCollapsed: this.detailPanelCollapsed,
      error: this.error,
    };
  }

  subscribe(listener: (snapshot: DriveTreeSnapshot) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  retain(): void {
    this.assertAlive();
    this.references += 1;
  }

  release(): void {
    this.references = Math.max(0, this.references - 1);
  }

  dispose(): void {
    this.disposed = true;
    this.listeners.clear();
    this.draggingNodeIds.clear();
  }

  async focus(nodeId: string, options?: DriveTreeFocusOptions): Promise<void> {
    this.assertAlive();
    const version = ++this.operationVersion;
    this.loading = true;
    this.error = undefined;
    this.emit();

    try {
      const driveService = getDriveService();
      const root = await driveService.getRoot({
        rootId: this.scope.rootId,
        groupId: this.scope.type === 'group' ? this.scope.groupId : undefined,
      });
      const pathNodes =
        nodeId === root.id ? [root] : await driveService.getNodePath({ nodeId, scope: this.scope });
      this.assertCurrent(version);
      const parent = pathNodes.at(-1);
      if (!isDriveContainer(parent)) {
        throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_NOT_FOUND, { nodeId });
      }

      this.root = root;
      this.currentNodeId = parent.id;
      this.pathNodes = pathNodes;
      await this.loadChildrenInternal(parent, {
        refresh: options?.refresh,
        version,
      });
      if (options?.restoreExpanded) {
        await this.restoreExpandedChildren(this.childrenByParent.get(parent.id) ?? [], version);
      }
      this.assertCurrent(version);
      this.initialized = true;
      this.loading = false;
      this.emit();
    } catch (error) {
      if (version === this.operationVersion) {
        this.loading = false;
        this.error = error;
        this.emit();
      }
      throw error;
    }
  }

  async refresh(): Promise<void> {
    await this.focus(this.currentNodeId, {
      refresh: true,
      restoreExpanded: true,
    });
  }

  async loadChildren(parent: DriveContainerNode, options?: DriveTreeLoadOptions): Promise<void> {
    this.assertAlive();
    const version = this.operationVersion;
    await this.loadChildrenInternal(parent, {
      refresh: options?.refresh,
      version,
    });
  }

  async loadMore(parentId: string): Promise<void> {
    this.assertAlive();
    const pageState = this.pageByParent.get(parentId);
    const parent = this.findNode(parentId);
    if (
      !pageState?.nextCursor ||
      !isDriveContainer(parent) ||
      this.loadingMoreNodeIds.has(parentId)
    ) {
      return;
    }

    this.loadingMoreNodeIds = new Set(this.loadingMoreNodeIds).add(parentId);
    this.emit();
    try {
      const result = await this.loadChildrenPage(parent, pageState.nextCursor, false);
      const nextPageState = toDrivePageState(result);
      this.pageByParent = new Map(this.pageByParent).set(parentId, nextPageState);
      this.childrenByParent = new Map(this.childrenByParent).set(parentId, [
        ...(this.childrenByParent.get(parentId) ?? []),
        ...toDriveChildren(result),
      ]);
      this.error = undefined;
    } catch (error) {
      this.error = error;
      throw error;
    } finally {
      this.loadingMoreNodeIds = new Set(
        [...this.loadingMoreNodeIds].filter((nodeId) => nodeId !== parentId)
      );
      this.emit();
    }
  }

  async expandNode(nodeId: string): Promise<void> {
    this.assertAlive();
    const node = this.findNode(nodeId);
    if (!isDriveContainer(node)) return;
    if (!this.childrenByParent.has(node.id)) {
      await this.loadChildren(node);
    }
    this.expandedNodeIds = new Set(this.expandedNodeIds).add(node.id);
    this.persistExpandedNodeIds();
  }

  collapseNode(nodeId: string): void {
    if (!this.expandedNodeIds.has(nodeId)) return;
    this.expandedNodeIds = new Set(
      [...this.expandedNodeIds].filter((expandedNodeId) => expandedNodeId !== nodeId)
    );
    this.persistExpandedNodeIds();
  }

  setExpandedNodeIds(nodeIds: readonly string[]): void {
    this.expandedNodeIds = new Set(nodeIds);
    this.persistExpandedNodeIds();
  }

  collapseAll(): void {
    this.expandedNodeIds = new Set();
    this.persistExpandedNodeIds();
  }

  selectNode(nodeId: string | null): void {
    this.selectedNodeIds = nodeId ? new Set([nodeId]) : new Set();
    this.emit();
  }

  setCheckedNodeIds(nodeIds: Iterable<string>): void {
    this.checkedNodeIds = new Set(nodeIds);
    this.emit();
  }

  clearChecked(): void {
    this.checkedNodeIds = new Set();
    this.emit();
  }

  setDetailPanelCollapsed(collapsed: boolean): void {
    if (this.detailPanelCollapsed === collapsed) return;
    this.detailPanelCollapsed = collapsed;
    this.emit();
  }

  beginDrag(nodeIds: Iterable<string>): void {
    this.draggingNodeIds = new Set(nodeIds);
    this.emit();
  }

  endDrag(): void {
    if (this.draggingNodeIds.size === 0) return;
    this.draggingNodeIds = new Set();
    this.emit();
  }

  findNode(nodeId: string): DriveNode | undefined {
    if (this.root?.id === nodeId) return this.root;
    const pathNode = this.pathNodes.find((node) => node.id === nodeId);
    if (pathNode) return pathNode;
    for (const nodes of this.childrenByParent.values()) {
      const node = nodes.find((candidate) => candidate.id === nodeId);
      if (node) return node;
    }
    return undefined;
  }

  markInvalidated(scopeRootId: string): void {
    if (scopeRootId !== this.scope.rootId || this.disposed) return;
    if (!this.initialized) return;
    void this.refresh().catch(() => undefined);
  }

  private async loadChildrenInternal(
    parent: DriveContainerNode,
    options: {
      refresh?: boolean;
      version: number;
    }
  ): Promise<void> {
    if (!options.refresh && this.childrenByParent.has(parent.id)) return;

    this.loadingNodeIds = new Set(this.loadingNodeIds).add(parent.id);
    if (parent.id === this.currentNodeId) this.loading = true;
    this.emit();
    try {
      const result = await this.loadChildrenPage(parent, undefined, options.refresh);
      this.assertCurrent(options.version);
      this.childrenByParent = new Map(this.childrenByParent).set(
        parent.id,
        toDriveChildren(result)
      );
      this.pageByParent = new Map(this.pageByParent).set(parent.id, toDrivePageState(result));
      this.error = undefined;
    } finally {
      this.loadingNodeIds = new Set(
        [...this.loadingNodeIds].filter((nodeId) => nodeId !== parent.id)
      );
      if (parent.id === this.currentNodeId && options.version === this.operationVersion) {
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
        if (!isDriveContainer(node) || !this.expandedNodeIds.has(node.id)) return;
        await this.loadChildrenInternal(node, { version });
        this.assertCurrent(version);
        await this.restoreExpandedChildren(this.childrenByParent.get(node.id) ?? [], version);
      })
    );
  }

  private async loadChildrenPage(
    parent: DriveContainerNode,
    cursor: string | undefined,
    refresh = false
  ): Promise<DriveNodeChildrenPage> {
    const options = {
      scope: this.scope,
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

  private persistExpandedNodeIds(): void {
    setDriveExpandedNodeIds(this.scope.rootId, [...this.expandedNodeIds]);
    this.emit();
  }

  private assertCurrent(version: number): void {
    this.assertAlive();
    if (version !== this.operationVersion) {
      throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
        reason: 'Drive 树位置已变化',
      });
    }
  }

  private assertAlive(): void {
    if (!this.disposed) return;
    throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
      reason: 'DriveTreeRuntime 已销毁',
    });
  }

  private emit(): void {
    if (this.disposed) return;
    const snapshot = this.getSnapshot();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }
}
