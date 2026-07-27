import type { FolderTableRow } from '@/components/Table';
import type { DriveNode } from '@/domains/Drive';
import type { ReactNode } from 'react';
import type { DriveScope } from '../common/driveComponentModel';

/** TableDrive 行类型：DriveNode 本身（含 loading 占位节点），可选挂 children */
export type DriveRow = DriveNode & { children?: DriveRow[] };

/** FolderTable 展示行：保留原始 DriveNode，避免 UI 模型污染 service 模型 */
export type DriveTableRow = FolderTableRow & {
  node: DriveNode;
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
  /** 当前目录由外部导航承载时，通知外部写入新的目录位置。 */
  onCurrentNodeChange?: (nodeId: string) => void;
  scope?: DriveScope;
  /** 面包屑区域由页面提供的附加控件，避免表格依赖具体布局实现。 */
  breadcrumbExtra?: ReactNode;
  actions?: TableDriveActionConfig;
}
