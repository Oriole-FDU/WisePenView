import type { FavoriteItem } from '@/domains/ResourceFavorite';

export interface UnfavoriteResourceModalProps {
  item: FavoriteItem | undefined;
  collectionId: string;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}
