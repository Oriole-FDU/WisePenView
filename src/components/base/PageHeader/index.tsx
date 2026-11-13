import { Heading } from '@heroui/react';
import { clsx } from 'clsx';
import type { ReactNode } from 'react';

import styles from './style.module.scss';

interface PageHeaderProps {
  title: ReactNode;
  actions?: ReactNode;
  leading?: ReactNode;
  titleId?: string;
  className?: string;
  contentClassName?: string;
  actionsClassName?: string;
}

function PageHeader({
  title,
  actions,
  leading,
  titleId,
  className,
  contentClassName,
  actionsClassName,
}: PageHeaderProps) {
  return (
    <div className={clsx(styles.pageHeader, className)}>
      <div className={styles.main}>
        {leading ? <div className={styles.leading}>{leading}</div> : null}
        <div className={clsx(styles.content, contentClassName)}>
          <Heading level={1} id={titleId} className={styles.title}>
            {title}
          </Heading>
        </div>
      </div>
      {actions ? <div className={clsx(styles.actions, actionsClassName)}>{actions}</div> : null}
    </div>
  );
}

export default PageHeader;
