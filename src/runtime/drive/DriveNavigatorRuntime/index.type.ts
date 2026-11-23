import type { DriveNode, DriveNodeScope, RootNode } from '@/domains/Drive';

import type { DriveTreeSnapshot } from '../model/DriveTreeState';

export type DriveNavigatorScopeMode = 'single' | 'all' | 'public';

export interface DriveNavigatorRequest {
  scope: DriveNodeScope;
  scopeMode: DriveNavigatorScopeMode;
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

export interface DriveNavigatorScopeEntry {
  scope: DriveNodeScope;
  groupName?: string;
  root: RootNode | null;
}

export interface DriveNavigatorSnapshot {
  readonly key: string;
  readonly scopeEntries: readonly DriveNavigatorScopeEntry[];
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

export type DriveNavigatorNodeSelectability = {
  isNodeSelectable?: (node: DriveNode) => boolean;
  isNodeDisabled?: (node: DriveNode) => boolean;
};

export interface DriveNavigatorSelectOptions extends DriveNavigatorNodeSelectability {
  keys: readonly string[];
  clickedKey?: string;
  clickedSelected?: boolean;
}

export interface DriveNavigatorRuntime {
  readonly key: string;
  readonly request: DriveNavigatorRequest;

  getSnapshot(): DriveNavigatorSnapshot;
  subscribe(listener: (snapshot: DriveNavigatorSnapshot) => void): () => void;
  hasSubscribers(): boolean;
  dispose(): void;

  initialize(): Promise<void>;
  refresh(): Promise<void>;
  loadMoreScopes(): Promise<void>;
  loadChildren(treeKey: string): Promise<void>;
  loadMore(treeKey: string): Promise<void>;

  setExpandedKeys(keys: readonly string[]): void;
  select(options: DriveNavigatorSelectOptions): DriveNode[];
  findNode(treeKey: string): DriveNode | undefined;
}
