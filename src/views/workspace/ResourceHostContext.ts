import type { ChatPanelAgentDebugConfig } from '@/components/ChatPanel/index.type';
import type {
  ResourceChatContext,
  ResourceChatStateProvider,
} from '@/components/ChatPanel/ResourceChatProtocol';
import type { DriveNodeScope } from '@/domains/Drive';
import type { ResourceItem } from '@/domains/Resource';
import type { ResourceHeaderConfig } from '@/layouts/Workspace/_common/ResourceHeader/index.type';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';
import {
  createContext,
  useContext,
  useEffectEvent,
  useLayoutEffect,
  type DependencyList,
  type ReactNode,
} from 'react';

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
  sidePanel?: ResourceHostSidePanelConfig;
  chatAgentDebug?: ChatPanelAgentDebugConfig;
}

export interface ResourceHostSidePanelConfig {
  resource: ResourceItem;
  inlineComment?: ReactNode;
  onResourceChanged?: () => unknown | Promise<unknown>;
}

export interface ResourceHostRouteContext {
  resourceId?: string;
  resourceType?: string;
  viewer?: string;
}

export interface ResourceHostContextValue {
  hostId: string;
  layoutConfig: ResourceHostLayoutConfig;
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
  const { setChatContext, clearChatContext } = useResourceHostContext();
  return { setChatContext, clearChatContext };
}

export function useResourceHostLayoutConfig(
  createConfig: () => ResourceHostLayoutConfig,
  deps: DependencyList
) {
  const { hostId, setLayoutConfig, resetLayoutConfig } = useResourceHostContext();
  const applyLayoutConfig = useEffectEvent(() => setLayoutConfig(createConfig()));
  const clearLayoutConfig = useEffectEvent(() => resetLayoutConfig());

  /**
   * 资源页面提交后把布局配置注册到外层宿主；配置属于跨组件宿主状态，无法在当前渲染树内派生。
   * 调用方显式声明业务依赖，避免依赖临时对象引用触发重复注册。
   */
  useLayoutEffect(() => {
    applyLayoutConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 依赖由调用方按配置读取值显式传入，hostId 负责宿主切换。
  }, [hostId, ...deps]);

  /** 宿主或资源页面卸载时清空已注册配置，避免下一个资源沿用旧布局。 */
  useLayoutEffect(() => {
    return clearLayoutConfig;
  }, [hostId]);
}
