import { clsx } from 'clsx';

import type { ContentStateProps } from './index.type';
import styles from './style.module.scss';

function ContentState({
  action,
  className,
  description,
  icon,
  size = 'default',
  title,
  tone,
}: ContentStateProps) {
  return (
    <div
      className={clsx(
        styles.contentState,
        styles[size],
        tone === 'danger' && styles.danger,
        className
      )}
      role={tone === 'danger' ? 'alert' : undefined}
    >
      {icon ? <div className={styles.icon}>{icon}</div> : null}
      <div className={styles.title}>{title}</div>
      {description ? <p className={styles.description}>{description}</p> : null}
      {action ? <div className={styles.action}>{action}</div> : null}
    </div>
  );
}

export type { ContentStateProps, ContentStateSize } from './index.type';
export default ContentState;
