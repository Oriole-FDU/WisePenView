import { Spinner } from '@heroui/react';
import { clsx } from 'clsx';

import type { HeroSpinnerSize, SpinProps, SpinSize } from './index.type';
import styles from './style.module.scss';

const SPIN_SIZE_MAP: Record<SpinSize, HeroSpinnerSize> = {
  small: 'sm',
  default: 'md',
  large: 'lg',
};

function Spin({ size = 'default', spinning = true, tip, children, className }: SpinProps) {
  const spinner = <Spinner size={SPIN_SIZE_MAP[size]} />;

  if (children !== undefined) {
    return (
      <div className={clsx(styles.wrapper, !spinning && styles.wrapperIdle, className)}>
        {children}
        {spinning ? (
          <div className={styles.overlay} aria-busy="true" aria-live="polite">
            <div className={styles.overlayContent}>
              {spinner}
              {tip ? <span className={styles.label}>{tip}</span> : null}
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  if (!spinning) return null;

  if (tip) {
    return (
      <div className={clsx(styles.loadingState, className)} aria-busy="true" aria-live="polite">
        {spinner}
        <span className={styles.label}>{tip}</span>
      </div>
    );
  }

  return (
    <span className={clsx(styles.inline, className)} aria-busy="true" aria-live="polite">
      {spinner}
    </span>
  );
}

export type { SpinProps, SpinSize } from './index.type';
export default Spin;
