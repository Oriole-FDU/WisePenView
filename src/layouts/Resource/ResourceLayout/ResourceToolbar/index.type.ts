import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import type { AppBreadcrumbItem } from '@/components/base/AppBreadcrumb';
import type {
  ResourceAction,
  ResourceIconType,
  ResourceItem,
  ResourcePermissionResourceType,
} from '@/domains/Resource';

export interface ResourceToolbarDownloadAction {
  label: string;
  onAction: () => void;
}

export interface ResourceToolbarMoreAction {
  id: string;
  label: string;
  icon: LucideIcon;
  onAction(): void;
}

export interface ResourceToolbarMoreMenu {
  advanced?: ReactNode;
  actions?: readonly ResourceToolbarMoreAction[];
  onPrint?: () => void;
  printLabel?: string;
  printIcon?: LucideIcon;
  download?: ResourceToolbarDownloadAction;
  isPending?: boolean;
  /** 全文搜索：点击后由页面自行展示搜索条（非菜单 hover 子面板） */
  onSearch?: () => void;
  /** 是否展示「历史批注」入口 */
  showInlineCommentHistory?: boolean;
  /** 打开历史批注面板 */
  onInlineCommentHistory?: () => void;
}

export interface ResourceToolbarConfig {
  resourceId?: string;
  resourceName: string;
  resourceType?: string;
  resourceIconType?: ResourceIconType;
  resourceInfo?: ResourceItem;
  currentActions?: ResourceAction[] | null;
  copyVersion?: number;
  permissionResourceType: ResourcePermissionResourceType;
  ownerId?: string | null;
  onPermissionSuccess?: () => void;
  isDisabled?: boolean;
  titleMeta?: ReactNode;
  leadingActions?: ReactNode;
  actions?: ReactNode;
  moreMenu?: ResourceToolbarMoreMenu;
  /** 隐藏面包屑导航（笔记编辑页等场景） */
  hideBreadcrumb?: boolean;
}

export interface ResourceToolbarProps extends ResourceToolbarConfig {
  breadcrumbItems: AppBreadcrumbItem[];
  trailingActions?: ReactNode;
}
