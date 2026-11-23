import type { DriveContainerNode, DriveNode, DriveNodeScope, RootNode } from '@/domains/Drive';

export const DRIVE_TREE_MODE = {
  browse: 'browse',
  select: 'select',
} as const;

export type DriveTreeMode = (typeof DRIVE_TREE_MODE)[keyof typeof DRIVE_TREE_MODE];

export const DRIVE_TREE_SURFACE = {
  browser: 'browser',
  sidebar: 'sidebar',
  navigator: 'navigator',
} as const;

export type DriveTreeSurface = (typeof DRIVE_TREE_SURFACE)[keyof typeof DRIVE_TREE_SURFACE];

export type DriveTreeResourceKind = 'folder' | 'resource' | 'link';

export interface DriveTreeLoadConfig {
  kinds?: readonly DriveTreeResourceKind[];
  resourceType?: string;
  pageSize?: number;
}

export interface DriveTreeRequest {
  scope: DriveNodeScope;
  surface: DriveTreeSurface;
  mode: DriveTreeMode;
  load?: DriveTreeLoadConfig;
}

export interface DriveTreePageState {
  total: number;
  hasMore: boolean;
  nextCursor?: string;
}

export interface DriveTreeSnapshot {
  readonly key: string;
  readonly scope: DriveNodeScope;
  readonly surface: DriveTreeSurface;
  readonly mode: DriveTreeMode;
  readonly currentNodeId: string;
  readonly root: RootNode | null;
  readonly currentContainer: DriveContainerNode | null;
  readonly pathNodes: readonly DriveNode[];
  readonly nodeById: ReadonlyMap<string, DriveNode>;
  readonly childrenByParent: ReadonlyMap<string, readonly DriveNode[]>;
  readonly pageByParent: ReadonlyMap<string, DriveTreePageState>;
  readonly expandedNodeIds: ReadonlySet<string>;
  readonly selectedNodeIds: ReadonlySet<string>;
  readonly checkedNodeIds: ReadonlySet<string>;
  readonly draggingNodeIds: ReadonlySet<string>;
  readonly activeDragNodeId: string | null;
  readonly loadingNodeIds: ReadonlySet<string>;
  readonly loadingMoreNodeIds: ReadonlySet<string>;
  readonly initialized: boolean;
  readonly loading: boolean;
  readonly detailPanelCollapsed: boolean;
  readonly error: unknown;
}

export const buildDriveTreeKey = (request: DriveTreeRequest): string => {
  const kinds = request.load?.kinds?.toSorted().join(',') ?? 'all';
  const resourceType = request.load?.resourceType?.trim().toLowerCase() ?? '';
  const pageSize = request.load?.pageSize ?? '';
  return [request.surface, request.mode, request.scope.rootId, kinds, resourceType, pageSize].join(
    '|'
  );
};

const DRIVE_NAVIGATOR_TREE_KEY_SEPARATOR = '\u001f';

export const buildDriveNavigatorTreeKey = (scope: DriveNodeScope, nodeId: string): string =>
  `${scope.rootId}${DRIVE_NAVIGATOR_TREE_KEY_SEPARATOR}${nodeId}`;
