export interface ExitGroupModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  groupName: string;
  groupId?: string;
}
