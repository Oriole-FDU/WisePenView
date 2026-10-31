import { toast } from '@heroui/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useResourceFavoriteService } from '@/domains';
import { useApi } from '@/hooks/useApi';

interface UseFavoriteCollectionPickerControllerOptions {
  resourceId: string;
  onConfirmed: (collectionIds: string[]) => void;
  onOpenChange: (open: boolean) => void;
}

export function useFavoriteCollectionPickerController({
  resourceId,
  onConfirmed,
  onOpenChange,
}: UseFavoriteCollectionPickerControllerOptions) {
  const { t } = useTranslation('resource');
  const favoriteService = useResourceFavoriteService();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showCreateInput, setShowCreateInput] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const {
    data: collections,
    loading: loadingCollections,
    refresh: refreshCollections,
  } = useApi(() => favoriteService.listFavoriteCollections(), {});
  const { loading: loadingStatus } = useApi(
    () => favoriteService.getFavoriteCollectionIds(resourceId),
    {
      onSuccess: setSelectedIds,
    }
  );

  const { loading: loadingConfirm, run: confirm } = useApi(
    async () => {
      await favoriteService.updateFavoriteCollections({ resourceId, collectionIds: selectedIds });
      return favoriteService.getFavoriteCollectionIds(resourceId);
    },
    {
      manual: true,
      onSuccess: (collectionIds) => {
        onConfirmed(collectionIds);
        onOpenChange(false);
      },
    }
  );

  const { loading: loadingCreate, run: createCollection } = useApi(
    (collectionName: string) => favoriteService.createFavoriteCollection({ collectionName }),
    {
      manual: true,
      onSuccess: (collectionId) => {
        setSelectedIds((current) => Array.from(new Set([...current, collectionId])));
        setNewCollectionName('');
        setShowCreateInput(false);
        void refreshCollections();
      },
    }
  );

  const handleToggle = (collectionId: string, selected: boolean) => {
    setSelectedIds((current) =>
      selected
        ? Array.from(new Set([...current, collectionId]))
        : current.filter((id) => id !== collectionId)
    );
  };

  const handleShowCreateInput = (show: boolean) => {
    setShowCreateInput(show);
    if (!show) setNewCollectionName('');
  };

  const handleCreateCollection = () => {
    if (loadingCreate) return;
    const collectionName = newCollectionName.trim();
    if (!collectionName) {
      toast.warning(t('favorite.picker.nameRequired'));
      return;
    }
    createCollection(collectionName);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && (loadingConfirm || loadingCreate)) return;
    onOpenChange(open);
  };

  return {
    collections: collections ?? [],
    selectedIds,
    newCollectionName,
    showCreateInput,
    loadingCollections,
    loadingStatus,
    loadingConfirm,
    loadingCreate,
    onOpenChange: handleOpenChange,
    onToggle: handleToggle,
    onConfirm: confirm,
    onShowCreateInput: handleShowCreateInput,
    onNewCollectionNameChange: setNewCollectionName,
    onCreateCollection: handleCreateCollection,
  };
}
