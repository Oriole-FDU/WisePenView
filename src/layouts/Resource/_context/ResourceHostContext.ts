import { createContext, type ReactNode } from 'react';

import type { AppBreadcrumbItem } from '@/components/base/AppBreadcrumb';
import type { DriveNodeScope, DriveResourceLocation } from '@/domains/Drive';
import type { ResourceViewer } from '@/domains/Resource/model/resourceTarget';

import type { ResourceChatContext } from './resourceChatModel';

/** 宿主向资源顶栏提供的导航能力；顶栏实现消费它，而不是反过来定义宿主契约。 */
export interface ResourceHeaderNavigation {
  leftSidebarCollapsed?: boolean;
  canGoBack?: boolean;
  canGoForward?: boolean;
  onGoBack?: () => void;
  onGoForward?: () => void;
  onToggleLeftSidebar?: () => void;
}

export interface OpenResourceTarget {
  resourceId: string;
  resourceType?: string;
  resourceName?: string;
  viewer?: string;
  driveLocation?: DriveResourceLocation;
  replace?: boolean;
}

export interface OpenResourceFn {
  (target: OpenResourceTarget): void;
}

export interface ResourceHostRouteContext {
  resourceId?: string;
  resourceType?: string;
  viewer?: string;
  driveLocation?: DriveResourceLocation;
}

export interface ResourceHostDriveNavigationTarget {
  scope: DriveNodeScope;
  nodeId?: string;
}

export interface ResourceHostViewerNavigationTarget {
  resourceId: string;
  viewer: ResourceViewer;
}

export interface ResourceHostContextValue {
  hostId: string;
  routeContext: ResourceHostRouteContext;
  openResource: OpenResourceFn;
  navigateToDrive: (target: ResourceHostDriveNavigationTarget) => void;
  switchResourceViewer: (target: ResourceHostViewerNavigationTarget) => void;
  navigateResourceHash?: (hash: string) => void;
  headerNavigation?: ResourceHeaderNavigation;
  fallbackHeader?: ReactNode;
  breadcrumbItems?: AppBreadcrumbItem[];
  chatPanelCollapsed: boolean;
  toggleChatPanel: () => void;
  openChatPanel: () => void;
  setChatContext: (context: ResourceChatContext) => void;
  clearChatContext: (context?: ResourceChatContext) => void;
}

export const ResourceHostContext = createContext<ResourceHostContextValue | null>(null);

export const DEFAULT_RESOURCE_HOST_ID = 'default';
