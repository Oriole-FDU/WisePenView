import type { TagTreeNode } from '@/services/Tag';

export interface TagTreeProps {
  /** 小组 ID，不传则展示个人标签树 */
  groupId?: string;
  /** 选中节点回调 */
  onSelect?: (node: TagTreeNode | null) => void;
  /** 当前选中的 tagId，用于受控高亮 */
  selectedKey?: string;
  /** 刷新触发，变更时重新拉取树 */
  refreshTrigger?: number;
  /** 是否可编辑（可拖动调整层级），false 时为纯展示 */
  editable?: boolean;
  /** 是否默认展开所有节点，false 时默认收起 */
  defaultExpandAll?: boolean;
}
