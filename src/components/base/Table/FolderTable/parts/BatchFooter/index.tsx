import { useTranslation } from 'react-i18next';

import { joinClassNames } from '../../../shared/TableBase/cellAlign';
import type { TableBatchFooterProps } from './index.type';
import styles from './style.module.less';

function TableBatchFooter({ selectedCount, summary, children, className }: TableBatchFooterProps) {
  const { t } = useTranslation('table');
  const summaryContent = summary ?? t('summary.selected', { count: selectedCount });

  return (
    <div
      className={joinClassNames(styles.footer, className)}
      role="region"
      aria-label={t('aria.batchActions')}
    >
      <div className={styles.inner}>
        <div className={styles.summary}>{summaryContent}</div>
        {children ? <div className={styles.actions}>{children}</div> : null}
      </div>
    </div>
  );
}

export default TableBatchFooter;
