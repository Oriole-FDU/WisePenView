import type { ReactNode } from 'react';

import type { AppBreadcrumbItem } from '@/components/base/AppBreadcrumb';
import type { EditorResourcePresentation } from '@/components/editors/editor.type';

export interface ResourceToolbarProps extends EditorResourcePresentation {
  breadcrumbItems: AppBreadcrumbItem[];
  trailingActions?: ReactNode;
}
