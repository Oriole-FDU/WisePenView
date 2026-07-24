import AppIconButton from '@/components/Button/AppIconButton';
import type { FavoriteCollection } from '@/domains/Interact';
import { Dropdown, ListBox, ListBoxItem } from '@heroui/react';
import { EllipsisVertical, Plus } from 'lucide-react';
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
  return (
    <aside className={styles.collectionPanel} aria-label="收藏夹目录">
      <div className={styles.collectionPanelHeader}>
        <span className={styles.collectionPanelTitle}>收藏夹</span>
        <AppIconButton
          icon={<Plus size={17} aria-hidden="true" />}
          label="新建收藏夹"
          size="sm"
          className={styles.collectionCreateButton}
          onPress={onCreate}
        />
      </div>

      <ListBox
        aria-label="收藏夹"
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
            textValue={collection.collectionName ?? '我的收藏'}
            className={styles.collectionListItem}
          >
            <span className={styles.collectionListItemContent}>
              <span className={styles.collectionListItemName}>
                {collection.collectionName ?? '我的收藏'}
              </span>
              <span className={styles.collectionListItemMeta}>{collection.itemCount}</span>
            </span>
            {!collection.isDefault ? (
              <span
                className={styles.collectionListItemActions}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => event.stopPropagation()}
              >
                <Dropdown>
                  <AppIconButton
                    icon={<EllipsisVertical size={16} aria-hidden="true" />}
                    label={`${collection.collectionName ?? '我的收藏'}操作`}
                    size="sm"
                    className={styles.collectionMoreButton}
                    tooltip={{ content: '更多操作' }}
                    overlayTrigger={<Dropdown.Trigger />}
                  />
                  <Dropdown.Popover placement="bottom end">
                    <Dropdown.Menu aria-label="收藏夹操作">
                      <Dropdown.Item id="edit" onAction={() => onEdit(collection)}>
                        编辑
                      </Dropdown.Item>
                      <Dropdown.Item
                        id="delete"
                        variant="danger"
                        onAction={() => onDelete(collection)}
                      >
                        删除
                      </Dropdown.Item>
                    </Dropdown.Menu>
                  </Dropdown.Popover>
                </Dropdown>
              </span>
            ) : null}
          </ListBoxItem>
        ))}
      </ListBox>
    </aside>
  );
}

export default FavoriteCollectionList;
