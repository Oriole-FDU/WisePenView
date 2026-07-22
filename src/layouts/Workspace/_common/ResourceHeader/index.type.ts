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
  /** 全文搜索：点击后由页面自行展示搜索条（非菜单 hover 子面板） */
  onSearch?: () => void;
  /** 是否展示「历史批注」入口 */
  showInlineCommentHistory?: boolean;
  /** 打开历史批注面板 */
  onInlineCommentHistory?: () => void;
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
