import AdminSidebar from '@/components/Sidebar/AdminSidebar';
import clsx from 'clsx';
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import styles from './AdminLayout.module.less';

function AdminLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className={styles.root}>
      <aside
        className={clsx(styles.leftSider, sidebarCollapsed && styles.leftSiderCollapsed)}
        aria-label="管理侧边栏"
      >
        <AdminSidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </aside>

      <div className={styles.middleLayout}>
        <main className={styles.middleContent}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;
