import { toast } from '@heroui/react';
import { useTranslation } from 'react-i18next';

import AppAlertDialog from '@/components/business/AppAlertDialog';
import { useResourceFavoriteService } from '@/domains';
import { useApi } from '@/hooks/useApi';

import type { UnfavoriteResourceModalProps } from './index.type';

function UnfavoriteResourceModal({
  item,
  collectionId,
  onOpenChange,
  onSuccess,
}: UnfavoriteResourceModalProps) {
  const { t } = useTranslation('resource');
  const favoriteService = useResourceFavoriteService();
  const { loading, run: unfavorite } = useApi(
    async () => {
      if (!item) return;
      const collectionIds = await favoriteService.getFavoriteCollectionIds(item.resourceId);
      return favoriteService.updateFavoriteCollections({
        resourceId: item.resourceId,
        collectionIds: collectionIds.filter((id) => id !== collectionId),
      });
    },
    {
      manual: true,
      onSuccess: () => {
        toast.success(t('favorite.resource.removeSuccess'));
        onSuccess();
        onOpenChange(false);
      },
    }
  );

  return (
    <AppAlertDialog
      isOpen={Boolean(item)}
      onOpenChange={onOpenChange}
      type="danger"
      title={t('favorite.resource.removeTitle')}
      description={t('favorite.resource.removeDescription', {
        name: item?.resourceInfo?.resourceName ?? t('favorite.resource.resourceFallback'),
      })}
      confirmText={t('favorite.resource.remove')}
      isConfirmLoading={loading}
      onConfirm={unfavorite}
    />
  );
}

export default UnfavoriteResourceModal;
