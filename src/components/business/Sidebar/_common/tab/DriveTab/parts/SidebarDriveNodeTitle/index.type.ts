import type { ReactNode } from 'react';

import type {
  DriveActionTarget,
  DriveViewNode,
} from '@/components/business/Drive/common/driveComponentModel';
import type { FolderNode, RootNode } from '@/domains/Drive';

export type SidebarDriveCreateAction =
  'folder' | 'note' | 'importNote' | 'drawio' | 'skill' | 'agent' | 'upload';

export interface SidebarDriveNodeTitleProps {
  node: DriveViewNode;
  rootDisplayName?: string;
  scopeSwitcher?: ReactNode;
  onCreateNode: (node: RootNode | FolderNode, action: SidebarDriveCreateAction) => void;
  onCollapseAll?: () => void;
  onLoadMoreNode?: () => void;
  onRenameNode: (node: DriveActionTarget) => void;
  onDeleteNode: (node: DriveActionTarget) => void;
}
