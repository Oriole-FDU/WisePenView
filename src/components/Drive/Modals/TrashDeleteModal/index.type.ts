import type { DriveActionTarget } from '../../common/driveComponentModel';

export interface TrashDeleteModalProps {
  isOpen: boolean;
  node: DriveActionTarget | null;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}
