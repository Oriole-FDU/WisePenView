import type { ReactNode } from 'react';

import { cn } from '@/utils/cn';

import styles from './style.module.less';

interface ResourceFrameProps {
  header?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}

function ResourceFrame({ header, children, className, bodyClassName }: ResourceFrameProps) {
  return (
    <div className={cn(styles.root, className)}>
      {header}
      <div className={cn(styles.body, bodyClassName)}>{children}</div>
    </div>
  );
}

export default ResourceFrame;
