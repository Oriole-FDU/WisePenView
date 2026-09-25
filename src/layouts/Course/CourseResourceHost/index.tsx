import type { ReactNode } from 'react';

import type { ResourceChatContext } from '@/components/business/ChatPanel/ResourceChatProtocol';
import type { ResourceTarget } from '@/domains/Resource/model/resourceTarget';
import {
  type OpenResourceFn,
  type ResourceHostContextValue,
  ResourceHostProvider,
} from '@/layouts/Resource/_context';
import ResourceRenderer from '@/views/resource/ResourceRenderer';

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
    openChatPanel: onOpenChatPanel,
    setChatContext: onSetChatContext,
    clearChatContext: onClearChatContext,
  };
  return (
    <ResourceHostProvider value={resourceHostContext}>
      <ResourceRenderer target={target} onTargetChange={onTargetChange} onClose={onClose} />
    </ResourceHostProvider>
  );
}

export default CourseResourceHost;
