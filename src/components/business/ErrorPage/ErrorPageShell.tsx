import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';

import styles from './ErrorPageShell.module.less';
import type { ErrorPageShellProps } from './index.type';

/** 整页错误页外壳：背景、垂直居中与底部版权，页面级错误视图共用。 */
function ErrorPageShell({
  children,
  className,
  contentClassName,
  size = 'sm',
  showFooter = true,
}: ErrorPageShellProps) {
  const { t } = useTranslation('errors');

  return (
    <div className={clsx(styles.root, className)}>
      <main className={styles.main}>
        <div className={clsx(styles.content, styles[`size${size}`], contentClassName)}>
          {children}
        </div>
      </main>
      {showFooter ? <footer className={styles.footerMini}>{t('page.footer')}</footer> : null}
    </div>
  );
}

export default ErrorPageShell;
