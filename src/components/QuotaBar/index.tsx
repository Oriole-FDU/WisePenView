import { ProgressBar } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import type { QuotaBarProps } from './index.type';
import styles from './style.module.less';

type ProgressColor = 'accent' | 'warning' | 'danger';

function QuotaBar({ used = 0, limit }: QuotaBarProps) {
  const { i18n, t } = useTranslation('group');
  const locale = i18n.resolvedLanguage === 'en-US' ? 'en-US' : 'zh-CN';
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
      aria-label={t('quota.progressAria')}
      className={styles.quotaBar}
      color={getProgressColor()}
      size="sm"
      value={percentage}
      valueLabel={`${used.toLocaleString(locale)} / ${limit.toLocaleString(locale)}`}
    >
      <ProgressBar.Track className={styles.quotaBarTrack}>
        <ProgressBar.Fill />
      </ProgressBar.Track>
      <ProgressBar.Output className={styles.quotaBarText} />
    </ProgressBar>
  );
}

export default QuotaBar;
