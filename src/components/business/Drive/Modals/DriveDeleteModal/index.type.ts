import type { DriveActionTarget } from '../../_common/driveComponentModel';

export interface DriveDeleteModalProps {
  isOpen: boolean;
  node: DriveActionTarget | null;
  groupId?: string;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  onError?: () => void;
}
