import { RESOURCE_KIND, type ResourceViewer } from '@/utils/navigation/resourceTarget';
import { buildWorkspaceResourcePathWithSearch } from '@/utils/navigation/workspaceRoute';
import { useMemoizedFn } from 'ahooks';
import { useLocation, useNavigate } from 'react-router-dom';

export function useDocumentViewerSwitcher(resourceId?: string) {
  const location = useLocation();
  const navigate = useNavigate();

  return useMemoizedFn((viewer: ResourceViewer) => {
    if (!resourceId) return;

    navigate(
      buildWorkspaceResourcePathWithSearch(
        {
          resourceId,
          resourceType: RESOURCE_KIND.FILE,
          viewer,
        },
        location.search
      ),
      { replace: true }
    );
  });
}
