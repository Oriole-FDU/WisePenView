import FavoriteCollectionPicker from '@/components/Resource/FavoriteCollectionPicker';
import { FolderTable, type FolderTableColumn, type FolderTableRow } from '@/components/Table';
import type { FavoriteItem } from '@/domains/Interact';
import { formatTimestampToDate } from '@/utils/format/formatTime';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { useFavoriteResourceTableController } from '../hooks/useFavoriteResourceTableController';
import styles from '../style.module.less';
import UnfavoriteResourceModal from './UnfavoriteResourceModal';

interface FavoriteResourceTableProps {
  collectionId: string;
  collectionName: string;
  collectionItemCount: number;
  onCollectionChanged: () => void;
  emptyDescription: string;
}

interface FavoriteResourceTableRow extends FolderTableRow {
  item: FavoriteItem;
}

const buildFavoriteResourceColumns = (
  t: TFunction<'resource'>
): FolderTableColumn<FavoriteResourceTableRow>[] => [
  {
    id: 'resource',
    label: t('favorite.resource.columns.name'),
    width: 'fill',
    isNameColumn: true,
    className: styles.resourceNameColumn,
  },
  {
    id: 'type',
    label: t('favorite.resource.columns.type'),
    width: 'folderType',
    renderCell: (row) => row.typeLabel,
  },
  {
    id: 'favoritedAt',
    label: t('favorite.resource.columns.favoritedAt'),
    width: 'folderType',
    renderCell: (row) => formatTimestampToDate(row.item.favoritedAt) || '—',
  },
  {
    id: 'actions',
    label: t('favorite.resource.columns.actions'),
    width: 'folderAction',
    isActionColumn: true,
  },
];

function toFavoriteResourceTableRow(
  item: FavoriteItem,
  t: TFunction<'resource'>
): FavoriteResourceTableRow {
  const resource = item.resourceInfo;
  return {
    id: item.resourceId,
    name: resource?.resourceName ?? t('favorite.resource.deleted'),
    entryType: 'resource',
    resourceType: resource?.resourceType,
    resourceIconType: resource?.resourceIconType,
    typeLabel: resource?.resourceType ?? t('favorite.resource.unknownType'),
    item,
  };
}

function FavoriteResourceTable({
  collectionId,
  collectionName,
  collectionItemCount,
  onCollectionChanged,
  emptyDescription,
}: FavoriteResourceTableProps) {
  const { t } = useTranslation('resource');
  const controller = useFavoriteResourceTableController({ collectionId, onCollectionChanged });
  const rows = controller.list.map((item) => toFavoriteResourceTableRow(item, t));

  return (
    <div className={styles.resourceTablePanel}>
      <header className={styles.resourcePanelHeader}>
        <div className={styles.resourcePanelCopy}>
          <h2 className={styles.resourcePanelTitle}>{collectionName}</h2>
          <p className={styles.resourcePanelDescription}>
            {t('favorite.resource.itemCount', { count: collectionItemCount })}
          </p>
        </div>
      </header>
      <FolderTable<FavoriteResourceTableRow>
        ariaLabel={t('favorite.resource.tableAria')}
        items={rows}
        onRowActivate={(row) => controller.onOpenResource(row.item)}
        columns={buildFavoriteResourceColumns(t)}
        renderNameContent={(content, row) =>
          row.item.resourceInfo ? (
            content
          ) : (
            <span className={styles.resourceCellDisabled}>{content}</span>
          )
        }
        rowActions={(row) => [
          {
            key: 'open',
            label: t('favorite.resource.open'),
            disabled: !row.item.resourceInfo,
            onPress: () => controller.onRowAction(row.item, 'open'),
          },
          {
            key: 'manage',
            label: t('favorite.resource.manage'),
            disabled: !row.item.resourceInfo,
            onPress: () => controller.onRowAction(row.item, 'manage'),
          },
          {
            key: 'remove',
            label: t('favorite.resource.remove'),
            variant: 'danger',
            onPress: () => controller.onRowAction(row.item, 'remove'),
          },
        ]}
        loading={controller.loading}
        emptyText={t('favorite.resource.empty')}
        emptyDescription={emptyDescription}
        totalCount={controller.total}
        loadMore={{
          hasMore: controller.hasMore,
          loading: controller.loadingMore,
          onLoadMore: controller.loadMore,
        }}
        className={styles.resourceTable}
      />
      <UnfavoriteResourceModal
        item={controller.unfavoriteItem}
        collectionId={collectionId}
        onOpenChange={(open) => {
          if (!open) controller.onCloseUnfavorite();
        }}
        onSuccess={controller.onUnfavoriteSuccess}
      />
      {controller.manageFavoriteItem?.resourceInfo ? (
        <FavoriteCollectionPicker
          key={controller.manageFavoriteItem.resourceId}
          resourceId={controller.manageFavoriteItem.resourceId}
          onOpenChange={(open) => {
            if (!open) controller.onCloseManageFavorite();
          }}
          onConfirmed={controller.onManageFavoriteSuccess}
        />
      ) : null}
    </div>
  );
}

export default FavoriteResourceTable;
