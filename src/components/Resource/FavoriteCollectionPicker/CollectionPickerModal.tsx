import AppIconButton from '@/components/Button/AppIconButton';
import { Spin } from '@/components/Feedback';
import AppModal from '@/components/Overlay/AppModal';
import type { FavoriteCollection } from '@/domains/Interact';
import { Button, Input, ListBox, ListBoxItem, TextField } from '@heroui/react';
import { Plus, X } from 'lucide-react';
import styles from './style.module.less';

export interface CollectionPickerModalProps {
  collections: FavoriteCollection[];
  selectedIds: string[];
  newCollectionName: string;
  showCreateInput: boolean;
  loadingCollections: boolean;
  loadingStatus: boolean;
  loadingConfirm: boolean;
  loadingCreate: boolean;
  onOpenChange: (open: boolean) => void;
  onToggle: (collectionId: string, selected: boolean) => void;
  onConfirm: () => void;
  onShowCreateInput: (show: boolean) => void;
  onNewCollectionNameChange: (name: string) => void;
  onCreateCollection: () => void;
}

function CollectionPickerModal({
  collections,
  selectedIds,
  newCollectionName,
  showCreateInput,
  loadingCollections,
  loadingStatus,
  loadingConfirm,
  loadingCreate,
  onOpenChange,
  onToggle,
  onConfirm,
  onShowCreateInput,
  onNewCollectionNameChange,
  onCreateCollection,
}: CollectionPickerModalProps) {
  const busy = loadingConfirm || loadingCreate;
  return (
    <AppModal
      isOpen
      onOpenChange={onOpenChange}
      title="收藏到"
      size="xs"
      isDismissable={!busy}
      actions={
        <>
          <Button variant="secondary" isDisabled={busy} onPress={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            variant="primary"
            isDisabled={busy || loadingCollections || loadingStatus}
            onPress={onConfirm}
          >
            确认
          </Button>
        </>
      }
    >
      <div className={styles.pickerBody}>
        {loadingCollections || loadingStatus ? (
          <div className={styles.pickerLoading}>
            <Spin />
          </div>
        ) : (
          <ListBox
            aria-label="收藏夹"
            selectionMode="multiple"
            selectedKeys={new Set(selectedIds)}
            onSelectionChange={(keys) => {
              const nextKeys = new Set([...keys].map(String));
              collections.forEach((collection) => {
                const isSelected = nextKeys.has(collection.collectionId);
                if (isSelected !== selectedIds.includes(collection.collectionId)) {
                  onToggle(collection.collectionId, isSelected);
                }
              });
            }}
            className={styles.collectionList}
          >
            {collections.map((collection) => (
              <ListBoxItem
                key={collection.collectionId}
                id={collection.collectionId}
                textValue={collection.collectionName ?? '我的收藏'}
                className={styles.collectionItem}
              >
                <span className={styles.collectionContent}>
                  <span className={styles.collectionLabel}>
                    {collection.collectionName ?? '我的收藏'}
                  </span>
                  <span className={styles.collectionCount}>{collection.itemCount} 个内容</span>
                </span>
              </ListBoxItem>
            ))}
          </ListBox>
        )}

        {showCreateInput ? (
          <TextField aria-label="新建收藏夹名称" className={styles.createInput}>
            <div className={styles.inlineCreateRow}>
              <Input
                placeholder="收藏夹名称"
                value={newCollectionName}
                autoFocus
                onChange={(event) => onNewCollectionNameChange(event.target.value)}
                onBlur={onCreateCollection}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    onCreateCollection();
                  }
                  if (event.key === 'Escape') onShowCreateInput(false);
                }}
              />
              <AppIconButton
                icon={<X size={15} aria-hidden="true" />}
                label="取消新建收藏夹"
                size="sm"
                isDisabled={loadingCreate}
                className={styles.cancelCreateButton}
                onPointerDown={(event) => event.preventDefault()}
                onPress={() => onShowCreateInput(false)}
              />
            </div>
          </TextField>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className={styles.newCollectionButton}
            onPress={() => onShowCreateInput(true)}
          >
            <Plus size={15} aria-hidden="true" />
            新建收藏夹
          </Button>
        )}
      </div>
    </AppModal>
  );
}

export default CollectionPickerModal;
