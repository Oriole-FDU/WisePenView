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

import { ADMIN_PAGE_CONFIGS } from '@/views/admin/pages';

import HeaderNav from '../../_common/header/HeaderNav';
import type { HeaderNavSection } from '../../_common/header/HeaderNav/index.type';
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

  const mainItems = MAIN_PAGE_KEYS.map((pageKey) => {
    const page = ADMIN_PAGE_CONFIGS[pageKey];
    return {
      key: page.path,
      name: t(page.titleKey),
      icon: PAGE_ICONS[pageKey],
      onPress: () => navigate(page.path),
    };
  });

  const systemItems = SYSTEM_PAGE_KEYS.map((pageKey) => {
    const page = ADMIN_PAGE_CONFIGS[pageKey];
    return {
      key: page.path,
      name: t(page.titleKey),
      icon: PAGE_ICONS[pageKey],
      onPress: () => navigate(page.path),
    };
  });

  const sections: HeaderNavSection[] = [
    { key: 'admin-main-pages', items: mainItems },
    { key: 'admin-system-pages', items: systemItems },
  ];

  return (
    <HeaderNav
      ariaLabel={t('navigationAria')}
      activeKey={location.pathname}
      collapsed={collapsed}
      sections={sections}
    />
  );
}

export default AdminHeaderNav;
