import type { DriveActionTarget } from '../../../common/driveComponentModel';

export interface RenameNodeModalProps {
  isOpen: boolean;
  node: DriveActionTarget | null;
  groupId?: string;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}
