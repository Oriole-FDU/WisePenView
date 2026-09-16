import type { ReactNode } from 'react';

import type { FolderTableRow } from '@/components/base/Table';

import type { DriveScope, DriveViewNode } from '../common/driveComponentModel';

/** TableDrive 行类型：真实节点或组件分页占位节点，可选挂 children。 */
export type DriveRow = DriveViewNode & { children?: DriveRow[] };

/** FolderTable 展示行：保留原始节点，避免展示字段污染领域模型。 */
export type DriveTableRow = FolderTableRow & {
  node: DriveViewNode;
  children?: DriveTableRow[];
};

export interface TableDriveActionConfig {
  toolbar?: {
    canCreateFolder?: boolean;
    canCreateNote?: boolean;
    canCreateDrawio?: boolean;
    canCreateSkill?: boolean;
    canCreateAgent?: boolean;
    canUploadToGroup?: boolean;
    canManageTagPermission?: boolean;
  };
}

export interface TableDriveProps {
  /** 个人云盘不传；小组云盘传 groupId */
  groupId?: string;
  rootId?: string;
  /** 从路由进入云盘时需要直接打开的目录节点 */
  initialNodeId?: string;
  /** 外层仍在解析初始目录时，先展示云盘骨架并暂停目录请求。 */
  loading?: boolean;
  /** 当前目录由外部导航承载时，通知外部写入新的目录位置。 */
  onCurrentNodeChange?: (nodeId: string) => void;
  /** 路径加载失败时由外层处理，传入后不执行默认 toast 和根目录回退。 */
  onPathError?: (error: unknown) => void;
  scope?: DriveScope;
  /** 面包屑区域由页面提供的附加控件，避免表格依赖具体布局实现。 */
  breadcrumbExtra?: ReactNode;
  actions?: TableDriveActionConfig;
}
