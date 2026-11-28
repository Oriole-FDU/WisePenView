export interface FavoriteCollectionPickerProps {
  resourceId: string;
  onOpenChange: (open: boolean) => void;
  onConfirmed: (collectionIds: string[]) => void;
}
