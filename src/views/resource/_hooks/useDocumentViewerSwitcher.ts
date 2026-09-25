import { useMemoizedFn } from 'ahooks';
import { useLocation, useNavigate } from 'react-router-dom';

import { RESOURCE_KIND, type ResourceViewer } from '@/domains/Resource/model/resourceTarget';
import { buildResourcePathWithSearch } from '@/utils/navigation/resourceRoute';

export function useDocumentViewerSwitcher(resourceId?: string) {
  const location = useLocation();
  const navigate = useNavigate();

  return useMemoizedFn((viewer: ResourceViewer) => {
    if (!resourceId) return;

    navigate(
      buildResourcePathWithSearch(
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
