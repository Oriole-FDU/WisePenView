import type { TagTreeResponse } from '@/services/Tag';

export interface TagInfoFormProps {
  /** 当前选中的标签，为 null 时展示空状态 */
  tag: TagTreeResponse | null;
  /** 小组 ID，编辑小组标签时传入 */
  groupId?: string;
  /** 更新成功后回调，用于刷新树等 */
  onSuccess?: () => void;
}
