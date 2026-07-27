import { Empty, Spin } from '@/components/Feedback';
import type { FavoriteCollection } from '@/domains/Interact';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import DeleteCollectionModal from './DeleteCollectionModal';
import EditCollectionModal from './EditCollectionModal';
import FavoriteCollectionList from './components/FavoriteCollectionList';
import FavoriteResourceTable from './components/FavoriteResourceTable';
import { useFavoriteCollections } from './hooks/useFavoriteCollections';
import styles from './style.module.less';

function resolveDefaultCollection(
  collections: FavoriteCollection[]
): FavoriteCollection | undefined {
  return collections.find((collection) => collection.isDefault) ?? collections[0];
}

function FavoritesTab() {
  const { t } = useTranslation('resource');
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>();
  const [editingCollection, setEditingCollection] = useState<
    FavoriteCollection | null | undefined
  >();
  const [deletingCollection, setDeletingCollection] = useState<FavoriteCollection>();
  const { collections, hasLoaded, loading, refresh } = useFavoriteCollections();

  const defaultCollection = resolveDefaultCollection(collections);
  const activeCollection =
    collections.find((collection) => collection.collectionId === selectedCollectionId) ??
    defaultCollection;

  if (loading && !hasLoaded) {
    return (
      <div className={styles.container}>
        <div className={styles.feedbackState}>
          <Spin />
        </div>
      </div>
    );
  }

  if (!activeCollection) {
    return (
      <div className={styles.container}>
        <div className={styles.feedbackState}>
          <Empty description={t('favorite.collection.empty')} />
        </div>
      </div>
    );
  }

  const handleCollectionChanged = () => {
    void refresh();
  };

  return (
    <div className={styles.container}>
      <div className={styles.favoriteFrame}>
        <div className={styles.splitLayout}>
          <FavoriteCollectionList
            collections={collections}
            selectedCollectionId={activeCollection.collectionId}
            onSelect={setSelectedCollectionId}
            onCreate={() => setEditingCollection(null)}
            onEdit={setEditingCollection}
            onDelete={setDeletingCollection}
          />
          <main className={styles.resourcePanel}>
            <FavoriteResourceTable
              key={activeCollection.collectionId}
              collectionId={activeCollection.collectionId}
              collectionName={
                activeCollection.collectionName ?? t('favorite.picker.defaultCollectionName')
              }
              collectionItemCount={activeCollection.itemCount}
              onCollectionChanged={handleCollectionChanged}
              emptyDescription={t('favorite.collection.emptyItems')}
            />
          </main>
        </div>
      </div>

      {editingCollection !== undefined ? (
        <EditCollectionModal
          onOpenChange={(open) => {
            if (!open) setEditingCollection(undefined);
          }}
          collection={editingCollection}
          onSuccess={handleCollectionChanged}
        />
      ) : null}
      {deletingCollection ? (
        <DeleteCollectionModal
          collectionId={deletingCollection.collectionId}
          collectionName={deletingCollection.collectionName}
          onOpenChange={(open) => {
            if (!open) setDeletingCollection(undefined);
          }}
          onSuccess={handleCollectionChanged}
        />
      ) : null}
    </div>
  );
}

export default FavoritesTab;
