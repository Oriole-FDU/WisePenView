export interface NotePermissionModalProps {
  isOpen: boolean;
  resourceId: string;
  onOpenChange: (isOpen: boolean) => void;
  onSuccess?: () => void;
}
