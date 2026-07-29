export interface UploadDocumentModalProps {
  isOpen: boolean;
  pathTagId: string;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}
