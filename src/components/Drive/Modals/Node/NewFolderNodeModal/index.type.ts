export interface NewFolderNodeModalProps {
  isOpen: boolean;
  parentId: string;
  groupId?: string;
  parentLabel?: string;
  existingFolderNames?: string[];
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}
