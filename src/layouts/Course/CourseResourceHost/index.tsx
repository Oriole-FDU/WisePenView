import type { ReactNode } from 'react';

import { RESOURCE_KIND, type ResourceTarget } from '@/domains/Resource/model/resourceTarget';
import {
  type OpenResourceFn,
  type ResourceHostContextValue,
  ResourceHostProvider,
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
  const openResource: OpenResourceFn = (nextTarget) => {
    onTargetChange({
      resourceId: nextTarget.resourceId,
      resourceType: nextTarget.resourceType,
      resourceName: nextTarget.resourceName,
      viewer: nextTarget.viewer,
    });
  };

  const resourceHostContext: ResourceHostContextValue = {
    hostId: `course:${courseId}:${target.resourceId ?? 'empty'}`,
    chatPanelCollapsed,
    toggleChatPanel: onToggleChatPanel,
    fallbackHeader,
    routeContext: target,
    openResource,
    navigateToDrive: () => onClose(),
    switchResourceViewer: ({ resourceId, viewer }) =>
      onTargetChange({
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
      <ResourceTargetResolver target={target} onTargetChange={onTargetChange} onClose={onClose} />
    </ResourceHostProvider>
  );
}

export default CourseResourceHost;
