import { toast } from '@heroui/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Checkbox } from '@/components/base/Input';
import AppAlertDialog from '@/components/business/AppAlertDialog';
import { useResourceFavoriteService } from '@/domains';
import { useApi } from '@/hooks/useApi';

import type { DeleteCollectionModalProps } from './index.type';

function DeleteCollectionModal({
  onOpenChange,
  collectionId,
  collectionName,
  onSuccess,
}: DeleteCollectionModalProps) {
  const { t } = useTranslation(['resource', 'common']);
  const favoriteService = useResourceFavoriteService();
  const [keepResources, setKeepResources] = useState(false);
  const { loading, run: remove } = useApi(
    () =>
      favoriteService.deleteFavoriteCollection({
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
