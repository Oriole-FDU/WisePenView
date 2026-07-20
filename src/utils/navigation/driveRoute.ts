import { buildDriveNodeScope, type DriveNodeScope } from '@/domains/Drive';

const APP_DRIVE_PATH = '/app/drive';

export interface DriveRouteLocation {
  scope: DriveNodeScope;
  initialNodeId?: string;
}

export const buildDrivePath = ({
  scope,
  nodeId,
}: {
  scope: DriveNodeScope;
  nodeId?: string;
}): string => {
  const search = new URLSearchParams();
  if (nodeId && nodeId !== scope.rootId) {
    search.set('folder', nodeId);
  }
  if (scope.type === 'group') {
    search.set('group', scope.groupId);
  }

  const query = search.toString();
  return query ? `${APP_DRIVE_PATH}?${query}` : APP_DRIVE_PATH;
};

export const parseDriveInitialNodeId = (search: string): string | undefined => {
  return new URLSearchParams(search).get('folder')?.trim() || undefined;
};

export const parseDriveRouteLocation = (search: string): DriveRouteLocation => {
  const params = new URLSearchParams(search);
  const initialNodeId = params.get('folder')?.trim() || undefined;
  const groupId = params.get('group')?.trim() || undefined;

  return {
    scope: buildDriveNodeScope(groupId),
    ...(initialNodeId ? { initialNodeId } : {}),
  };
};
