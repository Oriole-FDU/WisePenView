import { ADMIN_PAGE_CONFIGS } from '@/views/admin/pages';
import { ListBox, ListBoxItem, ListBoxSection } from '@heroui/react';
import clsx from 'clsx';
import {
  RiFileList3Line,
  RiGroupLine,
  RiLockPasswordLine,
  RiMegaphoneLine,
  RiSettings3Line,
  RiShieldKeyholeLine,
  RiStackLine,
  RiTaskLine,
  RiUserSettingsLine,
} from 'react-icons/ri';
import { useLocation, useNavigate } from 'react-router-dom';
import styles from '../../AppSidebar/AppHeaderNav/style.module.less';
import type { AdminHeaderNavProps } from './index.type';

const { users, resources, groups, announcements, statistics, permissions, settings, logs, tasks } =
  ADMIN_PAGE_CONFIGS;

function AdminHeaderNav({ collapsed }: AdminHeaderNavProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const selectedKeys = [location.pathname];

  return (
    <ListBox
      aria-label="管理后台导航"
      selectionMode="single"
      selectedKeys={selectedKeys}
      className={clsx(styles.headerMenu, collapsed && styles.headerMenuCollapsed)}
    >
      <ListBoxSection id="admin-main-pages" className={styles.menuSection}>
        <ListBoxItem
          id={users.path}
          textValue={users.title}
          className={clsx(styles.menuItem, collapsed && styles.menuItemCollapsed)}
          onPress={() => navigate(users.path)}
        >
          <span className={styles.menuIcon}>
            <RiUserSettingsLine size={18} />
          </span>
          {!collapsed && <span className={styles.menuLabel}>{users.title}</span>}
        </ListBoxItem>
        <ListBoxItem
          id={resources.path}
          textValue={resources.title}
          className={clsx(styles.menuItem, collapsed && styles.menuItemCollapsed)}
          onPress={() => navigate(resources.path)}
        >
          <span className={styles.menuIcon}>
            <RiFileList3Line size={18} />
          </span>
          {!collapsed && <span className={styles.menuLabel}>{resources.title}</span>}
        </ListBoxItem>
        <ListBoxItem
          id={groups.path}
          textValue={groups.title}
          className={clsx(styles.menuItem, collapsed && styles.menuItemCollapsed)}
          onPress={() => navigate(groups.path)}
        >
          <span className={styles.menuIcon}>
            <RiGroupLine size={18} />
          </span>
          {!collapsed && <span className={styles.menuLabel}>{groups.title}</span>}
        </ListBoxItem>
        <ListBoxItem
          id={announcements.path}
          textValue={announcements.title}
          className={clsx(styles.menuItem, collapsed && styles.menuItemCollapsed)}
          onPress={() => navigate(announcements.path)}
        >
          <span className={styles.menuIcon}>
            <RiMegaphoneLine size={18} />
          </span>
          {!collapsed && <span className={styles.menuLabel}>{announcements.title}</span>}
        </ListBoxItem>
        <ListBoxItem
          id={statistics.path}
          textValue={statistics.title}
          className={clsx(styles.menuItem, collapsed && styles.menuItemCollapsed)}
          onPress={() => navigate(statistics.path)}
        >
          <span className={styles.menuIcon}>
            <RiStackLine size={18} />
          </span>
          {!collapsed && <span className={styles.menuLabel}>{statistics.title}</span>}
        </ListBoxItem>
      </ListBoxSection>
      <ListBoxSection id="admin-system-pages" className={styles.menuSection}>
        <ListBoxItem
          id={permissions.path}
          textValue={permissions.title}
          className={clsx(styles.menuItem, collapsed && styles.menuItemCollapsed)}
          onPress={() => navigate(permissions.path)}
        >
          <span className={styles.menuIcon}>
            <RiShieldKeyholeLine size={18} />
          </span>
          {!collapsed && <span className={styles.menuLabel}>{permissions.title}</span>}
        </ListBoxItem>
        <ListBoxItem
          id={settings.path}
          textValue={settings.title}
          className={clsx(styles.menuItem, collapsed && styles.menuItemCollapsed)}
          onPress={() => navigate(settings.path)}
        >
          <span className={styles.menuIcon}>
            <RiSettings3Line size={18} />
          </span>
          {!collapsed && <span className={styles.menuLabel}>{settings.title}</span>}
        </ListBoxItem>
        <ListBoxItem
          id={logs.path}
          textValue={logs.title}
          className={clsx(styles.menuItem, collapsed && styles.menuItemCollapsed)}
          onPress={() => navigate(logs.path)}
        >
          <span className={styles.menuIcon}>
            <RiLockPasswordLine size={18} />
          </span>
          {!collapsed && <span className={styles.menuLabel}>{logs.title}</span>}
        </ListBoxItem>
        <ListBoxItem
          id={tasks.path}
          textValue={tasks.title}
          className={clsx(styles.menuItem, collapsed && styles.menuItemCollapsed)}
          onPress={() => navigate(tasks.path)}
        >
          <span className={styles.menuIcon}>
            <RiTaskLine size={18} />
          </span>
          {!collapsed && <span className={styles.menuLabel}>{tasks.title}</span>}
        </ListBoxItem>
      </ListBoxSection>
    </ListBox>
  );
}

export default AdminHeaderNav;
