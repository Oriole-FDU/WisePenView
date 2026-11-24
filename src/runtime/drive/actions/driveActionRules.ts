import type { DriveBatchOperationResult, DriveNodeScope } from '@/domains/Drive';
import { createClientError, type FrontendClientErrorCode } from '@/utils/error';

import type { DriveActionContext } from './driveActionContext';

export const requireDriveScope = <T extends DriveNodeScope['type']>(
  scope: DriveNodeScope,
  type: T,
  errorCode: FrontendClientErrorCode
): Extract<DriveNodeScope, { type: T }> => {
  if (scope.type !== type) {
    throw createClientError(errorCode);
  }
  return scope as Extract<DriveNodeScope, { type: T }>;
};

export const completeDriveBatch = (
  context: DriveActionContext,
  scope: DriveNodeScope,
  requestedCount: number,
  affectedCount: number
): DriveBatchOperationResult => {
  context.notify(scope);
  return { requestedCount, affectedCount };
};

export const completeDriveResourceCreation = (
  context: DriveActionContext,
  scope: DriveNodeScope,
  resourceId: string
): string => {
  context.notify(scope);
  return resourceId;
};
