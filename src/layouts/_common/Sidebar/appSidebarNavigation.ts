import { FileText, MessageSquarePlus, Users, type LucideIcon } from 'lucide-react';

export const APP_HEADER_NAV_KEY = {
  CHAT: '/app/chat',
  DRIVE: '/app/drive/personal',
  GROUP: '/app/my-group',
} as const;

export type AppHeaderNavKey = (typeof APP_HEADER_NAV_KEY)[keyof typeof APP_HEADER_NAV_KEY];

interface AppHeaderNavItem {
  key: AppHeaderNavKey;
  labelKey: string;
  icon: LucideIcon;
  routePrefixes: readonly string[];
}

export const APP_HEADER_NAV_ITEMS: readonly AppHeaderNavItem[] = [
  {
    key: APP_HEADER_NAV_KEY.CHAT,
    labelKey: 'navigation.newChat',
    icon: MessageSquarePlus,
    routePrefixes: ['/app/chat'],
  },
  {
    key: APP_HEADER_NAV_KEY.DRIVE,
    labelKey: 'navigation.drive',
    icon: FileText,
    routePrefixes: ['/app/drive', '/app/workspace'],
  },
  {
    key: APP_HEADER_NAV_KEY.GROUP,
    labelKey: 'navigation.groups',
    icon: Users,
    routePrefixes: ['/app/my-group'],
  },
];

const isRoutePrefixMatch = (pathname: string, routePrefix: string): boolean =>
  pathname === routePrefix || pathname.startsWith(`${routePrefix}/`);

export const resolveAppHeaderNavKey = (pathname: string): AppHeaderNavKey | undefined =>
  APP_HEADER_NAV_ITEMS.find((item) =>
    item.routePrefixes.some((routePrefix) => isRoutePrefixMatch(pathname, routePrefix))
  )?.key;
