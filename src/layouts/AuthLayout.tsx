import loginImage from '@/assets/images/login.png';
import { Outlet } from 'react-router-dom';
import AuthBackground from './AuthBackground';
import styles from './AuthLayout.module.less';

function AuthLayout() {
  return (
    <main className={styles.root}>
      <AuthBackground />
      <div className={styles.authSheet}>
        <img src={loginImage} className={styles.loginImage} alt="" />
        <section className={styles.formSection} aria-label="认证表单">
          <Outlet />
        </section>
      </div>
    </main>
  );
}

export default AuthLayout;
