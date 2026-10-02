import { useMemoizedFn } from 'ahooks';

import { type ResourceViewer } from '@/domains/Resource/model/resourceTarget';
import { useResourceHostContext } from '@/layouts/Resource/_context/host';

export function useDocumentViewerSwitcher(resourceId?: string) {
  const { switchResourceViewer } = useResourceHostContext();

  return useMemoizedFn((viewer: ResourceViewer) => {
    if (!resourceId) return;
    switchResourceViewer({ resourceId, viewer });
  });
}
