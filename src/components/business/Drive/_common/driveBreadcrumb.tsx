import { HardDrive } from 'lucide-react';

import type { AppBreadcrumbItem } from '@/components/base/AppBreadcrumb';
import type { DriveNode, DriveNodeScope } from '@/domains/Drive';
import { buildDrivePath } from '@/utils/navigation/driveRoute';

import { getDriveNodeLabel } from './driveComponentModel';

export function buildDriveBreadcrumbItems(
  pathNodes: DriveNode[],
  scope: DriveNodeScope
): AppBreadcrumbItem[] {
  return pathNodes.map((node, index) => ({
    key: node.id,
    label: (
      <>
        {index === 0 ? <HardDrive size={14} aria-hidden="true" /> : null}
        {getDriveNodeLabel(node)}
      </>
    ),
    ...(index < pathNodes.length - 1
      ? { to: buildDrivePath({ scope, nodeId: node.id }) }
      : { current: true }),
  }));
}
