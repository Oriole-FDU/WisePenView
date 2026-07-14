import type { DriveNodeScope } from '@/domains/Drive';
import type { ResourceTarget } from '@/utils/navigation/resourceTarget';
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useZenModeStore } from './_store/useZenModeStore';

interface ZenModeEntryLocation {
  scope: DriveNodeScope;
  resource?: {
    resourceId: string;
    parentNodeId: string;
    nodeId?: string;
  };
}

export function useEnterZenMode() {
  const navigate = useNavigate();

  return useCallback(
    (target: ResourceTarget, location?: ZenModeEntryLocation) => {
      const targetLocation =
        location?.resource?.resourceId === target.resourceId
          ? location
          : location
            ? { scope: location.scope }
            : undefined;
      const entered = useZenModeStore.getState().enterWithTarget(target, targetLocation);
      if (!entered) return;
      navigate('/app/zen');
    },
    [navigate]
  );
}
