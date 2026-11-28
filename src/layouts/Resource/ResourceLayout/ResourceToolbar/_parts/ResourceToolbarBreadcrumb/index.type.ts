import type { ReactNode } from 'react';

import type { AppBreadcrumbItem } from '@/components/base/AppBreadcrumb';
import type { ResourceIconType } from '@/domains/Resource';

export interface ResourceToolbarBreadcrumbProps {
  resourceId?: string;
  resourceName: string;
  resourceType?: string;
  resourceIconType?: ResourceIconType;
  /** 驱动器路径面包屑，最后一项追加当前资源。 */
  breadcrumbItems: AppBreadcrumbItem[];
  /** 隐藏面包屑导航（笔记编辑页等场景），只展示当前资源。 */
  hideBreadcrumb?: boolean;
  titleMeta?: ReactNode;
}
