export interface FavoriteResourceTableProps {
  collectionId: string;
  collectionName: string;
  collectionItemCount: number;
  onCollectionChanged: () => void;
  emptyDescription: string;
}
