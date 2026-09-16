import { ToggleButton, Tooltip } from '@heroui/react';
import { Eye, ThumbsUp } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { TOOLTIP_FOCUS_PASSTHROUGH_PROPS } from '@/layouts/_common/a11y/tooltipFocusPassthrough';
import { formatReadCount } from '@/utils/format/formatNumber';

import styles from './style.module.less';

interface ResourceFeedbackSummaryProps {
  readCount?: number | null;
  favoriteCount?: number | null;
  liked: boolean;
  likeCount: number;
  likePending: boolean;
  onLikeChange(liked: boolean): void;
  favoriteAction: ReactNode;
}

function ResourceFeedbackSummary({
  readCount,
  favoriteCount,
  liked,
  likeCount,
  likePending,
  onLikeChange,
  favoriteAction,
}: ResourceFeedbackSummaryProps) {
  const { t } = useTranslation('resource');
  const likeTooltip = liked ? t('comment.unlike') : t('comment.feedback.likeLabel');

  return (
    <section className={styles.feedback} aria-label={t('comment.feedback.statsAria')}>
      <div className={styles.feedbackMetrics}>
        <div
          className={styles.feedbackMetric}
          aria-label={t('comment.feedback.viewCount', {
            count: formatReadCount(readCount),
          })}
        >
          <span className={styles.feedbackMetricIcon} aria-hidden>
            <Eye size={15} />
          </span>
          <span className={styles.feedbackMetricCount}>{formatReadCount(readCount)}</span>
        </div>

        <div
          className={styles.feedbackMetric}
          aria-label={t('comment.feedback.favoriteCount', {
            count: formatReadCount(favoriteCount),
          })}
        >
          {favoriteAction}
          <span className={styles.feedbackMetricCount}>{formatReadCount(favoriteCount)}</span>
        </div>

        <div className={styles.feedbackMetric}>
          <Tooltip>
            <Tooltip.Trigger {...TOOLTIP_FOCUS_PASSTHROUGH_PROPS}>
              <ToggleButton
                variant="ghost"
                size="sm"
                isSelected={liked}
                isDisabled={likePending}
                className={styles.feedbackMetricToggle}
                aria-label={likeTooltip}
                onChange={onLikeChange}
              >
                <ThumbsUp size={15} aria-hidden fill={liked ? 'currentColor' : 'none'} />
              </ToggleButton>
            </Tooltip.Trigger>
            <Tooltip.Content>{likeTooltip}</Tooltip.Content>
          </Tooltip>
          <span className={styles.feedbackMetricCount}>{formatReadCount(likeCount)}</span>
        </div>
      </div>
    </section>
  );
}

export default ResourceFeedbackSummary;
