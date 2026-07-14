import {
  normalizeResourceKind,
  normalizeResourceViewer,
  type ResourceTarget,
} from '@/utils/navigation/resourceTarget';
import { buildWorkspaceResourcePathWithSearch } from '@/utils/navigation/workspaceRoute';
import { useCallback } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import ResourceRenderer from './ResourceRenderer';

function WorkspaceResourceView() {
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

  const handleTargetChange = useCallback(
    (nextTarget: ResourceTarget) => {
      const resourceType = normalizeResourceKind(nextTarget.resourceType);
      if (!resourceType) return;
      navigate(
        buildWorkspaceResourcePathWithSearch(
          {
            resourceType,
            resourceId: nextTarget.resourceId,
            viewer: normalizeResourceViewer(nextTarget.viewer),
          },
          location.search
        ),
        { replace: true }
      );
    },
    [location.search, navigate]
  );

  const handleClose = useCallback(() => {
    navigate('/app/drive');
  }, [navigate]);

  return (
    <ResourceRenderer target={target} onTargetChange={handleTargetChange} onClose={handleClose} />
  );
}

export default WorkspaceResourceView;
