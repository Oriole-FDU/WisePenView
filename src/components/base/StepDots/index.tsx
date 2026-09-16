import { Check } from 'lucide-react';

import type { StepDotsProps } from './index.type';
import styles from './style.module.less';

function StepDots({ items, current, className }: StepDotsProps) {
  return (
    <ol className={[styles.steps, className].filter(Boolean).join(' ')}>
      {items.map((item, index) => {
        const isCurrent = index === current;
        const isDone = index < current;

        return (
          <li
            key={`${item.title}-${index}`}
            className={[styles.item, isCurrent && styles.active, isDone && styles.done]
              .filter(Boolean)
              .join(' ')}
            aria-current={isCurrent ? 'step' : undefined}
          >
            <span className={styles.dot} aria-hidden="true">
              {isDone ? <Check size={10} strokeWidth={3} /> : null}
            </span>
            <span className={styles.title}>{item.title}</span>
          </li>
        );
      })}
    </ol>
  );
}

export default StepDots;
export type { StepDotItem, StepDotsProps } from './index.type';
