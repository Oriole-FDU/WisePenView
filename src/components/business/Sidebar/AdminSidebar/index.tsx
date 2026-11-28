import UserProfile from '../_common/footer/UserProfile';
import SidebarHeader from '../_common/header/SidebarHeader';
import shellStyles from '../_common/style.module.scss';
import AdminHeaderNav from './_parts/AdminHeaderNav';
import type { AdminSidebarProps } from './index.type';
import styles from './style.module.scss';

function AdminSidebar({
  onToggle,
  collapsed = false,
  motionPhase = collapsed ? 'collapsed' : 'expanded',
}: AdminSidebarProps) {
  const labelsHidden = motionPhase !== 'expanded';
  const railLayout = motionPhase === 'collapsed';

  return (
    <div
      className={shellStyles.sider}
      data-sidebar-phase={motionPhase}
      data-sidebar-compact={railLayout || undefined}
      data-sidebar-labels-hidden={labelsHidden || undefined}
    >
      <SidebarHeader
        collapsed={railLayout}
        labelsHidden={labelsHidden}
        onToggle={onToggle}
        title="WisePen Admin"
      />
      <div className={styles.navBody}>
        <AdminHeaderNav collapsed={railLayout} labelsHidden={labelsHidden} />
      </div>
      <div className={shellStyles.sidebarFooter}>
        <UserProfile collapsed={railLayout} labelsHidden={labelsHidden} menuMode="admin" />
      </div>
    </div>
  );
}

export default AdminSidebar;
