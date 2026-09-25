import { Heading, Paragraph } from '@heroui/react';
import type { ReactNode } from 'react';

import { cn } from '@/utils/cn';

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
    <div className={cn(styles.pageHeader, className)}>
      <div className={styles.main}>
        {leading ? <div className={styles.leading}>{leading}</div> : null}
        <div className={cn(styles.content, contentClassName)}>
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
      {actions ? <div className={cn(styles.actions, actionsClassName)}>{actions}</div> : null}
    </div>
  );
}

export default PageHeader;
