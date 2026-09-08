import { APP_HEADER_NAV_KEY, type AppHeaderNavKey } from '@/bootstrap/routeMeta';
import { APP_ROUTE_PATH } from '@/utils/navigation/appRoute';
import { Bell, Folder, MessageSquarePlus, Users, type LucideIcon } from 'lucide-react';

interface AppHeaderNavItem {
  key: AppHeaderNavKey;
  labelKey: string;
  icon: LucideIcon;
  to: string;
}

export const APP_HEADER_NAV_ITEMS: readonly AppHeaderNavItem[] = [
  {
    key: APP_HEADER_NAV_KEY.CHAT,
    labelKey: 'navigation.newChat',
    icon: MessageSquarePlus,
    to: APP_ROUTE_PATH.CHAT,
  },
  {
    key: APP_HEADER_NAV_KEY.DRIVE,
    labelKey: 'navigation.drive',
    icon: Folder,
    to: APP_ROUTE_PATH.DRIVE_PERSONAL,
  },
  {
    key: APP_HEADER_NAV_KEY.PUBLIC,
    labelKey: 'navigation.groups',
    icon: Users,
    to: APP_ROUTE_PATH.GROUPS,
  },
  {
    key: APP_HEADER_NAV_KEY.NOTIFICATIONS,
    labelKey: 'navigation.notifications',
    icon: Bell,
    to: APP_ROUTE_PATH.NOTIFICATIONS,
  },
];
