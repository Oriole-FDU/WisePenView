import type { ReactNode } from 'react';

import type { DriveScope } from '../common/driveComponentModel';

export interface DriveBrowserActionConfig {
  toolbar?: {
    canCreateFolder?: boolean;
    canCreateNote?: boolean;
    canCreateDrawio?: boolean;
    canCreateSkill?: boolean;
    canCreateAgent?: boolean;
    canUploadToGroup?: boolean;
    canManageTagPermission?: boolean;
  };
}

export interface DriveBrowserProps {
  groupId?: string;
  rootId?: string;
  initialNodeId?: string;
  loading?: boolean;
  onCurrentNodeChange?: (nodeId: string) => void;
  onPathError?: (error: unknown) => void;
  scope?: DriveScope;
  breadcrumbExtra?: ReactNode;
  actions?: DriveBrowserActionConfig;
}
