import type { DriveNodeScope } from '@/domains/Drive';

import { APP_ROUTE_PATH, buildGroupFilesPath } from './appRoute';

export const DRIVE_UPLOAD_QUEUE_PATH = APP_ROUTE_PATH.DRIVE_UPLOAD_QUEUE;
export const DRIVE_FAVORITES_PATH = APP_ROUTE_PATH.DRIVE_FAVORITES;
export const DRIVE_TRASH_PATH = APP_ROUTE_PATH.DRIVE_TRASH;

export const buildDrivePath = ({
  scope,
  nodeId,
}: {
  scope: DriveNodeScope;
  nodeId?: string;
}): string => {
  if (scope.type === 'group') {
    return buildGroupFilesPath(
      scope.groupId,
      nodeId && nodeId !== scope.rootId ? nodeId : undefined
    );
  }
  return nodeId && nodeId !== scope.rootId
    ? `${APP_ROUTE_PATH.DRIVE_PERSONAL}/folder/${encodeURIComponent(nodeId)}`
    : APP_ROUTE_PATH.DRIVE_PERSONAL;
};

export const buildDriveSystemFolderPath = ({ nodeId }: { nodeId?: string }): string => {
  return nodeId ? `${DRIVE_TRASH_PATH}/folder/${encodeURIComponent(nodeId)}` : DRIVE_TRASH_PATH;
};
