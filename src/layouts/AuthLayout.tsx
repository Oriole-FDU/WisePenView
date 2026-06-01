import loginImage from '@/assets/images/login.png';
import { Flex, Layout } from 'antd';
import { Outlet } from 'react-router-dom';
import AuthBackground from './AuthBackground';
import styles from './AuthLayout.module.less';

function AuthLayout() {
  return (
    <Layout className={styles.root}>
      <AuthBackground />
      <Flex className={styles.authSheet}>
        <img src={loginImage} className={styles.loginImage} alt="" />
        <Flex className={styles.formSection}>
          <Outlet />
        </Flex>
      </Flex>
    </Layout>
  );
}

export default AuthLayout;
