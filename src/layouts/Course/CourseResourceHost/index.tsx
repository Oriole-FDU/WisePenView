import { type ReactNode, useState } from 'react';

import { RESOURCE_KIND, type ResourceTarget } from '@/domains/Resource/model/resourceTarget';
import { useResourceEditor } from '@/layouts/Resource/_context/editor';
import {
  type OpenResourceFn,
  type ResourceHostContextValue,
  ResourceHostProvider,
} from '@/layouts/Resource/_context/host';
import ResourceTargetResolver from '@/views/app/resource/ResourceTargetResolver';

interface CourseResourceHostProps {
  courseId: string;
  target: ResourceTarget;
  fallbackHeader: ReactNode;
  onTargetChange: (target: ResourceTarget) => void;
  onClose: () => void;
}

function CourseResourceHost({
  courseId,
  target,
  fallbackHeader,
  onTargetChange,
  onClose,
}: CourseResourceHostProps) {
  const { requestExit } = useResourceEditor();
  const [viewerOverride, setViewerOverride] = useState<{ resourceId: string; viewer: string }>();
  const effectiveTarget =
    viewerOverride && viewerOverride.resourceId === target.resourceId
      ? { ...target, viewer: viewerOverride.viewer }
      : target;
  const changeTarget = async (nextTarget: ResourceTarget) => {
    const { resourceId, viewer } = nextTarget;
    if (resourceId && resourceId === target.resourceId && viewer) {
      if (viewer === effectiveTarget.viewer) return;
      if (await requestExit('switch-viewer')) {
        setViewerOverride({ resourceId, viewer });
      }
      return;
    }
    onTargetChange(nextTarget);
  };
  const openResource: OpenResourceFn = (nextTarget) => {
    void changeTarget({
      resourceId: nextTarget.resourceId,
      resourceType: nextTarget.resourceType,
      resourceName: nextTarget.resourceName,
      viewer: nextTarget.viewer,
    });
  };

  const resourceHostContext: ResourceHostContextValue = {
    hostId: `course:${courseId}`,
    fallbackHeader,
    routeContext: effectiveTarget,
    openResource,
    navigateToDrive: () => onClose(),
    switchResourceViewer: ({ resourceId, viewer }) =>
      void changeTarget({
        ...target,
        resourceId,
        resourceType: RESOURCE_KIND.FILE,
        viewer,
      }),
  };
  return (
    <ResourceHostProvider value={resourceHostContext}>
      <ResourceTargetResolver
        target={effectiveTarget}
        onTargetChange={(next) => void changeTarget(next)}
        onClose={onClose}
      />
    </ResourceHostProvider>
  );
}

export default CourseResourceHost;
