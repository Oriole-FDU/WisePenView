import type { DriveViewNode } from '../../../_common/driveComponentModel';

export interface DriveNavigatorNodeTitleProps {
  node: DriveViewNode;
  displayName?: string;
  onLoadMore?: () => void;
}
