import { EllipsisVertical } from 'lucide-react';

import { Spin } from '@/components/base/Feedback';

import { joinClassNames } from '../TableBase/cellAlign';
import type { TableBodyStateProps } from './index.type';
import styles from './style.module.less';

function TableBodyState({
  title,
  description,
  icon,
  loading = false,
  className,
}: TableBodyStateProps) {
  const iconContent = loading ? (
    <Spin className={styles.icon} size="small" />
  ) : (
    (icon ?? <EllipsisVertical className={styles.icon} size={16} aria-hidden />)
  );

  return (
    <div className={joinClassNames(styles.bodyState, className)} role="status">
      <div className={styles.content}>
        <div className={styles.iconBox}>{iconContent}</div>
        <p className={styles.title}>{title}</p>
        {description ? <p className={styles.description}>{description}</p> : null}
      </div>
    </div>
  );
}

export default TableBodyState;
