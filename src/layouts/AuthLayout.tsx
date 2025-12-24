import { Outlet } from "react-router-dom";
import { Flex, Layout } from "antd";
import { Link } from "react-router-dom";
import { RiArrowLeftLine } from 'react-icons/ri';
import styles from './AuthLayout.module.less';
import loginImage from '@/assets/images/login.png';

const AuthLayout: React.FC = () => {
    return (
        <Layout className={styles.root}>
            <Flex className={styles.authSheet}>
                <img src={loginImage} style={{borderRight:'1px solid var(--ant-color-border)'}}/>
                <Flex className={styles.formSection}>
                    <Outlet />
                </Flex>
            </Flex>
        </Layout>
    );
}

export default AuthLayout;  