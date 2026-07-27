import {
  normalizeResourceKind,
  normalizeResourceViewer,
  type ResourceTarget,
} from '@/utils/navigation/resourceTarget';
import { buildWorkspaceResourcePathWithSearch } from '@/utils/navigation/workspaceRoute';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useResourceHostContext } from './ResourceHostContext';
import ResourceRenderer from './ResourceRenderer';
import WorkspaceResourceSidePanel from './_components/WorkspaceResourceSidePanel';

function WorkspaceResourceView() {
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
  };

  const handleClose = () => {
    navigate('/app/drive/personal');
  };

  const sidePanelConfig =
    layoutConfig.sidePanel?.resource.resourceId === resourceId ? layoutConfig.sidePanel : undefined;

  return (
    <WorkspaceResourceSidePanel resourceId={resourceId ?? ''} config={sidePanelConfig}>
      <ResourceRenderer target={target} onTargetChange={handleTargetChange} onClose={handleClose} />
    </WorkspaceResourceSidePanel>
  );
}

export default WorkspaceResourceView;
