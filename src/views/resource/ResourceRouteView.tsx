import { useLocation, useNavigate, useParams } from 'react-router-dom';

import {
  normalizeResourceKind,
  normalizeResourceViewer,
  type ResourceTarget,
} from '@/domains/Resource/model/resourceTarget';
import { APP_ROUTE_PATH } from '@/utils/navigation/appRoute';
import { buildResourcePathWithSearch } from '@/utils/navigation/resourceRoute';

import ResourceRenderer from './ResourceRenderer';

function ResourceRouteView() {
  const { resourceType: rawResourceType, resourceId } = useParams<{
    resourceType?: string;
    resourceId?: string;
  }>();
  const location = useLocation();
  const navigate = useNavigate();
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

  return (
    <ResourceRenderer target={target} onTargetChange={handleTargetChange} onClose={handleClose} />
  );
}

export default ResourceRouteView;
