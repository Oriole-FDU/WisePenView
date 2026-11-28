export interface PresetRestoreConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}
