import type { ResourceItem } from '@/types/resource';

export interface EditTagModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess?: () => void;
  file: ResourceItem | null;
  /** 小组 ID，不传则使用个人标签树 */
  groupId?: string;
}
