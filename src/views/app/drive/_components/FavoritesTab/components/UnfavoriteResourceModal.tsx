import AppAlertDialog from '@/components/Overlay/AppAlertDialog';
import { useInteractService } from '@/domains';
import type { FavoriteItem } from '@/domains/Interact';
import { parseErrorMessage } from '@/utils/error';
import { toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { useTranslation } from 'react-i18next';

interface UnfavoriteResourceModalProps {
  item: FavoriteItem | undefined;
  collectionId: string;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

function UnfavoriteResourceModal({
  item,
  collectionId,
  onOpenChange,
  onSuccess,
}: UnfavoriteResourceModalProps) {
  const { t } = useTranslation('resource');
  const interactService = useInteractService();
  const { loading, run: unfavorite } = useRequest(
    async () => {
      if (!item) return;
      const collectionIds = await interactService.getFavoriteCollectionIds(item.resourceId);
      return interactService.updateFavoriteCollections({
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
      onError: (error) => toast.danger(parseErrorMessage(error)),
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
