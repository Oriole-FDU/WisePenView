import { Spinner } from '@heroui/react';
import { clsx } from 'clsx';

import type { LoadingStateProps } from './index.type';
import styles from './style.module.scss';

function LoadingState({ label, size = 'md', className }: LoadingStateProps) {
  return (
    <div className={clsx(styles.loadingState, className)} aria-busy="true" aria-live="polite">
      <Spinner size={size} />
      {label ? <span className={styles.label}>{label}</span> : null}
    </div>
  );
}

export type { LoadingStateProps } from './index.type';
export default LoadingState;
