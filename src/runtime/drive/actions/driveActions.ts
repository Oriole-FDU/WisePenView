import type { DriveNodeScope } from '@/domains/Drive';

import { createDriveActionContext } from './driveActionContext';
import { createDriveCreateResourceAction } from './driveCreateResourceActions';
import { createDriveDeleteActions } from './driveDeleteActions';
import { createDriveMoveActions } from './driveMoveActions';
import { createDriveNodeActions } from './driveNodeActions';
import type { DriveActions } from './index.type';

export type { DriveActions } from './index.type';

export const createDriveActions = (
  notifyScopeChanged: (scope: DriveNodeScope) => void
): DriveActions => {
  const context = createDriveActionContext(notifyScopeChanged);
  return {
    ...createDriveNodeActions(context),
    ...createDriveMoveActions(context),
    ...createDriveDeleteActions(context),
    ...createDriveCreateResourceAction(context),
  };
};
