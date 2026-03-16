import type { MoveToFolderTarget } from '../types';

export interface MoveToFolderModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess?: () => void;
  target: MoveToFolderTarget | null;
}
