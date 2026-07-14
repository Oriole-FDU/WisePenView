import type {
  ResourceChatContext,
  ResourceChatStateProvider,
} from '@/components/ChatPanel/ResourceChatProtocol';
import type { DriveNodeScope } from '@/domains/Drive';
import type { ResourceHeaderConfig } from '@/layouts/Workspace/_common/ResourceHeader/index.type';
import { createContext, useContext, useLayoutEffect, type ReactNode } from 'react';

export interface OpenResourceTarget {
  resourceId: string;
  resourceType?: string;
  resourceName?: string;
  viewer?: string;
  driveLocation:
    | { scope: DriveNodeScope }
    | {
        scope: DriveNodeScope;
        parentNodeId: string;
        nodeId?: string;
      };
  replace?: boolean;
}

export interface OpenResourceFn {
  (target: OpenResourceTarget): void;
}

export interface ResourceHostHeaderConfig {
  resource?: ResourceHeaderConfig;
  inlineTitle?: ReactNode;
  extra?: ReactNode;
  titleBlock?: ReactNode;
  className?: string;
}

export interface ResourceHostLayoutConfig {
  className?: string;
  bodyClassName?: string;
  header?: ResourceHostHeaderConfig | false;
  chatStateProvider?: ResourceChatStateProvider;
}

export interface ResourceHostRouteContext {
  resourceId?: string;
  resourceType?: string;
  viewer?: string;
}

export interface ResourceHostContextValue {
  hostId: string;
  routeContext: ResourceHostRouteContext;
  getNavigationScope: () => DriveNodeScope;
  openResource: OpenResourceFn;
  setLayoutConfig: (config: ResourceHostLayoutConfig) => void;
  resetLayoutConfig: () => void;
  setChatContext: (context: ResourceChatContext) => void;
  clearChatContext: (context?: ResourceChatContext) => void;
}

export const ResourceHostContext = createContext<ResourceHostContextValue | null>(null);

export const DEFAULT_RESOURCE_HOST_ID = 'default';

export function useResourceHostContext() {
  const context = useContext(ResourceHostContext);
  if (!context) {
    throw new Error('useResourceHostContext 必须在 ResourceHostContext 作用域内使用');
  }
  return context;
}

export function useResourceHostId() {
  return useResourceHostContext().hostId;
}

export function useResourceHostChatContextActions() {
  const { setChatContext, clearChatContext } = useResourceHostContext();
  return { setChatContext, clearChatContext };
}

export function useResourceHostLayoutConfig(config: ResourceHostLayoutConfig) {
  const { setLayoutConfig, resetLayoutConfig } = useResourceHostContext();

  useLayoutEffect(() => {
    setLayoutConfig(config);
  }, [config, setLayoutConfig]);

  useLayoutEffect(() => {
    return resetLayoutConfig;
  }, [resetLayoutConfig]);
}
