import { clsx } from 'clsx';

import { useResourceHostContext } from '@/layouts/Resource/_context/host';

import type { ResourceLayoutProps } from './index.type';
import ResourceLayoutHeader from './ResourceLayoutHeader';
import ResourceSidePanel from './ResourceSidePanel';
import ResourceSidePanelActions from './ResourceSidePanel/Actions';
import styles from './style.module.less';

/**
 * 资源外壳：负责资源自己的顶栏与侧栏。
 *
 * 顶栏按面包屑 / 动作分槽，侧栏负责批注与行内批注的切换；宿主只提供导航能力，
 * 对话层与编辑器运行时都不在这里持有。
 */
export default function ResourceLayout({
  children,
  className,
  header,
  sidePanel,
  headerTrailingActions,
}: ResourceLayoutProps) {
  const host = useResourceHostContext();
  const resourceToolbar =
    header && header.resource
      ? {
          ...header.resource,
          breadcrumbItems: host.breadcrumbItems ?? [],
        }
      : undefined;
  const trailingActions = (
    <>
      {sidePanel ? (
        <ResourceSidePanelActions
          resourceId={sidePanel.resource.resourceId}
          inlineCommentAvailable={Boolean(sidePanel.inlineComment)}
          disabled={resourceToolbar?.isDisabled}
        />
      ) : null}
      {headerTrailingActions}
    </>
  );
  const hasTrailingActions = Boolean(sidePanel || headerTrailingActions);
  const layoutHeader = resourceToolbar ? (
    <ResourceLayoutHeader
      {...host.headerNavigation}
      resourceToolbar={resourceToolbar}
      sidePanelActions={hasTrailingActions ? trailingActions : undefined}
    />
  ) : (
    (host.fallbackHeader ??
    (header !== false || host.headerNavigation?.leftSidebarCollapsed ? (
      <ResourceLayoutHeader {...host.headerNavigation} />
    ) : null))
  );

  return (
    <div className={clsx(styles.root, className)}>
      {layoutHeader}
      <div className={styles.body}>
        <ResourceSidePanel resourceId={host.routeContext.resourceId ?? ''} config={sidePanel}>
          {children}
        </ResourceSidePanel>
      </div>
    </div>
  );
}
