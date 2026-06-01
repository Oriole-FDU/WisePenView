import clsx from 'clsx';
import { useCallback, useRef } from 'react';
import SidebarHeader from '../_common/SidebarHeader';
import UserProfile from '../_common/UserProfile';
import styles from '../_common/sidebarShell.module.less';
import AppHeaderNav from './AppHeaderNav';
import AppSessionMenu, { type AppSessionMenuRef } from './AppSessionMenu';
import type { AppSidebarProps } from './index.type';

function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
  const sessionMenuRef = useRef<AppSessionMenuRef>(null);

  const handleSessionCreated = useCallback((sessionId: string, sessionTitle: string) => {
    void sessionMenuRef.current?.handleCreatedSession(sessionId, sessionTitle);
  }, []);

  return (
    <div className={clsx(styles.sider, collapsed && styles.collapsed)}>
      <SidebarHeader
        collapsed={collapsed}
        onToggle={onToggle}
        nav={<AppHeaderNav collapsed={collapsed} onSessionCreated={handleSessionCreated} />}
      />
      <AppSessionMenu ref={sessionMenuRef} collapsed={collapsed} />
      <UserProfile collapsed={collapsed} />
    </div>
  );
}

export default AppSidebar;
