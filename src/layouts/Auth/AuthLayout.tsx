import loginImage from '@/assets/images/login.png';
import { useDesktopWindowState } from '@/hooks/useDesktopWindowState';
import { cn } from '@/utils/cn';
import { useTranslation } from 'react-i18next';
import { Outlet } from 'react-router-dom';
import AuthBackground from './AuthBackground';
import styles from './style.module.less';

function AuthLayout() {
  const { t } = useTranslation('auth');
  const desktopWindow = useDesktopWindowState();
  const titleBarInsetStart =
    desktopWindow.hasTitleBarInset && desktopWindow.titleBarInsetSide === 'start';
  const titleBarInsetEnd =
    desktopWindow.hasTitleBarInset && desktopWindow.titleBarInsetSide === 'end';

  return (
    <main className={styles.root}>
      {desktopWindow.isDesktop ? (
        <div
          className={cn(
            styles.desktopTitleBar,
            titleBarInsetStart && styles.titleBarInsetStart,
            titleBarInsetEnd && styles.titleBarInsetEnd
          )}
          aria-hidden
        />
      ) : null}
      <AuthBackground />
      <div className={styles.authSheet}>
        <img src={loginImage} className={styles.loginImage} alt="" />
        <section className={styles.formSection} aria-label={t('common.formAria')}>
          <Outlet />
        </section>
      </div>
    </main>
  );
}

export default AuthLayout;
