export interface DissolveGroupModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  groupId: string;
  groupName: string;
}
