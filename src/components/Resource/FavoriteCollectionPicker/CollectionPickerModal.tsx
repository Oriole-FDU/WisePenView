import AppIconButton from '@/components/Button/AppIconButton';
import { Spin } from '@/components/Feedback';
import AppModal from '@/components/Overlay/AppModal';
import type { FavoriteCollection } from '@/domains/Interact';
import { Button, Input, ListBox, ListBoxItem, TextField } from '@heroui/react';
import { Plus, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation(['resource', 'common']);
  const busy = loadingConfirm || loadingCreate;
  return (
    <AppModal
      isOpen
      onOpenChange={onOpenChange}
      title={t('favorite.picker.title')}
      size="xs"
      isDismissable={!busy}
      actions={
        <>
          <Button variant="secondary" isDisabled={busy} onPress={() => onOpenChange(false)}>
            {t('actions.cancel', { ns: 'common' })}
          </Button>
          <Button
            variant="primary"
            isDisabled={busy || loadingCollections || loadingStatus}
            onPress={onConfirm}
          >
            {t('actions.confirm', { ns: 'common' })}
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
            aria-label={t('favorite.picker.collectionList')}
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
                textValue={collection.collectionName ?? t('favorite.picker.defaultCollectionName')}
                className={styles.collectionItem}
              >
                <span className={styles.collectionContent}>
                  <span className={styles.collectionLabel}>
                    {collection.collectionName ?? t('favorite.picker.defaultCollectionName')}
                  </span>
                  <span className={styles.collectionCount}>
                    {t('favorite.picker.itemCount', { count: collection.itemCount })}
                  </span>
                </span>
              </ListBoxItem>
            ))}
          </ListBox>
        )}

        {showCreateInput ? (
          <TextField
            aria-label={t('favorite.picker.createNameLabel')}
            className={styles.createInput}
          >
            <div className={styles.inlineCreateRow}>
              <Input
                placeholder={t('favorite.picker.namePlaceholder')}
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
                label={t('favorite.picker.cancelCreate')}
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
            {t('favorite.picker.create')}
          </Button>
        )}
      </div>
    </AppModal>
  );
}

export default CollectionPickerModal;
