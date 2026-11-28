import type { FavoriteCollection } from '@/domains/ResourceFavorite';

export interface EditCollectionModalProps {
  onOpenChange: (open: boolean) => void;
  collection: FavoriteCollection | null;
  onSuccess: () => void;
}
