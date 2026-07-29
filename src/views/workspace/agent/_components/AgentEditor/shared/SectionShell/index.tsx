import type { ReactNode } from 'react';
import styles from './style.module.less';
interface Props {
  id: string;
  title: string;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
}
export default function SectionShell({ id, title, description, actions, children }: Props) {
  return (
    <section id={id} className={styles.section}>
      <div className={styles.inner}>
        <header className={styles.header}>
          <div>
            <h2>{title}</h2>
            <p>{description}</p>
          </div>
          {actions}
        </header>
        {children}
      </div>
    </section>
  );
}
