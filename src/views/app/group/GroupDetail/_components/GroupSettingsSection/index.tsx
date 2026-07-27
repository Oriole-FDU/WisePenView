import type { ReactNode } from 'react';
import styles from './style.module.less';

interface GroupSettingsSectionProps {
  title: string;
  compact?: boolean;
  actions?: ReactNode;
  children: ReactNode;
}

function GroupSettingsSection({
  title,
  compact = false,
  actions,
  children,
}: GroupSettingsSectionProps) {
  return (
    <section className={compact ? `${styles.section} ${styles.compact}` : styles.section}>
      <header className={styles.header}>
        <h2 className={styles.title}>{title}</h2>
        {actions ? <div className={styles.actions}>{actions}</div> : null}
      </header>
      {children}
    </section>
  );
}

export default GroupSettingsSection;
