import { useState } from 'react';

import type { FavoriteItem } from '@/domains/Interact';
import { useOpenResource } from '@/hooks/useOpenResource';

import { useFavoriteResources } from './useFavoriteResources';

interface UseFavoriteResourceTableControllerOptions {
  collectionId: string;
  onCollectionChanged: () => void;
}

export function useFavoriteResourceTableController({
  collectionId,
  onCollectionChanged,
}: UseFavoriteResourceTableControllerOptions) {
  const navigateResource = useOpenResource();
  const { list, total, loading, loadingMore, hasMore, loadMore, refresh } =
    useFavoriteResources(collectionId);
  const [unfavoriteItem, setUnfavoriteItem] = useState<FavoriteItem>();
  const [manageFavoriteItem, setManageFavoriteItem] = useState<FavoriteItem>();
  const openFavoriteResource = (item: FavoriteItem) => {
    if (!item.resourceInfo) return;
    navigateResource({
      resourceId: item.resourceId,
      resourceType: item.resourceInfo.resourceType,
      resourceName: item.resourceInfo.resourceName,
    });
  };

  const handleRowAction = (item: FavoriteItem, key: string) => {
    if (key === 'open') {
      openFavoriteResource(item);
      return;
    }
    if (key === 'manage') {
      if (item.resourceInfo) setManageFavoriteItem(item);
      return;
    }
    if (key === 'remove') {
      setUnfavoriteItem(item);
    }
  };

  const refreshCollections = () => {
    void refresh();
    onCollectionChanged();
  };

  return {
    list,
    total,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    unfavoriteItem,
    manageFavoriteItem,
    onOpenResource: openFavoriteResource,
    onRowAction: handleRowAction,
    onCloseUnfavorite: () => setUnfavoriteItem(undefined),
    onUnfavoriteSuccess: () => {
      refreshCollections();
    },
    onCloseManageFavorite: () => setManageFavoriteItem(undefined),
    onManageFavoriteSuccess: () => {
      setManageFavoriteItem(undefined);
      refreshCollections();
    },
  };
}
