import type { FavoriteCollection } from '@/domains/ResourceFavorite';

export interface CollectionPickerModalProps {
  collections: FavoriteCollection[];
  selectedIds: string[];
  newCollectionName: string;
  showCreateInput: boolean;
  loadingCollections: boolean;
  loadingStatus: boolean;
  loadingConfirm: boolean;
  loadingCreate: boolean;
  onOpenChange: (open: boolean) => void;
  onToggle: (collectionId: string, selected: boolean) => void;
  onConfirm: () => void;
  onShowCreateInput: (show: boolean) => void;
  onNewCollectionNameChange: (name: string) => void;
  onCreateCollection: () => void;
}
