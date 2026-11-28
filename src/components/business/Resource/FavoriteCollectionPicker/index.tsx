import CollectionPickerModal from './_parts/CollectionPickerModal';
import { useFavoriteCollectionPickerController } from './_hooks/useFavoriteCollectionPickerController';

interface FavoriteCollectionPickerProps {
  resourceId: string;
  onOpenChange: (open: boolean) => void;
  onConfirmed: (collectionIds: string[]) => void;
}

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
