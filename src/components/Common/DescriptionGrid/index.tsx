import type { CSSProperties } from 'react';
import type { DescriptionGridProps } from './index.type';
import styles from './style.module.less';

function DescriptionGrid({ items, columns = 2, className }: DescriptionGridProps) {
  return (
    <dl
      className={[styles.grid, className].filter(Boolean).join(' ')}
      style={{ '--description-grid-columns': columns } as CSSProperties}
    >
      {items.map((item) => (
        <div key={item.key} className={styles.item}>
          <dt className={styles.label}>{item.label}</dt>
          <dd className={styles.value}>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export default DescriptionGrid;
export type { DescriptionGridItem, DescriptionGridProps } from './index.type';
