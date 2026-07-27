import Rating from '@/components/Rating';
import { formatReadCount } from '@/utils/format/formatNumber';
import { ToggleButton } from '@heroui/react';
import { Bookmark, Eye, Star, ThumbsUp } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './style.module.less';

interface ResourceFeedbackSummaryProps {
  readCount?: number | null;
  favoriteCount?: number | null;
  scoreAvg?: number | null;
  liked: boolean;
  likeCount: number;
  score: number;
  likePending: boolean;
  ratePending: boolean;
  onLikeChange(liked: boolean): void;
  onRateChange(score: number): void;
  favoriteAction: ReactNode;
}

function ResourceFeedbackSummary({
  readCount,
  favoriteCount,
  scoreAvg,
  liked,
  likeCount,
  score,
  likePending,
  ratePending,
  onLikeChange,
  onRateChange,
  favoriteAction,
}: ResourceFeedbackSummaryProps) {
  const { t } = useTranslation('resource');
  const scoreAvgText =
    scoreAvg != null && Number.isFinite(scoreAvg)
      ? t('comment.feedback.averageScore', { score: scoreAvg.toFixed(1) })
      : t('comment.feedback.noScore');

  return (
    <>
      <div className={styles.stats} aria-label={t('comment.feedback.statsAria')}>
        <span className={styles.statItem}>
          <Eye size={14} aria-hidden />
          <span>{t('comment.feedback.viewCount', { count: formatReadCount(readCount) })}</span>
        </span>
        <span className={styles.statItem}>
          <Bookmark size={14} aria-hidden />
          <span>
            {t('comment.feedback.favoriteCount', { count: formatReadCount(favoriteCount) })}
          </span>
        </span>
        <span className={styles.statItem}>
          <Star size={14} aria-hidden />
          <span>{scoreAvgText}</span>
        </span>
      </div>

      <section className={styles.feedback} aria-labelledby="resource-feedback-title">
        <h3 id="resource-feedback-title" className={styles.sectionTitle}>
          {t('comment.feedback.title')}
        </h3>
        <div className={styles.feedbackActions}>
          {favoriteAction}
          <ToggleButton
            variant="ghost"
            size="sm"
            isSelected={liked}
            isDisabled={likePending}
            className={styles.helpfulButton}
            onChange={onLikeChange}
          >
            <ThumbsUp size={14} aria-hidden fill={liked ? 'currentColor' : 'none'} />
            <span className={styles.helpfulCount}>{formatReadCount(likeCount)}</span>
          </ToggleButton>
          <Rating
            value={score}
            size="sm"
            isDisabled={ratePending}
            ariaLabel={t('comment.feedback.ratingAria')}
            onValueChange={onRateChange}
          />
        </div>
      </section>
    </>
  );
}

export default ResourceFeedbackSummary;
