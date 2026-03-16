import type { Folder } from '@/types/folder';

export interface RenameFolderModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess?: () => void;
  folder: Folder | null;
}
