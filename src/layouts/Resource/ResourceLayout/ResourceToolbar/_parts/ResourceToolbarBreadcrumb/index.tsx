import { ChevronRight, HardDrive } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import AppBreadcrumb, { type AppBreadcrumbItem } from '@/components/base/AppBreadcrumb';
import EntryIcon from '@/components/business/Icons/EntryIcon';

import styles from '../../_common/style.module.scss';
import type { ResourceToolbarBreadcrumbProps } from './index.type';

/** 资源顶栏面包屑区：只负责导航层级与资源标题，不持有任何操作动作。 */
export default function ResourceToolbarBreadcrumb({
  resourceId,
  resourceName,
  resourceType,
  resourceIconType,
  breadcrumbItems,
  hideBreadcrumb,
  titleMeta,
}: ResourceToolbarBreadcrumbProps) {
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

export type { ResourceToolbarBreadcrumbProps } from './index.type';
