import { toast } from '@heroui/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Checkbox } from '@/components/base/Input';
import AppAlertDialog from '@/components/business/AppAlertDialog';
import { useInteractService } from '@/domains';
import { useApi } from '@/hooks/useApi';

interface DeleteCollectionModalProps {
  onOpenChange: (open: boolean) => void;
  collectionId: string;
  collectionName: string | null;
  onSuccess: () => void;
}

function DeleteCollectionModal({
  onOpenChange,
  collectionId,
  collectionName,
  onSuccess,
}: DeleteCollectionModalProps) {
  const { t } = useTranslation(['resource', 'common']);
  const interactService = useInteractService();
  const [keepResources, setKeepResources] = useState(false);
  const { loading, run: remove } = useApi(
    () =>
      interactService.deleteFavoriteCollection({
        collectionId,
        keepResourcesToDefault: keepResources,
      }),
    {
      manual: true,
      onSuccess: () => {
        toast.success(t('favorite.collection.deleteSuccess'));
        onSuccess();
        onOpenChange(false);
      },
    }
  );
  return (
    <AppAlertDialog
      isOpen
      onOpenChange={onOpenChange}
      type="danger"
      title={t('favorite.collection.deleteTitle')}
      description={t('favorite.collection.deleteDescription', {
        name: collectionName ?? t('favorite.picker.defaultCollectionName'),
      })}
      confirmText={t('actions.delete', { ns: 'common' })}
      isConfirmLoading={loading}
      onConfirm={remove}
    >
      <Checkbox isSelected={keepResources} onChange={setKeepResources}>
        <span data-slot="label">{t('favorite.collection.keepResources')}</span>
      </Checkbox>
    </AppAlertDialog>
  );
}

export default DeleteCollectionModal;
