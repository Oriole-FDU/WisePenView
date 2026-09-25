import { Heading, Paragraph } from '@heroui/react';
import { clsx } from 'clsx';
import type { ReactNode } from 'react';

import styles from './style.module.less';

interface PageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  leading?: ReactNode;
  titleId?: string;
  className?: string;
  contentClassName?: string;
  actionsClassName?: string;
}

function PageHeader({
  title,
  subtitle,
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
          {subtitle ? (
            <Paragraph size="sm" color="muted" className={styles.subtitle}>
              {subtitle}
            </Paragraph>
          ) : null}
        </div>
      </div>
      {actions ? <div className={clsx(styles.actions, actionsClassName)}>{actions}</div> : null}
    </div>
  );
}

export default PageHeader;
