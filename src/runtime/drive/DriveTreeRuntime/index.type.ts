import type { DriveContainerNode, DriveNode } from '@/domains/Drive';

import type { DriveTreeRequest, DriveTreeSnapshot } from '../model/DriveTreeState';

export interface DriveTreeLoadOptions {
  refresh?: boolean;
}

export interface DriveTreeFocusOptions extends DriveTreeLoadOptions {
  restoreExpanded?: boolean;
}

export interface DriveTreeRuntime {
  readonly key: string;
  readonly request: DriveTreeRequest;

  getSnapshot(): DriveTreeSnapshot;
  subscribe(listener: (snapshot: DriveTreeSnapshot) => void): () => void;
  hasSubscribers(): boolean;

  dispose(): void;

  focus(nodeId: string, options?: DriveTreeFocusOptions): Promise<void>;
  refresh(): Promise<void>;
  loadChildren(parent: DriveContainerNode, options?: DriveTreeLoadOptions): Promise<void>;
  loadMore(parentId: string): Promise<void>;

  expandNode(nodeId: string): Promise<void>;
  collapseNode(nodeId: string): void;
  setExpandedNodeIds(nodeIds: readonly string[]): void;
  collapseAll(): void;

  selectNode(nodeId: string | null): void;
  setCheckedNodeIds(nodeIds: Iterable<string>): void;
  clearChecked(): void;
  setDetailPanelCollapsed(collapsed: boolean): void;

  beginDrag(nodeIds: Iterable<string>, activeNodeId: string): void;
  endDrag(): void;

  findNode(nodeId: string): DriveNode | undefined;
  markInvalidated(scopeRootId: string): void;
}
