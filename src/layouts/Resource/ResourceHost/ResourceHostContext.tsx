import { createContext, type ReactNode, useContext } from 'react';

import type { ResourceChatContext } from '@/components/business/ChatPanel/ResourceChatProtocol';
import type { DriveResourceLocation } from '@/domains/Drive';
import type { ResourceHeaderProps } from '@/layouts/Resource/ResourceHeader/index.type';
import type { ResourceWorkspaceHeaderProps } from '@/layouts/Resource/ResourceWorkspaceHeader/index.type';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

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

export interface ResourceHostContextValue {
  hostId: string;
  routeContext: ResourceHostRouteContext;
  openResource: OpenResourceFn;
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

export function ResourceHostContextProvider({
  value,
  children,
}: {
  value: ResourceHostContextValue;
  children: ReactNode;
}) {
  return <ResourceHostContext value={value}>{children}</ResourceHostContext>;
}

export function useResourceHostContext() {
  const context = useContext(ResourceHostContext);
  if (!context) {
    throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
      reason: 'useResourceHostContext 必须在 ResourceHostContext 作用域内使用',
    });
  }
  return context;
}

export function useResourceHostId() {
  return useResourceHostContext().hostId;
}

export function useResourceHostChatContextActions() {
  const { openChatPanel, setChatContext, clearChatContext } = useResourceHostContext();
  return { openChatPanel, setChatContext, clearChatContext };
}
