import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/utils/cn';

import styles from './style.module.less';

export interface ErrorPageShellProps {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  size?: 'sm' | 'md' | 'lg';
  showFooter?: boolean;
}

function ErrorPageShell({
  children,
  className,
  contentClassName,
  size = 'sm',
  showFooter = true,
}: ErrorPageShellProps) {
  const { t } = useTranslation('errors');

  return (
    <div className={cn(styles.root, className)}>
      <main className={styles.main}>
        <div className={cn(styles.content, styles[`size${size}`], contentClassName)}>
          {children}
        </div>
      </main>
      {showFooter ? <footer className={styles.footerMini}>{t('page.footer')}</footer> : null}
    </div>
  );
}

export default ErrorPageShell;
