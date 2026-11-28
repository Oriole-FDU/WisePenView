import { useResourceFavoriteService } from '@/domains';
import { useApi } from '@/hooks/useApi';

export function useFavoriteCollections() {
  const favoriteService = useResourceFavoriteService();
  return useApi(() => favoriteService.listFavoriteCollections(), {
    queryKey: ['favorite-collections'],
  });
}
