import { useFavoriteCollectionPickerController } from './_hooks/useFavoriteCollectionPickerController';
import CollectionPickerModal from './_parts/CollectionPickerModal';
import type { FavoriteCollectionPickerProps } from './index.type';

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
