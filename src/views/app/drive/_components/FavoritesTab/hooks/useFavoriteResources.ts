import { useResourceFavoriteService } from '@/domains';
import { useApiInfiniteScroll } from '@/hooks/useApi';

const PAGE_SIZE = 20;

export function useFavoriteResources(collectionId: string) {
  const favoriteService = useResourceFavoriteService();
  const query = useApiInfiniteScroll(
    ({ page, size }) => favoriteService.listFavoritedResources({ collectionId, page, size }),
    {
      queryKey: ['favorite-resources', collectionId],
      pageSize: PAGE_SIZE,
      getKey: (item) => item.resourceId,
    }
  );

  return {
    state: query.state,
    list: query.data?.list ?? [],
    total: query.data?.total ?? 0,
    loading: query.loading,
    loadingMore: query.loadingMore,
    hasMore: query.hasMore,
    loadMore: query.loadMore,
    refresh: query.reload,
    retry: query.retry,
  };
}
