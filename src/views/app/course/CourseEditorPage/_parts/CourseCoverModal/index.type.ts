export interface CourseCoverModalProps {
  isOpen: boolean;
  file: File | null;
  onOpenChange: (open: boolean) => void;
  onFileChange: (file: File | null) => void;
  onConfirm: () => void;
}
