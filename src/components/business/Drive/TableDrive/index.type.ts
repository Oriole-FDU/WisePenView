import type { FolderTableRow } from '@/components/base/Table';

import type { DriveViewNode } from '../common/driveComponentModel';

/** FolderTable 展示行：保留原始节点，避免展示字段污染领域模型。 */
export type DriveTableRow = FolderTableRow & {
  node: DriveViewNode;
  children?: DriveTableRow[];
};
