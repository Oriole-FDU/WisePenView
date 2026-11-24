import type { DriveViewNode } from '@/components/business/Drive/common/driveComponentModel';

export interface DriveNavigatorNodeTitleProps {
  node: DriveViewNode;
  displayName?: string;
  onLoadMore?: () => void;
}
