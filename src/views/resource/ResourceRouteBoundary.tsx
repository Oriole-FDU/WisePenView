import { useLocation, useNavigate, useParams } from 'react-router-dom';

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
import ResourceHost from '@/layouts/Resource/ResourceHost';
import RouteOutletBoundary from '@/layouts/RouteOutletBoundary';
import { APP_ROUTE_PATH } from '@/utils/navigation/appRoute';
import { buildDrivePath } from '@/utils/navigation/driveRoute';
import {
  buildResourcePathWithSearch,
  parseResourceDriveLocation,
} from '@/utils/navigation/resourceRoute';

import ResourceRouteView from './ResourceRouteView';

function ResourceRouteBoundary() {
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
    resourceId,
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

  const navigateResourceHash = (hash: string) => {
    void navigate(
      { pathname: location.pathname, search: location.search, hash },
      { preventScrollReset: true }
    );
  };

  return (
    <ResourceHost
      routeContext={routeContext}
      openResource={openResource}
      navigateToDrive={navigateToDrive}
      switchResourceViewer={switchResourceViewer}
      navigateResourceHash={navigateResourceHash}
    >
      <RouteOutletBoundary>
        <ResourceRouteView
          target={target}
          onTargetChange={handleTargetChange}
          onClose={() => void navigate(APP_ROUTE_PATH.DRIVE_PERSONAL)}
        />
      </RouteOutletBoundary>
    </ResourceHost>
  );
}

export default ResourceRouteBoundary;
