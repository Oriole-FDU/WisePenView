import React, { useState } from 'react';
import { Layout } from 'antd';
import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';
import ChatPanel from '@/components/ChatPanel';
import styles from './SystemLayout.module.less';

const { Content, Sider } = Layout;

const SystemLayout: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <Layout className={styles.root}>
      {/* 左侧 Sidebar */}
      <Sider className={styles.leftSider} width={240} theme="light" collapsed={sidebarCollapsed}>
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </Sider>

      {/* 中间布局 */}
      <Layout className={styles.middleLayout}>
        <Content className={styles.middleContent}>
          <Outlet />
        </Content>
      </Layout>

      {/* 右侧 AI Panel */}
      <Sider
        className={styles.rightSider}
        width={380}
        theme="light"
        collapsedWidth={0}
        trigger={null}
      >
        <div className={styles.rightSiderInner}>
          <ChatPanel />
        </div>
      </Sider>
    </Layout>
  );
};

export default SystemLayout;
