import { useInfiniteScroll } from 'ahooks';
import { useEffect } from 'react';

import { useInteractService } from '@/domains';
import type { FavoriteItem } from '@/domains/Interact';

const PAGE_SIZE = 20;

interface FavoriteResourcesPage {
  list: FavoriteItem[];
  total: number;
  totalPage: number;
}

export function useFavoriteResources(collectionId: string) {
  const interactService = useInteractService();
  const { data, loading, loadingMore, noMore, loadMore, reload, mutate } =
    useInfiniteScroll<FavoriteResourcesPage>(
      async (current) => {
        const nextPage = Math.floor((current?.list.length ?? 0) / PAGE_SIZE) + 1;
        const result = await interactService.listFavoritedResources({
          collectionId,
          page: nextPage,
          size: PAGE_SIZE,
        });
        return result;
      },
      {
        isNoMore: (result) =>
          Boolean(result && (result.total === 0 || result.list.length >= result.total)),
        reloadDeps: [collectionId],
      }
    );

  /**
   * @wisepen-manual-effect
   * 执行时机：收藏集合切换或重载时，先清空旧页数据，避免短暂展示前一个集合的内容。
   * 不可替代原因：useInfiniteScroll 的 reloadDeps 只负责重新拉取，不会自动清空已累积列表。
   * cleanup：没有订阅或延迟任务，无需清理。
   */
  useEffect(() => {
    mutate(undefined);
  }, [collectionId, mutate]);

  const refresh = () => {
    reload();
  };

  const list = data?.list ?? [];
  const total = data?.total ?? 0;

  return {
    list,
    total,
    loading,
    loadingMore,
    hasMore: Boolean(data) && !noMore,
    loadMore,
    refresh,
  };
}
