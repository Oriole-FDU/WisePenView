import type { DriveActionTarget } from '../../_common/driveComponentModel';

export interface RenameNodeModalProps {
  isOpen: boolean;
  node: DriveActionTarget | null;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}
