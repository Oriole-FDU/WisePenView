import type { TagTreeResponse } from '@/services/Tag';

export interface TagTreeProps {
  /** 小组 ID，不传则展示个人标签树 */
  groupId?: string;
  /** 选中节点回调 */
  onSelect?: (node: TagTreeResponse | null) => void;
  /** 当前选中的 tagId，用于受控高亮 */
  selectedKey?: string;
  /** 刷新触发，变更时重新拉取树 */
  refreshTrigger?: number;
}
