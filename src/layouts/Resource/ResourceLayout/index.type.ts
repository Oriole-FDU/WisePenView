import type { ReactNode } from 'react';

import type { ResourceItem } from '@/domains/Resource';

import type { ResourceHeaderConfig } from './ResourceHeader/index.type';

export interface ResourceSidePanelContent {
  resource: ResourceItem;
  inlineComment?: ReactNode;
  onResourceChanged?: () => unknown | Promise<unknown>;
}

export interface ResourceLayoutProps {
  children: ReactNode;
  className?: string;
  header?: { resource?: ResourceHeaderConfig } | false;
  sidePanel?: ResourceSidePanelContent;
  /** 顶栏右侧扩展动作（如聊天开关），由外部装配，资源布局本身不感知其语义。 */
  headerTrailingActions?: ReactNode;
}
