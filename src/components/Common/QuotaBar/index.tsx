import { ProgressBar } from '@heroui/react';
import type { QuotaBarProps } from './index.type';
import styles from './style.module.less';

type ProgressColor = 'accent' | 'warning' | 'danger';

function QuotaBar({ used = 0, limit }: QuotaBarProps) {
  const percentage = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;

  const getProgressColor = (): ProgressColor => {
    if (percentage >= 100) {
      return 'danger';
    } else if (percentage >= 80) {
      return 'warning';
    } else {
      return 'accent';
    }
  };

  return (
    <ProgressBar
      aria-label="额度使用进度"
      className={styles.quotaBar}
      color={getProgressColor()}
      size="sm"
      value={percentage}
      valueLabel={`${used.toLocaleString()} / ${limit.toLocaleString()}`}
    >
      <ProgressBar.Track className={styles.quotaBarTrack}>
        <ProgressBar.Fill />
      </ProgressBar.Track>
      <ProgressBar.Output className={styles.quotaBarText} />
    </ProgressBar>
  );
}

export default QuotaBar;
