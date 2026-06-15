import type { DriveActionTarget } from '../../../common/driveComponentModel';

export interface MoveNodeModalProps {
  isOpen: boolean;
  node: DriveActionTarget | null;
  rootId: string;
  groupId?: string;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}
