import type { DriveNode, DriveNodeScope, RootNode } from '@/domains/Drive';

import type { DriveTreeSnapshot } from '../model/DriveTreeState';

export type DriveForestScopeMode = 'single' | 'all' | 'public';

export interface DriveForestRequest {
  scope: DriveNodeScope;
  scopeMode: DriveForestScopeMode;
  excludedGroupIds?: readonly string[];
  resourceType?: string;
  renderableTypes: readonly ('root' | 'folder' | 'resource' | 'link')[];
  selectableTypes: readonly ('root' | 'folder' | 'resource' | 'link')[];
  showResources: boolean;
  pageSize: number;
  multiple: boolean;
  initialSelectedIds?: readonly string[];
  disabledNodeIds?: readonly string[];
  refreshTrigger?: number | string;
}

export interface DriveForestScopeEntry {
  scope: DriveNodeScope;
  groupName?: string;
  root: RootNode | null;
}

export interface DriveForestSnapshot {
  readonly key: string;
  readonly scopeEntries: readonly DriveForestScopeEntry[];
  readonly treeSnapshots: ReadonlyMap<string, DriveTreeSnapshot>;
  readonly nodeByTreeKey: ReadonlyMap<string, DriveNode>;
  readonly selectedTreeKeys: ReadonlySet<string>;
  readonly expandedTreeKeys: ReadonlySet<string>;
  readonly loading: boolean;
  readonly loadingMoreScopes: boolean;
  readonly hasMoreScopes: boolean;
  readonly initialized: boolean;
  readonly error: unknown;
}

export type DriveForestNodeSelectability = {
  isNodeSelectable?: (node: DriveNode) => boolean;
  isNodeDisabled?: (node: DriveNode) => boolean;
};

export interface DriveForestSelectOptions extends DriveForestNodeSelectability {
  keys: readonly string[];
  clickedKey?: string;
  clickedSelected?: boolean;
}

export interface DriveForestRuntime {
  readonly key: string;
  readonly request: DriveForestRequest;

  getSnapshot(): DriveForestSnapshot;
  subscribe(listener: (snapshot: DriveForestSnapshot) => void): () => void;
  hasSubscribers(): boolean;
  dispose(): void;

  initialize(): Promise<void>;
  refresh(): Promise<void>;
  loadMoreScopes(): Promise<void>;
  loadChildren(treeKey: string): Promise<void>;
  loadMore(treeKey: string): Promise<void>;

  setExpandedKeys(keys: readonly string[]): void;
  select(options: DriveForestSelectOptions): DriveNode[];
  findNode(treeKey: string): DriveNode | undefined;
}
