import { ADMIN_PAGE_CONFIGS } from '@/views/admin/pages';
import { ListBox, ListBoxItem, ListBoxSection } from '@heroui/react';
import clsx from 'clsx';
import {
  Layers,
  List,
  ListTodo,
  LockKeyhole,
  Megaphone,
  Settings,
  Shield,
  UserCog,
  Users,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import styles from '../../AppSidebar/AppHeaderNav/style.module.less';
import type { AdminHeaderNavProps } from './index.type';

const MAIN_PAGE_KEYS = ['users', 'resources', 'groups', 'announcements', 'statistics'] as const;
const SYSTEM_PAGE_KEYS = ['permissions', 'settings', 'logs', 'tasks'] as const;
const PAGE_ICONS = {
  users: UserCog,
  resources: List,
  groups: Users,
  announcements: Megaphone,
  statistics: Layers,
  permissions: Shield,
  settings: Settings,
  logs: LockKeyhole,
  tasks: ListTodo,
} as const;

function AdminHeaderNav({ collapsed }: AdminHeaderNavProps) {
  const { t } = useTranslation('admin');
  const navigate = useNavigate();
  const location = useLocation();

  const selectedKeys = [location.pathname];

  return (
    <ListBox
      aria-label={t('navigationAria')}
      selectionMode="single"
      selectedKeys={selectedKeys}
      className={clsx(styles.headerMenu, collapsed && styles.headerMenuCollapsed)}
    >
      <ListBoxSection id="admin-main-pages" className={styles.menuSection}>
        {MAIN_PAGE_KEYS.map((pageKey) => {
          const page = ADMIN_PAGE_CONFIGS[pageKey];
          const Icon = PAGE_ICONS[pageKey];
          const title = t(page.titleKey);
          return (
            <ListBoxItem
              key={pageKey}
              id={page.path}
              textValue={title}
              className={clsx(styles.menuItem, collapsed && styles.menuItemCollapsed)}
              onPress={() => navigate(page.path)}
            >
              <span className={styles.menuIcon}>
                <Icon size={18} />
              </span>
              {!collapsed && <span className={styles.menuLabel}>{title}</span>}
            </ListBoxItem>
          );
        })}
      </ListBoxSection>
      <ListBoxSection id="admin-system-pages" className={styles.menuSection}>
        {SYSTEM_PAGE_KEYS.map((pageKey) => {
          const page = ADMIN_PAGE_CONFIGS[pageKey];
          const Icon = PAGE_ICONS[pageKey];
          const title = t(page.titleKey);
          return (
            <ListBoxItem
              key={pageKey}
              id={page.path}
              textValue={title}
              className={clsx(styles.menuItem, collapsed && styles.menuItemCollapsed)}
              onPress={() => navigate(page.path)}
            >
              <span className={styles.menuIcon}>
                <Icon size={18} />
              </span>
              {!collapsed && <span className={styles.menuLabel}>{title}</span>}
            </ListBoxItem>
          );
        })}
      </ListBoxSection>
    </ListBox>
  );
}

export default AdminHeaderNav;
