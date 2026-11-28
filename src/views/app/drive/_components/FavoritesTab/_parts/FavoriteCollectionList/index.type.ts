import type { FavoriteCollection } from '@/domains/ResourceFavorite';

export interface FavoriteCollectionListProps {
  collections: FavoriteCollection[];
  selectedCollectionId?: string;
  onSelect: (collectionId: string) => void;
  onCreate: () => void;
  onEdit: (collection: FavoriteCollection) => void;
  onDelete: (collection: FavoriteCollection) => void;
}
