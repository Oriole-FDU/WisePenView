import type { Folder } from '@/types/folder';

export interface DeleteFolderModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess?: () => void;
  folder: Folder | null;
}
