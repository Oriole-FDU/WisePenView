import type { ReactNode } from 'react';

import styles from './style.module.scss';

interface Props {
  heading: ReactNode;
  action: ReactNode;
  isEmpty: boolean;
  emptyText: string;
  children: ReactNode;
}

export default function SettingsListPanel({
  heading,
  action,
  isEmpty,
  emptyText,
  children,
}: Props) {
  return (
    <div className={styles.block}>
      <div className={styles.panel}>
        <header className={styles.header}>
          <div className={styles.heading}>{heading}</div>
          {action}
        </header>
        <div className={styles.list}>
          {isEmpty ? <div className={styles.empty}>{emptyText}</div> : children}
        </div>
      </div>
    </div>
  );
}
