import type { DriveNode } from '@/domains/Drive';
import type { DriveItemKind, DriveScope, DriveSelectionItem } from '../common/driveComponentModel';

export type DriveNavigatorScopeMode = 'single' | 'all' | 'groups';

export interface DriveNavigatorProps {
  rootId?: string;
  scope?: DriveScope;
  groupId?: string;
  scopeMode?: DriveNavigatorScopeMode;
  /** 多 scope 模式下不展示的组 ID。 */
  excludedGroupIds?: string[];
  renderableTypes?: DriveItemKind[];
  selectableTypes?: DriveItemKind[];
  /** 资源仅作辅助展示时，每个目录最多加载的 resource/link 数量。 */
  resourcePreviewLimit?: number;
  /** 禁用树的选择、展开和懒加载交互。 */
  disabled?: boolean;
  disabledNodeIds?: string[];
  multiple?: boolean;
  initialSelectedIds?: string[];
  refreshTrigger?: number;
  isNodeSelectable?: (node: DriveNode) => boolean;
  isNodeDisabled?: (node: DriveNode) => boolean;
  onChange?: (selected: DriveSelectionItem[]) => void;
  onNodeChange?: (selected: DriveNode[]) => void;
}
