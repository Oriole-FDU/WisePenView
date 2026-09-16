import { Link } from 'react-router-dom';

import type { AppBreadcrumbProps } from './index.type';
import styles from './style.module.less';

function AppBreadcrumb({ items, ariaLabel, className, separator, renderItem }: AppBreadcrumbProps) {
  return (
    <nav className={`${styles.breadcrumb} ${className ?? ''}`} aria-label={ariaLabel}>
      {items.map((item, index) => {
        const isCurrent = item.current ?? index === items.length - 1;
        const content =
          item.to && !isCurrent ? (
            <Link className={styles.link} to={item.to}>
              {item.label}
            </Link>
          ) : (
            <span
              className={isCurrent ? styles.current : styles.label}
              aria-current={isCurrent ? 'page' : undefined}
            >
              {item.label}
            </span>
          );

        return (
          <span key={item.key} className={styles.segment}>
            {index > 0 ? <span className={styles.separator}>{separator ?? '/'}</span> : null}
            {renderItem ? renderItem(content, item, isCurrent) : content}
          </span>
        );
      })}
    </nav>
  );
}

export type { AppBreadcrumbItem, AppBreadcrumbProps } from './index.type';
export default AppBreadcrumb;
