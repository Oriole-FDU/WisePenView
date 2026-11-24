import type { DriveNodeScope } from '@/domains/Drive';

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
export type DriveTreeNodeKind = 'root' | DriveTreeResourceKind;

export interface DriveTreeLoadConfig {
  kinds?: readonly DriveTreeResourceKind[];
  resourceType?: string;
  pageSize?: number;
}

export interface DriveTreePageState {
  total: number;
  hasMore: boolean;
  nextCursor?: string;
}

const DRIVE_NODE_KEY_SEPARATOR = '\u001f';

export const buildDriveNodeKey = (scope: DriveNodeScope, nodeId: string): string =>
  `${scope.rootId}${DRIVE_NODE_KEY_SEPARATOR}${nodeId}`;

export const getDriveNodeIdFromKey = (nodeKey: string): string => {
  const separatorIndex = nodeKey.indexOf(DRIVE_NODE_KEY_SEPARATOR);
  return separatorIndex >= 0 ? nodeKey.slice(separatorIndex + 1) : nodeKey;
};

export const isDriveNodeKeyInScope = (nodeKey: string, scopeRootId: string): boolean =>
  nodeKey.startsWith(`${scopeRootId}${DRIVE_NODE_KEY_SEPARATOR}`);
