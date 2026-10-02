import { type ReactNode, useEffect } from 'react';

import { clearFrontendStates, FRONTEND_STATE_SOURCE, setFrontendStates } from '@/frontendState';
import { useAppNavigation } from '@/layouts/AppNavigation/_context';
import { useMainShell } from '@/layouts/MainShell/_context';
import { buildResourceOpenState } from '@/layouts/Resource/_context/chatBinding/resourceChatModel';
import { ResourceEditorProvider, useResourceEditor } from '@/layouts/Resource/_context/editor';
import { useResourceBreadcrumb } from '@/layouts/Resource/useResourceBreadcrumb';

import {
  DEFAULT_RESOURCE_HOST_ID,
  type OpenResourceFn,
  type ResourceHostContextValue,
  type ResourceHostDriveNavigationTarget,
  ResourceHostProvider,
  type ResourceHostRouteContext,
  type ResourceHostViewerNavigationTarget,
} from '../_context/host';

interface ResourceHostProps {
  children: ReactNode;
  routeContext: ResourceHostRouteContext;
  openResource: OpenResourceFn;
  navigateToDrive: (target: ResourceHostDriveNavigationTarget) => void;
  switchResourceViewer: (target: ResourceHostViewerNavigationTarget) => void;
  navigateResourceHash?: (hash: string) => void;
}

function ResourceHostContent({
  children,
  routeContext,
  openResource,
  navigateToDrive,
  switchResourceViewer,
  navigateResourceHash,
}: ResourceHostProps) {
  const { sidebarCollapsed, onToggleSidebar } = useMainShell();
  const appNavigation = useAppNavigation();
  const { snapshot: editorSnapshot } = useResourceEditor();
  const { resourceId, resourceType, viewer } = editorSnapshot?.openedResource ?? routeContext;
  /**
   * @wisepen-manual-effect
   * 执行时机：资源路由变化时更新当前面板的打开资源。
   * 不可替代原因：资源页和聊天面板可分别挂载，发送读取必须使用当前路由。
   * cleanup：仅清理本次写入，避免旧资源卸载覆盖新资源。
   */
  useEffect(() => {
    if (!resourceId || !resourceType) {
      clearFrontendStates({ source: FRONTEND_STATE_SOURCE.RESOURCE });
      return;
    }
    const revision = setFrontendStates({
      source: FRONTEND_STATE_SOURCE.RESOURCE,
      resourceId,
      entries: [buildResourceOpenState({ resourceId, resourceType, viewer })],
    });
    return () =>
      clearFrontendStates({
        source: FRONTEND_STATE_SOURCE.RESOURCE,
        revision,
      });
  }, [resourceId, resourceType, viewer]);

  const resourceBreadcrumbItems = useResourceBreadcrumb(
    routeContext.resourceId,
    routeContext.driveLocation
  );

  const resourceHostContext = {
    hostId: DEFAULT_RESOURCE_HOST_ID,
    routeContext,
    openResource,
    navigateToDrive,
    switchResourceViewer,
    navigateResourceHash,
    headerNavigation: {
      leftSidebarCollapsed: sidebarCollapsed,
      canGoBack: appNavigation.canGoBack,
      canGoForward: appNavigation.canGoForward,
      onGoBack: appNavigation.goBack,
      onGoForward: appNavigation.goForward,
      onToggleLeftSidebar: onToggleSidebar,
    },
    breadcrumbItems: resourceBreadcrumbItems,
  } satisfies ResourceHostContextValue;

  return <ResourceHostProvider value={resourceHostContext}>{children}</ResourceHostProvider>;
}

/** 资源宿主：只装配路由导航、编辑器运行时与前端状态，资源外壳与聊天 dock 由调用方组合。 */
export default function ResourceHost(props: ResourceHostProps) {
  return (
    <ResourceEditorProvider>
      <ResourceHostContent {...props} />
    </ResourceEditorProvider>
  );
}
