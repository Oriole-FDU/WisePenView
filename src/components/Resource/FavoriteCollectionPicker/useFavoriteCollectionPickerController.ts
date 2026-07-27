import { useInteractService } from '@/domains';
import { parseErrorMessage } from '@/utils/error';
import { toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

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
  const interactService = useInteractService();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showCreateInput, setShowCreateInput] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const {
    data: collections,
    loading: loadingCollections,
    refresh: refreshCollections,
  } = useRequest(() => interactService.listFavoriteCollections(), {
    onError: (error) => toast.danger(parseErrorMessage(error)),
  });
  const { loading: loadingStatus } = useRequest(
    () => interactService.getFavoriteCollectionIds(resourceId),
    {
      onSuccess: setSelectedIds,
      onError: (error) => toast.danger(parseErrorMessage(error)),
    }
  );

  const { loading: loadingConfirm, run: confirm } = useRequest(
    async () => {
      await interactService.updateFavoriteCollections({ resourceId, collectionIds: selectedIds });
      return interactService.getFavoriteCollectionIds(resourceId);
    },
    {
      manual: true,
      onSuccess: (collectionIds) => {
        onConfirmed(collectionIds);
        onOpenChange(false);
      },
      onError: (error) => toast.danger(parseErrorMessage(error)),
    }
  );

  const { loading: loadingCreate, run: createCollection } = useRequest(
    (collectionName: string) => interactService.createFavoriteCollection({ collectionName }),
    {
      manual: true,
      onSuccess: (collectionId) => {
        setSelectedIds((current) => Array.from(new Set([...current, collectionId])));
        setNewCollectionName('');
        setShowCreateInput(false);
        void refreshCollections();
      },
      onError: (error) => toast.danger(parseErrorMessage(error)),
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
