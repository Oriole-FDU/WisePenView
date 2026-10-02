import { type ReactNode, useState } from 'react';

import { RESOURCE_KIND, type ResourceTarget } from '@/domains/Resource/model/resourceTarget';
import {
  type OpenResourceFn,
  type ResourceHostContextValue,
  ResourceHostProvider,
  useResourceEditor,
} from '@/layouts/Resource/_context';
import type { ResourceChatContext } from '@/layouts/Resource/_context/resourceChatModel';
import ResourceTargetResolver from '@/views/resource/ResourceTargetResolver';

interface CourseResourceHostProps {
  courseId: string;
  target: ResourceTarget;
  chatPanelCollapsed: boolean;
  onToggleChatPanel: () => void;
  fallbackHeader: ReactNode;
  onTargetChange: (target: ResourceTarget) => void;
  onOpenChatPanel: () => void;
  onSetChatContext: (context: ResourceChatContext) => void;
  onClearChatContext: (context?: ResourceChatContext) => void;
  onClose: () => void;
}

function CourseResourceHost({
  courseId,
  target,
  chatPanelCollapsed,
  onToggleChatPanel,
  fallbackHeader,
  onTargetChange,
  onOpenChatPanel,
  onSetChatContext,
  onClearChatContext,
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
    chatPanelCollapsed,
    toggleChatPanel: onToggleChatPanel,
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
    openChatPanel: onOpenChatPanel,
    setChatContext: onSetChatContext,
    clearChatContext: onClearChatContext,
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
