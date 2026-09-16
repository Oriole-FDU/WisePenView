import { cn } from '@/utils/cn';

import UserProfile from '../_common/footer/UserProfile';
import SidebarHeader from '../_common/header/SidebarHeader';
import shellStyles from '../_common/sidebarShell.module.less';
import AdminHeaderNav from './AdminHeaderNav';
import styles from './style.module.less';

interface AdminSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

function AdminSidebar({ collapsed, onToggle }: AdminSidebarProps) {
  return (
    <div className={cn(shellStyles.sider, collapsed && shellStyles.collapsed)}>
      <SidebarHeader collapsed={collapsed} onToggle={onToggle} title="WisePen Admin" />
      <div className={styles.navBody}>
        <AdminHeaderNav collapsed={collapsed} />
      </div>
      <UserProfile collapsed={collapsed} menuMode="admin" />
    </div>
  );
}

export default AdminSidebar;
