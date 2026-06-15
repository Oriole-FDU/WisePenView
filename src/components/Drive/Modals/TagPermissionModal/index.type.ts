export interface TagPermissionModalProps {
  isOpen: boolean;
  groupId?: string;
  initialTagId?: string;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}
