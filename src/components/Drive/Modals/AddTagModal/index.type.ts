import type { MoveToFolderTarget } from '../types';

export interface AddTagModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess?: () => void;
  /** 要为哪个资源添加标签，仅 type 为 file 时可用（folder 无 resourceId） */
  target: MoveToFolderTarget | null;
}
