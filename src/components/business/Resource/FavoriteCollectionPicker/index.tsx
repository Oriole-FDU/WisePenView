import { useFavoriteCollectionPickerController } from './_hooks/useFavoriteCollectionPickerController';
import type { FavoriteCollectionPickerProps } from './index.type';
import CollectionPickerModal from './_parts/CollectionPickerModal';

function FavoriteCollectionPicker({
  resourceId,
  onOpenChange,
  onConfirmed,
}: FavoriteCollectionPickerProps) {
  const controller = useFavoriteCollectionPickerController({
    resourceId,
    onOpenChange,
    onConfirmed,
  });
  return <CollectionPickerModal {...controller} />;
}

export default FavoriteCollectionPicker;
