import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import AppBreadcrumb from '@/components/base/AppBreadcrumb';
import { FolderTable } from '@/components/base/Table';
import EntryIcon from '@/components/business/Icons/EntryIcon';

import { buildDriveBreadcrumbItems } from '../common/driveBreadcrumb';
import { resolveDriveScope } from '../common/driveComponentModel';
import { useOpenDriveNode } from '../common/useOpenDriveNode';
import { useTableDriveNavigationController } from '../TableDrive/controllers';
import type { DriveTableRow, TableDriveProps } from '../TableDrive/index.type';
import { isDrivePinnedFirstRow, toDriveTableRow } from '../TableDrive/tableConfig';
import styles from './style.module.less';

function getMobileRowMeta(row: DriveTableRow) {
  if (row.entryType === 'loading') return '';
  if (row.sizeLabel && row.sizeLabel !== '—') return `${row.typeLabel} · ${row.sizeLabel}`;
  return row.typeLabel;
}

function MobileDrive({
  groupId,
  rootId,
  initialNodeId,
  loading: externalLoading = false,
  onCurrentNodeChange,
  onPathError,
  scope,
}: TableDriveProps) {
  const { t } = useTranslation('drive');
  const resolvedScope = resolveDriveScope(scope, groupId, rootId);
  const navigation = useTableDriveNavigationController({
    initialNodeId,
    scope: resolvedScope.scope,
    ready: !externalLoading,
    onPathError,
  });
  const handleEnterFolder = (nodeId: string) => {
    onCurrentNodeChange?.(nodeId);
    navigation.enterFolder(nodeId);
  };
  const openDriveNode = useOpenDriveNode({ enterFolder: handleEnterFolder });
  const rows = navigation.dataSource.map((node) => toDriveTableRow(node, t));
  const breadcrumb = (
    <AppBreadcrumb
      items={buildDriveBreadcrumbItems(navigation.pathNodes, resolvedScope.scope)}
      ariaLabel={t('aria.folderPath', { ns: 'table' })}
      className={styles.breadcrumb}
    />
  );

  const handleActivateNode = (row: DriveTableRow) => {
    if (row.node.type === 'loading') {
      void navigation.loadMoreChildren(row.node.parentId);
      return;
    }
    openDriveNode(row.node);
  };

  const renderNameContent = (_content: ReactNode, row: DriveTableRow) => (
    <span className={styles.mobileNameContent}>
      <span className={styles.mobileEntryIcon}>
        <EntryIcon
          entryType={row.node.type === 'resource' ? 'resource' : row.node.type}
          folderVariant={
            row.node.type === 'folder' && row.node.systemType === 'shared' ? 'shared' : undefined
          }
          resourceType={row.node.type === 'resource' ? row.node.resourceType : undefined}
          resourceIconType={
            row.node.type === 'resource' || row.node.type === 'link'
              ? row.node.resourceIconType
              : undefined
          }
          size={22}
        />
      </span>
      <span className={styles.mobileNameTextBlock}>
        <span className={styles.mobileNameText}>{row.name}</span>
        <span className={styles.mobileNameMeta}>{getMobileRowMeta(row)}</span>
      </span>
    </span>
  );

  return (
    <main className={styles.mobileDrive} aria-label={t('mobile.aria')}>
      <FolderTable<DriveTableRow>
        ariaLabel={t('mobile.aria')}
        items={rows}
        columns={[
          {
            id: 'name',
            label: t('table.columns.name'),
            width: 'fill',
            align: 'start',
            isRowHeader: true,
            isNameColumn: true,
          },
        ]}
        loading={navigation.loading}
        breadcrumb={breadcrumb}
        expandedRowKeys={navigation.expandedRowKeys}
        onExpandedChange={navigation.handleExpandedChange}
        onRowActivate={handleActivateNode}
        renderEntryIcon={(row) => (
          <EntryIcon
            entryType={row.node.type === 'resource' ? 'resource' : row.node.type}
            resourceType={row.node.type === 'resource' ? row.node.resourceType : undefined}
            resourceIconType={
              row.node.type === 'resource' || row.node.type === 'link'
                ? row.node.resourceIconType
                : undefined
            }
            folderVariant={
              row.node.type === 'folder' && row.node.systemType === 'shared' ? 'shared' : undefined
            }
          />
        )}
        renderNameContent={renderNameContent}
        loadMore={{
          loading: navigation.loadingMore,
          hasMore: navigation.hasMore,
          onLoadMore: navigation.loadMore,
        }}
        totalCount={navigation.totalCount}
        summary={null}
        emptyText={t('navigator.empty')}
        className={styles.mobileTable}
        isPinnedFirst={isDrivePinnedFirstRow}
      />
    </main>
  );
}

export default MobileDrive;
