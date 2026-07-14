import type { FavoriteCollection } from '@/domains/Resource';
import { Dropdown } from '@heroui/react';
import { EllipsisVertical } from 'lucide-react';
import { useState } from 'react';
import DeleteCollectionModal from '../DeleteCollectionModal';
import EditCollectionModal from '../EditCollectionModal';
import styles from '../style.module.less';

interface CollectionCardProps {
  collection: FavoriteCollection;
  onClick: () => void;
  onRefresh: () => void;
}

function CollectionCard({ collection, onClick, onRefresh }: CollectionCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const displayName = collection.collectionName ?? '我的收藏';

  return (
    <>
      <div
        className={styles.collectionCard}
        onClick={onClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') onClick();
        }}
      >
        <div className={styles.cardHeader}>
          <span className={styles.cardTitle}>
            {displayName}
            {collection.isDefault ? <span className={styles.defaultBadge}>默认</span> : null}
          </span>
          <div
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            role="presentation"
          >
            <Dropdown>
              <Dropdown.Trigger>
                <button type="button" className={styles.cardMenuBtn} aria-label="收藏夹操作菜单">
                  <EllipsisVertical size={16} />
                </button>
              </Dropdown.Trigger>
              <Dropdown.Popover placement="bottom end">
                <Dropdown.Menu aria-label="收藏夹操作">
                  <Dropdown.Item id="edit" textValue="编辑" onAction={() => setEditOpen(true)}>
                    编辑
                  </Dropdown.Item>
                  {!collection.isDefault ? (
                    <Dropdown.Item
                      id="delete"
                      textValue="删除"
                      variant="danger"
                      onAction={() => setDeleteOpen(true)}
                    >
                      删除
                    </Dropdown.Item>
                  ) : null}
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown>
          </div>
        </div>

        {collection.description ? (
          <p className={styles.cardDesc}>{collection.description}</p>
        ) : null}

        <p className={styles.cardCount}>{collection.itemCount} 项</p>
      </div>

      {editOpen ? (
        <EditCollectionModal
          isOpen={editOpen}
          onOpenChange={setEditOpen}
          collection={collection}
          onSuccess={onRefresh}
        />
      ) : null}

      {deleteOpen ? (
        <DeleteCollectionModal
          isOpen={deleteOpen}
          onOpenChange={setDeleteOpen}
          collectionId={collection.collectionId}
          collectionName={collection.collectionName}
          onSuccess={onRefresh}
        />
      ) : null}
    </>
  );
}

export default CollectionCard;
