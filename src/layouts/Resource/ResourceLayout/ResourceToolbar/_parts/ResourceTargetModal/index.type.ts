import type { DriveSelectionItem } from '@/components/business/Drive/_common/driveComponentModel';
import type { DriveNavigatorScopeMode } from '@/components/business/Drive/DriveNavigator/index.type';
import type { DriveContainerNode, DriveNodeScope } from '@/domains/Drive';

export interface ResourceTargetModalProps {
  isOpen: boolean;
  title: string;
  hint: string;
  scopeMode?: DriveNavigatorScopeMode;
  scope: DriveNodeScope;
  excludedGroupIds?: string[];
  submitting: boolean;
  confirmText?: string;
  isTargetSelectable?: (target: DriveSelectionItem) => boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (target: DriveContainerNode) => void;
}
