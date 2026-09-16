import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { APP_ROUTE_PATH } from '@/utils/navigation/appRoute';
import { buildResourcePathWithSearch } from '@/utils/navigation/resourceRoute';
import {
  normalizeResourceKind,
  normalizeResourceViewer,
  type ResourceTarget,
} from '@/utils/navigation/resourceTarget';

import ResourceSidePanel from './_components/ResourceSidePanel';
import { useResourceHostContext } from './ResourceHostContext';
import ResourceRenderer from './ResourceRenderer';

function ResourceRouteView() {
  const { resourceType: rawResourceType, resourceId } = useParams<{
    resourceType?: string;
    resourceId?: string;
  }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { layoutConfig } = useResourceHostContext();
  const viewerParam = new URLSearchParams(location.search).get('viewer') ?? undefined;

  const target: ResourceTarget = {
    resourceType: rawResourceType,
    resourceId,
    viewer: viewerParam,
  };

  const handleTargetChange = (nextTarget: ResourceTarget) => {
    const resourceType = normalizeResourceKind(nextTarget.resourceType);
    const nextResourceId = nextTarget.resourceId?.trim();
    if (!resourceType || !nextResourceId) return;
    navigate(
      buildResourcePathWithSearch(
        {
          resourceType,
          resourceId: nextResourceId,
          viewer: normalizeResourceViewer(nextTarget.viewer),
        },
        location.search
      ),
      { replace: true }
    );
  };

  const handleClose = () => {
    navigate(APP_ROUTE_PATH.DRIVE_PERSONAL);
  };

  const sidePanelConfig =
    layoutConfig.sidePanel?.resource.resourceId === resourceId ? layoutConfig.sidePanel : undefined;

  return (
    <ResourceSidePanel resourceId={resourceId ?? ''} config={sidePanelConfig}>
      <ResourceRenderer target={target} onTargetChange={handleTargetChange} onClose={handleClose} />
    </ResourceSidePanel>
  );
}

export default ResourceRouteView;
