import type { DriveContainerNode, DriveNode, DriveNodeChildrenPage } from '@/domains/Drive';

import type { DriveTreePageState } from '../model/DriveTreeState';

export const isDriveContainer = (node: DriveNode | undefined): node is DriveContainerNode =>
  node?.type === 'root' || node?.type === 'folder';

export const toDriveChildren = (page: DriveNodeChildrenPage): DriveNode[] => [
  ...page.folderNodes,
  ...page.resourceNodes,
];

export const toDrivePageState = (page: DriveNodeChildrenPage): DriveTreePageState => ({
  total: page.total,
  hasMore: Boolean(page.nextCursor),
  nextCursor: page.nextCursor,
});
