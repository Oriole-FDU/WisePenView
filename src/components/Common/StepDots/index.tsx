import type { StepDotsProps } from './index.type';
import styles from './style.module.less';

function StepDots({ items, current, className }: StepDotsProps) {
  return (
    <div className={[styles.steps, className].filter(Boolean).join(' ')}>
      {items.map((item, index) => (
        <div
          key={`${item.title}-${index}`}
          className={[
            styles.item,
            index === current && styles.active,
            index < current && styles.done,
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <span className={styles.dot} aria-hidden />
          <span className={styles.title}>{item.title}</span>
        </div>
      ))}
    </div>
  );
}

export default StepDots;
export type { StepDotItem, StepDotsProps } from './index.type';
