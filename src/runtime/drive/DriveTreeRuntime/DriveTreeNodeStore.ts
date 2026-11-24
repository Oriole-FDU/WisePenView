import type { DriveContainerNode, DriveNode, DriveNodeScope, RootNode } from '@/domains/Drive';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

import { buildDriveNodeKey, type DriveTreePageState } from '../model/DriveTreeState';
import { isDriveContainer } from './driveTreeModel';
import type { DriveTreeScopeEntry, DriveTreeSnapshot } from './index.type';

type DriveTreeNodeSnapshot = Pick<
  DriveTreeSnapshot,
  | 'scopeEntries'
  | 'currentNodeKey'
  | 'currentNode'
  | 'pathNodeKeys'
  | 'nodeByKey'
  | 'childrenByKey'
  | 'pageByKey'
>;

export class DriveTreeNodeStore {
  private scopeEntries: DriveTreeScopeEntry[] = [];
  private currentNodeKey: string | null = null;
  private pathNodeKeys: string[] = [];
  private nodeByKey = new Map<string, DriveNode>();
  private childrenByKey = new Map<string, readonly DriveNode[]>();
  private pageByKey = new Map<string, DriveTreePageState>();

  get currentKey(): string | null {
    return this.currentNodeKey;
  }

  get scopeEntryList(): readonly DriveTreeScopeEntry[] {
    return this.scopeEntries;
  }

  getLoadedScopes(): DriveNodeScope[] {
    return this.scopeEntries.filter((entry) => entry.root !== null).map((entry) => entry.scope);
  }

  listNodes(): IterableIterator<[string, DriveNode]> {
    return this.nodeByKey.entries();
  }

  getNode(nodeKey: string): DriveNode | undefined {
    return this.nodeByKey.get(nodeKey);
  }

  getChildren(nodeKey: string): readonly DriveNode[] | undefined {
    return this.childrenByKey.get(nodeKey);
  }

  hasChildren(nodeKey: string): boolean {
    return this.childrenByKey.has(nodeKey);
  }

  getPage(nodeKey: string): DriveTreePageState | undefined {
    return this.pageByKey.get(nodeKey);
  }

  addNodes(nodes: readonly DriveNode[]): void {
    nodes.forEach((node) => {
      this.nodeByKey.set(buildDriveNodeKey(node.scope, node.id), node);
    });
  }

  setScopeEntries(entries: readonly DriveTreeScopeEntry[]): void {
    this.scopeEntries = [...entries];
  }

  appendScopeEntries(entries: readonly DriveTreeScopeEntry[]): void {
    this.scopeEntries = [...this.scopeEntries, ...entries];
  }

  updateScopeEntry(scope: DriveNodeScope, root: RootNode): void {
    const rootKey = buildDriveNodeKey(scope, root.id);
    const entryIndex = this.scopeEntries.findIndex((entry) => entry.scope.rootId === scope.rootId);
    if (entryIndex < 0) {
      this.scopeEntries = [...this.scopeEntries, { scope, rootKey, root }];
      return;
    }
    this.scopeEntries = this.scopeEntries.with(entryIndex, {
      ...this.scopeEntries[entryIndex]!,
      rootKey,
      root,
    });
  }

  setCurrentRoot(scope: DriveNodeScope): void {
    this.currentNodeKey = buildDriveNodeKey(scope, scope.rootId);
    this.pathNodeKeys = [this.currentNodeKey];
  }

  setCurrentPath(pathNodes: readonly DriveNode[]): void {
    this.addNodes(pathNodes);
    this.pathNodeKeys = pathNodes.map((node) => buildDriveNodeKey(node.scope, node.id));
    this.currentNodeKey = this.pathNodeKeys.at(-1) ?? null;
  }

  replaceChildren(
    parentKey: string,
    children: readonly DriveNode[],
    page: DriveTreePageState
  ): void {
    this.addNodes(children);
    this.childrenByKey = new Map(this.childrenByKey).set(parentKey, children);
    this.pageByKey = new Map(this.pageByKey).set(parentKey, page);
  }

  appendChildren(
    parentKey: string,
    children: readonly DriveNode[],
    page: DriveTreePageState
  ): void {
    this.replaceChildren(
      parentKey,
      [...(this.childrenByKey.get(parentKey) ?? []), ...children],
      page
    );
  }

  requireContainer(nodeKey: string): DriveContainerNode {
    const node = this.nodeByKey.get(nodeKey);
    if (!isDriveContainer(node)) {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_NOT_FOUND, {
        nodeId: nodeKey,
      });
    }
    return node;
  }

  reset(): void {
    this.scopeEntries = [];
    this.currentNodeKey = null;
    this.pathNodeKeys = [];
    this.nodeByKey = new Map();
    this.childrenByKey = new Map();
    this.pageByKey = new Map();
  }

  buildSnapshot(): DriveTreeNodeSnapshot {
    const currentNode = this.currentNodeKey ? this.nodeByKey.get(this.currentNodeKey) : undefined;
    return {
      scopeEntries: [...this.scopeEntries],
      currentNodeKey: this.currentNodeKey,
      currentNode: isDriveContainer(currentNode) ? currentNode : null,
      pathNodeKeys: [...this.pathNodeKeys],
      nodeByKey: new Map(this.nodeByKey),
      childrenByKey: new Map(this.childrenByKey),
      pageByKey: new Map(this.pageByKey),
    };
  }
}
