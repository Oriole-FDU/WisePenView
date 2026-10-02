import { lazy, Suspense, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { Spin } from '@/components/base/Feedback';
import { RESOURCE_MAIN_MIN_WIDTH } from '@/constants/layoutScale';
import type { DriveNodeScope } from '@/domains/Drive';
import {
  normalizeResourceKind,
  normalizeResourceViewer,
  resolveResourceViewer,
  RESOURCE_KIND,
  type ResourceTarget,
  type ResourceViewer,
} from '@/domains/Resource/model/resourceTarget';
import { useOpenResource } from '@/hooks/useOpenResource';
import { ChatDockLayout } from '@/layouts/ChatDockLayout';
import { useMainShell } from '@/layouts/MainShell/_context';
import {
  ResourceChatBindingProvider,
  resourceChatContextActions,
  ResourceChatPanel,
} from '@/layouts/Resource/_context/chatBinding';
import { useResourceChatContextStore } from '@/layouts/Resource/_store/useResourceChatContextStore';
import ResourceHost from '@/layouts/Resource/ResourceHost';
import RouteOutletBoundary from '@/layouts/RouteOutletBoundary';
import { APP_ROUTE_PATH } from '@/utils/navigation/appRoute';
import { buildDrivePath } from '@/utils/navigation/driveRoute';
import {
  buildResourcePathWithSearch,
  parseResourceDriveLocation,
} from '@/utils/navigation/resourceRoute';

import ResourceTargetResolver from '../ResourceTargetResolver';

const NewNoteWorkspace = lazy(
  () => import('@/components/editors/note/components/NewNoteWorkspace')
);

function ResourceRouteBoundary({ newNote = false }: { newNote?: boolean }) {
  const { t } = useTranslation('workspace');
  const { isMobileLayout } = useMainShell();
  const location = useLocation();
  const navigate = useNavigate();
  const openResource = useOpenResource();
  const { resourceType: rawResourceType, resourceId } = useParams<{
    resourceType?: string;
    resourceId?: string;
  }>();
  const search = new URLSearchParams(location.search);
  const viewerParam = search.get('viewer') ?? undefined;
  const target: ResourceTarget = {
    resourceType: rawResourceType,
    resourceId,
    viewer: viewerParam,
  };
  const routeContext = {
    resourceId: newNote ? undefined : resourceId,
    resourceType: normalizeResourceKind(rawResourceType),
    viewer: resolveResourceViewer({ resourceType: rawResourceType, viewer: viewerParam }),
    driveLocation: parseResourceDriveLocation(search),
  };

  const handleTargetChange = (nextTarget: ResourceTarget) => {
    const nextResourceType = normalizeResourceKind(nextTarget.resourceType);
    const nextResourceId = nextTarget.resourceId?.trim();
    if (!nextResourceType || !nextResourceId) return;
    void navigate(
      buildResourcePathWithSearch(
        {
          resourceType: nextResourceType,
          resourceId: nextResourceId,
          viewer: normalizeResourceViewer(nextTarget.viewer),
        },
        location.search
      ),
      { replace: true }
    );
  };

  const navigateToDrive = ({ scope, nodeId }: { scope: DriveNodeScope; nodeId?: string }) => {
    void navigate(buildDrivePath({ scope, nodeId }), { replace: true });
  };

  const switchResourceViewer = ({
    resourceId: nextResourceId,
    viewer,
  }: {
    resourceId: string;
    viewer: ResourceViewer;
  }) => {
    void navigate(
      buildResourcePathWithSearch(
        { resourceId: nextResourceId, resourceType: RESOURCE_KIND.FILE, viewer },
        location.search
      ),
      { replace: true }
    );
  };

  const chatContext = useResourceChatContextStore((state) => state.context);
  /**
   * @wisepen-manual-effect
   * 执行时机：离开资源视图时结束未发送的选区。
   * 不可替代原因：聊天上下文按标签存在，卸载不会自动清理它。
   * cleanup：移除当前资源的选区和匹配信息。
   */
  useEffect(() => () => resourceChatContextActions.clearContext(), []);

  const navigateResourceHash = (hash: string) => {
    void navigate(
      { pathname: location.pathname, search: location.search, hash },
      { preventScrollReset: true }
    );
  };

  return (
    <ResourceChatBindingProvider>
      <ChatDockLayout
        leftMinWidth={RESOURCE_MAIN_MIN_WIDTH}
        panelId="app-resource-chat"
        chatLabel={t('shell.chatPanel')}
        left={
          <ResourceHost
            routeContext={routeContext}
            openResource={openResource}
            navigateToDrive={navigateToDrive}
            switchResourceViewer={switchResourceViewer}
            navigateResourceHash={navigateResourceHash}
          >
            <RouteOutletBoundary>
              {newNote ? (
                <Suspense fallback={<Spin />}>
                  <NewNoteWorkspace
                    key={`${routeContext.driveLocation?.scope.rootId}:${routeContext.driveLocation?.mountTagId}`}
                  />
                </Suspense>
              ) : (
                <ResourceTargetResolver
                  target={target}
                  onTargetChange={handleTargetChange}
                  onClose={() => void navigate(APP_ROUTE_PATH.DRIVE_PERSONAL)}
                />
              )}
            </RouteOutletBoundary>
          </ResourceHost>
        }
        right={
          <ResourceChatPanel
            target={routeContext}
            showCollapseButton={isMobileLayout}
            context={chatContext}
            clearContext={resourceChatContextActions.clearContext}
          />
        }
      />
    </ResourceChatBindingProvider>
  );
}

export default ResourceRouteBoundary;
