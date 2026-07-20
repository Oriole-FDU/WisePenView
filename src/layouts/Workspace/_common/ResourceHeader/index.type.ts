import type {
  ResourceAction,
  ResourceIconType,
  ResourcePermissionResourceType,
} from '@/domains/Resource';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export interface ResourceHeaderDownloadAction {
  label: string;
  onAction: () => void;
}

export interface ResourceHeaderMoreAction {
  id: string;
  label: string;
  icon: LucideIcon;
  onAction(): void;
}

export interface ResourceHeaderMoreMenu {
  advanced?: ReactNode;
  actions?: readonly ResourceHeaderMoreAction[];
  onPrint?: () => void;
  download?: ResourceHeaderDownloadAction;
  isPending?: boolean;
  /** 全文搜索：在编辑器中按关键词查找 */
  onSearch?: () => void;
  /** 全文搜索的 Popover 内容（提供后以子菜单形式弹出） */
  searchPopover?: ReactNode;
}

export interface ResourceHeaderBreadcrumbItem {
  nodeId: string;
  label: string;
}

export interface ResourceHeaderConfig {
  resourceId?: string;
  resourceName: string;
  resourceType?: string;
  resourceIconType?: ResourceIconType;
  currentActions?: ResourceAction[] | null;
  copyVersion?: number;
  permissionResourceType: ResourcePermissionResourceType;
  ownerId?: string | null;
  onPermissionSuccess?: () => void;
  isDisabled?: boolean;
  titleMeta?: ReactNode;
  leadingActions?: ReactNode;
  actions?: ReactNode;
  moreMenu?: ResourceHeaderMoreMenu;
  /** 隐藏面包屑导航（笔记编辑页等场景） */
  hideBreadcrumb?: boolean;
}

export interface ResourceHeaderProps extends ResourceHeaderConfig {
  breadcrumbItems: ResourceHeaderBreadcrumbItem[];
  onBreadcrumbNavigate: (nodeId: string) => void;
}
