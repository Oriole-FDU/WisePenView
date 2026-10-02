import { ChevronRight, HardDrive } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import AppBreadcrumb, { type AppBreadcrumbItem } from '@/components/base/AppBreadcrumb';
import EntryIcon from '@/components/business/Icons/EntryIcon';
import type { ResourceIconType } from '@/domains/Resource';

import styles from './style.module.less';

export interface ResourceHeaderBreadcrumbProps {
  resourceId?: string;
  resourceName: string;
  resourceType?: string;
  resourceIconType?: ResourceIconType;
  /** 驱动器路径面包屑，最后一项追加当前资源。 */
  breadcrumbItems: AppBreadcrumbItem[];
  /** 隐藏面包屑导航（笔记编辑页等场景），只展示当前资源。 */
  hideBreadcrumb?: boolean;
  titleMeta?: ReactNode;
}

/** 资源顶栏面包屑区：只负责导航层级与资源标题，不持有任何操作动作。 */
export default function ResourceHeaderBreadcrumb({
  resourceId,
  resourceName,
  resourceType,
  resourceIconType,
  breadcrumbItems,
  hideBreadcrumb,
  titleMeta,
}: ResourceHeaderBreadcrumbProps) {
  const { t } = useTranslation('resource');
  const currentBreadcrumbItem: AppBreadcrumbItem = {
    key: `resource:${resourceId ?? resourceName}`,
    current: true,
    label: (
      <>
        <span className={styles.titleIcon} aria-hidden="true">
          <EntryIcon
            entryType="resource"
            resourceType={resourceType}
            resourceIconType={resourceIconType}
          />
        </span>
        <span className={styles.titleText}>{resourceName}</span>
      </>
    ),
  };
  const headerBreadcrumbItems: AppBreadcrumbItem[] = [
    ...breadcrumbItems.map((item, index) =>
      index === 0
        ? {
            ...item,
            label: (
              <>
                <HardDrive
                  className={styles.breadcrumbIcon}
                  size={14}
                  aria-hidden
                  color="var(--accent)"
                />
                {item.label}
              </>
            ),
          }
        : item
    ),
    currentBreadcrumbItem,
  ];

  return (
    <div className={styles.title}>
      {!hideBreadcrumb ? (
        <AppBreadcrumb
          items={headerBreadcrumbItems}
          ariaLabel={t('header.breadcrumbAria')}
          className={styles.breadcrumb}
          separator={<ChevronRight className={styles.breadcrumbSeparator} size={14} aria-hidden />}
        />
      ) : (
        <span className={styles.breadcrumbCurrent} aria-current="page">
          {currentBreadcrumbItem.label}
        </span>
      )}
      {titleMeta ? <span className={styles.titleMeta}>{titleMeta}</span> : null}
    </div>
  );
}
