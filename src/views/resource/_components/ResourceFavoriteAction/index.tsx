import { toast } from '@heroui/react';
import { useState } from 'react';

import FavoriteCollectionPicker from '@/components/business/Resource/FavoriteCollectionPicker';
import { useInteractService } from '@/domains';
import { useApi } from '@/hooks/useApi';
import { parseErrorMessage } from '@/utils/error';

import ResourceFavoriteButton from './ResourceFavoriteButton';

interface ResourceFavoriteActionProps {
  resourceId: string;
  onSuccess?: () => unknown | Promise<unknown>;
  showLabel?: boolean;
}

function ResourceFavoriteAction({
  resourceId,
  onSuccess,
  showLabel = false,
}: ResourceFavoriteActionProps) {
  const interactService = useInteractService();
  const [pickerOpen, setPickerOpen] = useState(false);
  const {
    data: collectionIds,
    loading: loadingStatus,
    mutate: mutateCollectionIds,
  } = useApi(() => interactService.getFavoriteCollectionIds(resourceId), {
    ready: Boolean(resourceId),
    refreshDeps: [resourceId],
  });

  const notifySuccess = () => {
    void Promise.resolve(onSuccess?.()).catch((error) => toast.danger(parseErrorMessage(error)));
  };

  const { loading: loadingUnfavorite, run: unfavorite } = useApi(
    async () => {
      await interactService.updateFavoriteCollections({ resourceId, collectionIds: [] });
      return interactService.getFavoriteCollectionIds(resourceId);
    },
    {
      manual: true,
      onSuccess: (nextCollectionIds) => {
        mutateCollectionIds(nextCollectionIds);
        notifySuccess();
      },
    }
  );

  const handlePress = () => {
    if (collectionIds?.length === 1) {
      unfavorite();
      return;
    }
    setPickerOpen(true);
  };

  return (
    <>
      <ResourceFavoriteButton
        isFavorited={Boolean(collectionIds?.length)}
        isDisabled={loadingStatus || loadingUnfavorite || !collectionIds}
        showLabel={showLabel}
        onPress={handlePress}
      />
      {pickerOpen ? (
        <FavoriteCollectionPicker
          key={resourceId}
          resourceId={resourceId}
          onOpenChange={setPickerOpen}
          onConfirmed={(nextCollectionIds) => {
            mutateCollectionIds(nextCollectionIds);
            notifySuccess();
          }}
        />
      ) : null}
    </>
  );
}

export default ResourceFavoriteAction;
