import { useResourceService } from '@/domains';
import type { FavoriteItem } from '@/domains/Resource';
import { useEffectForce } from '@/hooks/useEffectForce';
import { parseErrorMessage } from '@/utils/error';
import { toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { useState } from 'react';

const PAGE_SIZE = 20;

interface UseFavoriteResourcesOptions {
  collectionId?: string;
}

/** 分页查询已收藏资源。collectionId 为空时查询全部收藏内容 */
export function useFavoriteResources({ collectionId }: UseFavoriteResourcesOptions = {}) {
  const resourceService = useResourceService();
  const [page, setPage] = useState(1);

  const { data, loading } = useRequest(
    () => resourceService.listFavoritedResources({ collectionId, page, size: PAGE_SIZE }),
    {
      refreshDeps: [collectionId, page],
      onError: (err) => toast.danger(parseErrorMessage(err)),
    }
  );

  const totalPage = data?.totalPage ?? 0;

  /**
   * 执行时机：切换收藏集合筛选条件时，将分页重置为第一页。
   * cleanup：仅同步本地分页状态，无订阅或异步资源需要释放。
   */
  useEffectForce(() => {
    setPage(1);
  }, [collectionId]);

  /**
   * 执行时机：收藏内容数量变化导致总页数缩小时，纠正当前页码到有效范围内。
   * cleanup：仅同步本地分页状态，无订阅或异步资源需要释放。
   */
  useEffectForce(() => {
    if (totalPage <= 0 || page <= totalPage) return;
    setPage(totalPage);
  }, [page, totalPage]);

  return {
    list: (data?.list ?? []) as FavoriteItem[],
    page,
    totalPage,
    loading,
    canPrev: page > 1,
    canNext: totalPage > 0 && page < totalPage,
    prevPage: () => setPage((current) => Math.max(1, current - 1)),
    nextPage: () =>
      setPage((current) => (totalPage > 0 ? Math.min(totalPage, current + 1) : current + 1)),
  };
}
