import type { DriveContainerNode, DriveNode, DriveNodeScope, RootNode } from '@/domains/Drive';

import type {
  DriveTreeLoadConfig,
  DriveTreeMode,
  DriveTreeNodeKind,
  DriveTreePageState,
  DriveTreeSurface,
} from '../model/DriveTreeState';

export type DriveTreeScopeMode = 'single' | 'all' | 'public';

export interface DriveTreeRequest {
  scope: DriveNodeScope;
  surface: DriveTreeSurface;
  mode: DriveTreeMode;
  scopeMode?: DriveTreeScopeMode;
  load?: DriveTreeLoadConfig;
  excludedGroupIds?: readonly string[];
  selectableTypes?: readonly DriveTreeNodeKind[];
  multiple?: boolean;
  initialSelectedIds?: readonly string[];
  disabledNodeIds?: readonly string[];
  refreshTrigger?: number | string;
}

export interface DriveTreeScopeEntry {
  scope: DriveNodeScope;
  groupName?: string;
  rootKey: string;
  root: RootNode | null;
}

export interface DriveTreeSnapshot {
  readonly key: string;
  readonly request: DriveTreeRequest;
  readonly scopeEntries: readonly DriveTreeScopeEntry[];
  readonly primaryRootKey: string;
  readonly currentNodeKey: string | null;
  readonly currentNode: DriveContainerNode | null;
  readonly pathNodeKeys: readonly string[];
  readonly nodeByKey: ReadonlyMap<string, DriveNode>;
  readonly childrenByKey: ReadonlyMap<string, readonly DriveNode[]>;
  readonly pageByKey: ReadonlyMap<string, DriveTreePageState>;
  readonly expandedKeys: ReadonlySet<string>;
  readonly selectedKeys: ReadonlySet<string>;
  readonly checkedKeys: ReadonlySet<string>;
  readonly draggingKeys: ReadonlySet<string>;
  readonly activeDragKey: string | null;
  readonly loadingKeys: ReadonlySet<string>;
  readonly loadingMoreKeys: ReadonlySet<string>;
  readonly loading: boolean;
  readonly loadingMoreScopes: boolean;
  readonly hasMoreScopes: boolean;
  readonly initialized: boolean;
  readonly detailPanelCollapsed: boolean;
  readonly error: unknown;
}

export type DriveTreeNodeSelectability = {
  isNodeSelectable?: (node: DriveNode) => boolean;
  isNodeDisabled?: (node: DriveNode) => boolean;
};

export interface DriveTreeSelectOptions extends DriveTreeNodeSelectability {
  keys: readonly string[];
  clickedKey?: string;
  clickedSelected?: boolean;
}

export interface DriveTreeRuntime {
  readonly key: string;
  readonly request: DriveTreeRequest;

  getSnapshot(): DriveTreeSnapshot;
  subscribe(listener: (snapshot: DriveTreeSnapshot) => void): () => void;
  hasSubscribers(): boolean;
  dispose(): void;

  initialize(): Promise<void>;
  focus(nodeId: string): Promise<void>;
  refresh(): Promise<void>;
  loadMoreScopes(): Promise<void>;
  expandNode(nodeKey: string): Promise<void>;
  collapseNode(nodeKey: string): void;
  setExpandedKeys(keys: readonly string[]): void;
  collapseAll(): void;
  loadMore(nodeKey: string): Promise<void>;

  selectNode(nodeKey: string | null): void;
  setCheckedNodeKeys(nodeKeys: Iterable<string>): void;
  clearChecked(): void;
  select(options: DriveTreeSelectOptions): DriveNode[];
  setDetailPanelCollapsed(collapsed: boolean): void;

  beginDrag(nodeKeys: Iterable<string>, activeNodeKey: string): void;
  endDrag(): void;

  findNode(nodeKey: string): DriveNode | undefined;
  markInvalidated(scopeRootId?: string): void;
}
