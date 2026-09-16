import type { ResourceChatContext } from '@/components/business/ChatPanel/ResourceChatProtocol';
import { cn } from '@/utils/cn';
import type { ResourceTarget } from '@/utils/navigation/resourceTarget';
import ResourceSidePanel from '@/views/resource/_components/ResourceSidePanel';
import {
  type OpenResourceFn,
  ResourceHostContext,
  type ResourceHostContextValue,
  type ResourceHostLayoutConfig,
} from '@/views/resource/ResourceHostContext';
import ResourceRenderer from '@/views/resource/ResourceRenderer';

import styles from './style.module.less';

interface CourseResourceHostProps {
  courseId: string;
  target: ResourceTarget;
  layoutConfig: ResourceHostLayoutConfig;
  onTargetChange: (target: ResourceTarget) => void;
  onLayoutConfigChange: (config: ResourceHostLayoutConfig) => void;
  onOpenChatPanel: () => void;
  onSetChatContext: (context: ResourceChatContext) => void;
  onClearChatContext: (context?: ResourceChatContext) => void;
  onClose: () => void;
}

function CourseResourceHost({
  courseId,
  target,
  layoutConfig,
  onTargetChange,
  onLayoutConfigChange,
  onOpenChatPanel,
  onSetChatContext,
  onClearChatContext,
  onClose,
}: CourseResourceHostProps) {
  const resetLayoutConfig = () => {
    onLayoutConfigChange({});
  };

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
    layoutConfig,
    routeContext: target,
    openResource,
    setLayoutConfig: onLayoutConfigChange,
    resetLayoutConfig,
    openChatPanel: onOpenChatPanel,
    setChatContext: onSetChatContext,
    clearChatContext: onClearChatContext,
  };
  const sidePanelConfig =
    layoutConfig.sidePanel?.resource.resourceId === target.resourceId
      ? layoutConfig.sidePanel
      : undefined;

  return (
    <ResourceHostContext value={resourceHostContext}>
      <ResourceSidePanel resourceId={target.resourceId ?? ''} config={sidePanelConfig}>
        <div className={cn(styles.root, layoutConfig.className)}>
          <div className={cn(styles.body, layoutConfig.bodyClassName)}>
            <ResourceRenderer target={target} onTargetChange={onTargetChange} onClose={onClose} />
          </div>
        </div>
      </ResourceSidePanel>
    </ResourceHostContext>
  );
}

export default CourseResourceHost;
