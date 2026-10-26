import { clsx } from 'clsx';

import { useResourceHostContext } from '@/layouts/Resource/_context/host';

import type { ResourceLayoutProps } from './index.type';
import ResourceLayoutHeader from './ResourceLayoutHeader';
import styles from './style.module.scss';

/**
 * 资源外壳：负责资源自己的顶栏与正文槽位。
 *
 * 顶栏按面包屑 / 动作分槽；右侧面板由工作区统一组合，本布局不持有面板状态。
 */
export default function ResourceLayout({
  children,
  className,
  header,
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
  const layoutHeader = resourceToolbar ? (
    <ResourceLayoutHeader
      leftSidebarCollapsed={host.leftSidebarCollapsed}
      resourceToolbar={resourceToolbar}
      trailingActions={headerTrailingActions}
    />
  ) : (
    (host.fallbackHeader ??
    (header !== false ? (
      <ResourceLayoutHeader leftSidebarCollapsed={host.leftSidebarCollapsed} />
    ) : null))
  );

  return (
    <div className={clsx(styles.root, className)}>
      {layoutHeader}
      <div className={styles.body}>{children}</div>
    </div>
  );
}
