import Rating from '@/components/Rating';
import { useResourceService } from '@/domains';
import { parseErrorMessage } from '@/utils/error';
import { formatReadCount } from '@/utils/format/formatNumber';
import ResourceFavoriteButton from '@/views/workspace/_common/ResourceFavoriteButton';
import { Separator, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { Bookmark, Eye, Heart, Star, ThumbsUp } from 'lucide-react';
import { useState } from 'react';
import type { ResourceDiscussionPanelProps } from './index.type';
import styles from './style.module.less';

interface OptimisticLikeState {
  resourceId: string;
  baseCount: number;
  count: number;
  liked: boolean;
}

interface OptimisticRateState {
  resourceId: string;
  score: number;
}

function ResourceDiscussionPanel({ resource, onInteractionSuccess }: ResourceDiscussionPanelProps) {
  const resourceService = useResourceService();
  const [optimisticLike, setOptimisticLike] = useState<OptimisticLikeState>();
  const [optimisticRate, setOptimisticRate] = useState<OptimisticRateState>();
  const resourceId = resource.resourceId;
  const resourceLikeCount = resource.likeCount ?? 0;
  const activeOptimisticLike =
    optimisticLike?.resourceId === resourceId && optimisticLike.baseCount === resourceLikeCount
      ? optimisticLike
      : undefined;
  const activeOptimisticRate =
    optimisticRate?.resourceId === resourceId ? optimisticRate : undefined;

  const { data: likeStatus, refresh: refreshLikeStatus } = useRequest(
    () => resourceService.getLikeStatus(resourceId),
    {
      ready: Boolean(resourceId),
      refreshDeps: [resourceId],
    }
  );
  const resolvedLiked = activeOptimisticLike?.liked ?? likeStatus?.liked ?? false;
  const resolvedLikeCount = activeOptimisticLike?.count ?? resourceLikeCount;

  const { run: toggleLike, loading: toggleLikeLoading } = useRequest(
    async (nextLiked: boolean) => {
      await resourceService.interactToggleLike({ resourceId });
      return nextLiked;
    },
    {
      manual: true,
      onSuccess: () => {
        void Promise.resolve(onInteractionSuccess?.()).finally(refreshLikeStatus);
      },
      onError: (error) => {
        setOptimisticLike(undefined);
        toast.danger(parseErrorMessage(error));
      },
    }
  );

  const { data: rate, refresh: refreshRate } = useRequest(
    () => resourceService.getRate(resourceId),
    {
      ready: Boolean(resourceId),
      refreshDeps: [resourceId],
    }
  );
  const resolvedScore = activeOptimisticRate?.score ?? rate?.score ?? 0;

  const { run: rateResource, loading: rateLoading } = useRequest(
    async (score: number) => {
      await resourceService.interactRate({ resourceId, score });
      return score;
    },
    {
      manual: true,
      onSuccess: () => {
        void Promise.resolve(onInteractionSuccess?.()).finally(refreshRate);
      },
      onError: (error) => {
        setOptimisticRate(undefined);
        toast.danger(parseErrorMessage(error));
      },
    }
  );

  const handleLikeChange = (nextLiked: boolean) => {
    const currentCount = activeOptimisticLike?.count ?? resourceLikeCount;
    setOptimisticLike({
      resourceId,
      baseCount: resourceLikeCount,
      count: Math.max(0, currentCount + (nextLiked ? 1 : -1)),
      liked: nextLiked,
    });
    toggleLike(nextLiked);
  };

  const handleRateChange = (score: number) => {
    setOptimisticRate({ resourceId, score });
    rateResource(score);
  };

  const scoreAvgText = resource.scoreAvg == null ? '暂无' : `${resource.scoreAvg.toFixed(1)} 分`;
  const rateActive = resolvedScore > 0;

  return (
    <aside className={styles.panel} aria-label="资源讨论">
      <div className={styles.header}>
        <div className={styles.headerCopy}>
          <h2 className={styles.title}>资源概览与互动</h2>
          <p className={styles.subtitle}>收藏、点赞与评分</p>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.stats} aria-label="资源互动统计">
          <span className={styles.statItem}>
            <Eye size={15} aria-hidden />
            <span className={styles.statValue}>{formatReadCount(resource.readCount)}</span>
            <span className={styles.statLabel}>浏览</span>
          </span>
          <span className={styles.statItem}>
            <Heart size={15} aria-hidden />
            <span className={styles.statValue}>{formatReadCount(resolvedLikeCount)}</span>
            <span className={styles.statLabel}>点赞</span>
          </span>
          <span className={styles.statItem}>
            <Bookmark size={15} aria-hidden />
            <span className={styles.statValue}>{formatReadCount(resource.favoriteCount)}</span>
            <span className={styles.statLabel}>收藏</span>
          </span>
          <span className={styles.statItem}>
            <Star size={15} aria-hidden fill={rateActive ? 'currentColor' : 'none'} />
            <span className={styles.statValue}>{scoreAvgText}</span>
            <span className={styles.statLabel}>均分</span>
          </span>
        </div>

        <Separator />

        <div className={styles.actionList}>
          <ResourceFavoriteButton
            resourceId={resourceId}
            variant="panel"
            onSuccess={onInteractionSuccess}
          />

          <button
            type="button"
            className={`${styles.actionButton} ${resolvedLiked ? styles.actionButtonActive : ''}`}
            aria-pressed={resolvedLiked}
            disabled={toggleLikeLoading}
            onClick={() => handleLikeChange(!resolvedLiked)}
          >
            <span className={styles.actionButtonMain}>
              <span
                className={`${styles.actionIconWrap} ${
                  resolvedLiked ? styles.actionIconWrapActive : ''
                }`}
              >
                <ThumbsUp size={16} aria-hidden fill={resolvedLiked ? 'currentColor' : 'none'} />
              </span>
              <span className={styles.actionCopy}>
                <span className={styles.actionTitle}>{resolvedLiked ? '已点赞' : '点赞'}</span>
                <span className={styles.actionDescription}>觉得有帮助</span>
              </span>
            </span>
          </button>
        </div>

        <div className={`${styles.rateCard} ${rateActive ? styles.rateCardActive : ''}`}>
          <div className={styles.rateCardMain}>
            <span
              className={`${styles.actionIconWrap} ${rateActive ? styles.actionIconWrapWarning : ''}`}
            >
              <Star size={16} aria-hidden fill={rateActive ? 'currentColor' : 'none'} />
            </span>
            <span className={styles.actionCopy}>
              <span className={styles.actionTitle}>你的评分</span>
              <span className={styles.actionDescription}>给资源质量打个分</span>
            </span>
          </div>
          <Rating
            value={resolvedScore}
            size="sm"
            isDisabled={rateLoading}
            ariaLabel="资源评分"
            onValueChange={handleRateChange}
          />
        </div>
      </div>
    </aside>
  );
}

export default ResourceDiscussionPanel;
