import { createContext, type ReactNode } from 'react';

import type { ResourceChatContext } from '@/components/business/ChatPanel/ResourceChatProtocol';
import type { DriveNodeScope, DriveResourceLocation } from '@/domains/Drive';
import type { ResourceViewer } from '@/domains/Resource/model/resourceTarget';
import type { ResourceHeaderProps } from '@/layouts/Resource/ResourceHeader/index.type';
import type { ResourceWorkspaceHeaderProps } from '@/layouts/Resource/ResourceWorkspaceHeader/index.type';

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
  headerNavigation?: Pick<
    ResourceWorkspaceHeaderProps,
    | 'leftSidebarCollapsed'
    | 'canGoBack'
    | 'canGoForward'
    | 'onGoBack'
    | 'onGoForward'
    | 'onToggleLeftSidebar'
  >;
  fallbackHeader?: ReactNode;
  breadcrumbItems?: ResourceHeaderProps['breadcrumbItems'];
  chatPanelCollapsed: boolean;
  toggleChatPanel: () => void;
  openChatPanel: () => void;
  setChatContext: (context: ResourceChatContext) => void;
  clearChatContext: (context?: ResourceChatContext) => void;
}

export const ResourceHostContext = createContext<ResourceHostContextValue | null>(null);

export const DEFAULT_RESOURCE_HOST_ID = 'default';
