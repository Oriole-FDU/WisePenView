import { useResourceFavoriteService } from '@/domains';
import { useApi } from '@/hooks/useApi';

export function useFavoriteCollections() {
  const favoriteService = useResourceFavoriteService();
  const { data, loading, refresh } = useApi(() => favoriteService.listFavoriteCollections(), {});

  return {
    collections: data ?? [],
    hasLoaded: data !== undefined,
    loading,
    refresh,
  };
}
