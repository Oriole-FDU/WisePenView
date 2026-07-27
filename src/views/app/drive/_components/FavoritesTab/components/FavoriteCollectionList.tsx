import AppIconButton from '@/components/Button/AppIconButton';
import type { FavoriteCollection } from '@/domains/Interact';
import { Dropdown, ListBox, ListBoxItem } from '@heroui/react';
import { EllipsisVertical, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import styles from '../style.module.less';

interface FavoriteCollectionListProps {
  collections: FavoriteCollection[];
  selectedCollectionId?: string;
  onSelect: (collectionId: string) => void;
  onCreate: () => void;
  onEdit: (collection: FavoriteCollection) => void;
  onDelete: (collection: FavoriteCollection) => void;
}

function FavoriteCollectionList({
  collections,
  selectedCollectionId,
  onSelect,
  onCreate,
  onEdit,
  onDelete,
}: FavoriteCollectionListProps) {
  const { t } = useTranslation(['resource', 'common']);
  return (
    <aside className={styles.collectionPanel} aria-label={t('favorite.collection.panelAria')}>
      <div className={styles.collectionPanelHeader}>
        <span className={styles.collectionPanelTitle}>{t('favorite.collection.title')}</span>
        <AppIconButton
          icon={<Plus size={17} aria-hidden="true" />}
          label={t('favorite.collection.createTitle')}
          size="sm"
          className={styles.collectionCreateButton}
          onPress={onCreate}
        />
      </div>

      <ListBox
        aria-label={t('favorite.picker.collectionList')}
        selectionMode="single"
        selectedKeys={selectedCollectionId ? [selectedCollectionId] : []}
        onSelectionChange={(keys) => {
          const nextKey = [...keys][0];
          if (nextKey) onSelect(String(nextKey));
        }}
        className={styles.collectionList}
      >
        {collections.map((collection) => (
          <ListBoxItem
            key={collection.collectionId}
            id={collection.collectionId}
            textValue={collection.collectionName ?? t('favorite.picker.defaultCollectionName')}
            className={styles.collectionListItem}
          >
            <span className={styles.collectionListItemContent}>
              <span className={styles.collectionListItemName}>
                {collection.collectionName ?? t('favorite.picker.defaultCollectionName')}
              </span>
              <span className={styles.collectionListItemMeta}>{collection.itemCount}</span>
              <span
                className={styles.collectionListItemActions}
                onPointerDown={
                  collection.isDefault ? undefined : (event) => event.stopPropagation()
                }
                onClick={collection.isDefault ? undefined : (event) => event.stopPropagation()}
              >
                {!collection.isDefault ? (
                  <Dropdown>
                    <AppIconButton
                      icon={<EllipsisVertical size={16} aria-hidden="true" />}
                      label={t('favorite.collection.actionsAria', {
                        name:
                          collection.collectionName ?? t('favorite.picker.defaultCollectionName'),
                      })}
                      size="sm"
                      className={styles.collectionMoreButton}
                      tooltip={{ content: t('favorite.collection.moreActions') }}
                      overlayTrigger={<Dropdown.Trigger />}
                    />
                    <Dropdown.Popover placement="bottom end">
                      <Dropdown.Menu aria-label={t('favorite.collection.menuAria')}>
                        <Dropdown.Item id="edit" onAction={() => onEdit(collection)}>
                          {t('actions.edit', { ns: 'common' })}
                        </Dropdown.Item>
                        <Dropdown.Item
                          id="delete"
                          variant="danger"
                          onAction={() => onDelete(collection)}
                        >
                          {t('actions.delete', { ns: 'common' })}
                        </Dropdown.Item>
                      </Dropdown.Menu>
                    </Dropdown.Popover>
                  </Dropdown>
                ) : null}
              </span>
            </span>
          </ListBoxItem>
        ))}
      </ListBox>
    </aside>
  );
}

export default FavoriteCollectionList;
