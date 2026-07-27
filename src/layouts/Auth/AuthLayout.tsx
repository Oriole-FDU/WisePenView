import loginImage from '@/assets/images/login.png';
import { useTranslation } from 'react-i18next';
import { Outlet } from 'react-router-dom';
import AuthBackground from './AuthBackground';
import styles from './AuthLayout.module.less';

function AuthLayout() {
  const { t } = useTranslation('auth');

  return (
    <main className={styles.root}>
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
