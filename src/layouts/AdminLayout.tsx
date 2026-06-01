import AdminSidebar from '@/components/Sidebar/AdminSidebar';
import { Layout } from 'antd';
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import styles from './AdminLayout.module.less';

const { Content, Sider } = Layout;

function AdminLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <Layout className={styles.root}>
      <Sider className={styles.leftSider} width={308} theme="light" collapsed={sidebarCollapsed}>
        <AdminSidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </Sider>

      <Layout className={styles.middleLayout}>
        <Content className={styles.middleContent}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}

export default AdminLayout;
