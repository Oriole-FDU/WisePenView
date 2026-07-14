import clsx from 'clsx';
import type { ReactNode } from 'react';
import styles from './style.module.less';

interface ZenResourceFrameProps {
  header?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}

function ZenResourceFrame({ header, children, className, bodyClassName }: ZenResourceFrameProps) {
  return (
    <div className={clsx(styles.root, className)}>
      {header}
      <div className={clsx(styles.body, bodyClassName)}>{children}</div>
    </div>
  );
}

export default ZenResourceFrame;
