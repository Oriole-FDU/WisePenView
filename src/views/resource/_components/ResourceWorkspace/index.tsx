import type { ReactNode } from 'react';

import type { ResourceItem } from '@/domains/Resource';
import type { ResourceHeaderConfig } from '@/layouts/Resource/ResourceHeader/index.type';
import ResourceWorkspaceHeader from '@/layouts/Resource/ResourceWorkspaceHeader';
import { cn } from '@/utils/cn';

import { useResourceHostContext } from '../../ResourceHostContext';
import ResourceSidePanel from '../ResourceSidePanel';
import ResourceSidePanelActions from '../ResourceSidePanel/Actions';
import styles from './style.module.less';

export interface ResourceSidePanelContent {
  resource: ResourceItem;
  inlineComment?: ReactNode;
  onResourceChanged?: () => unknown | Promise<unknown>;
}

export interface ResourceWorkspaceProps {
  children: ReactNode;
  className?: string;
  header?: { resource?: ResourceHeaderConfig } | false;
  sidePanel?: ResourceSidePanelContent;
}

/** 顶栏和侧栏是当前资源的渲染槽位，宿主仅向下提供导航能力。 */
export default function ResourceWorkspace({
  children,
  className,
  header,
  sidePanel,
}: ResourceWorkspaceProps) {
  const host = useResourceHostContext();
  const resource =
    header && header.resource
      ? {
          ...header.resource,
          breadcrumbItems: host.breadcrumbItems ?? [],
          chatPanelCollapsed: host.chatPanelCollapsed,
          onToggleChatPanel: host.toggleChatPanel,
        }
      : undefined;
  const workspaceHeader = resource ? (
    <ResourceWorkspaceHeader
      {...host.headerNavigation}
      resource={resource}
      resourceSidePanelActions={
        sidePanel ? (
          <ResourceSidePanelActions
            resourceId={sidePanel.resource.resourceId}
            inlineCommentAvailable={Boolean(sidePanel.inlineComment)}
            disabled={resource.isDisabled}
          />
        ) : undefined
      }
    />
  ) : (
    (host.fallbackHeader ??
    (header !== false || host.headerNavigation?.leftSidebarCollapsed ? (
      <ResourceWorkspaceHeader {...host.headerNavigation} />
    ) : null))
  );

  return (
    <div className={cn(styles.root, className)}>
      {workspaceHeader}
      <div className={styles.body}>
        <ResourceSidePanel resourceId={host.routeContext.resourceId ?? ''} config={sidePanel}>
          {children}
        </ResourceSidePanel>
      </div>
    </div>
  );
}
