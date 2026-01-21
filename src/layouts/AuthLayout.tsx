import { Outlet } from "react-router-dom";
import { Flex, Layout } from "antd";
import styles from './AuthLayout.module.less';
import loginImage from '@/assets/images/login.png';

const AuthLayout: React.FC = () => {
    return (
        <Layout className={styles.root}>
            <Flex className={styles.authSheet}>
                <img src={loginImage} className={styles.loginImage}/>
                <Flex className={styles.formSection}>
                    <Outlet />
                </Flex>
            </Flex>
        </Layout>
    );
}

export default AuthLayout;  