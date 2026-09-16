import type { ReactNode } from 'react';

import type { DriveNode } from '@/domains/Drive';

import type { DriveItemKind, DriveScope, DriveSelectionItem } from '../common/driveComponentModel';

export type DriveNavigatorScopeMode = 'single' | 'all' | 'public';

export interface DriveNavigatorProps {
  rootId?: string;
  scope?: DriveScope;
  groupId?: string;
  scopeMode?: DriveNavigatorScopeMode;
  /** 多 scope 模式下不展示的组 ID。 */
  excludedGroupIds?: string[];
  /** 仅加载指定资源类型，使用 Resource 列表接口的 resourceType 语义。 */
  resourceType?: string;
  renderableTypes?: DriveItemKind[];
  selectableTypes?: DriveItemKind[];
  /** 资源仅作辅助展示时，每个目录最多加载的 resource/link 数量。 */
  resourcePreviewLimit?: number;
  /** 树为空时显示的空态文案。 */
  emptyText?: ReactNode;
  /** 禁用树的选择、展开和懒加载交互。 */
  disabled?: boolean;
  /** 不可选节点是否展示为置灰禁用态。 */
  dimUnselectableNodes?: boolean;
  disabledNodeIds?: string[];
  multiple?: boolean;
  initialSelectedIds?: string[];
  refreshTrigger?: number;
  isNodeSelectable?: (node: DriveNode) => boolean;
  isNodeDisabled?: (node: DriveNode) => boolean;
  onChange?: (selected: DriveSelectionItem[]) => void;
  onNodeChange?: (selected: DriveNode[]) => void;
}
