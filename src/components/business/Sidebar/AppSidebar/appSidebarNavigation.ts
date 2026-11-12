import { Bell, Folder, type LucideIcon, MessageSquarePlus, Plus, Users } from 'lucide-react';

import { APP_SIDEBAR_HEADER_NAV_KEY, type AppSidebarHeaderNavKey } from '@/config/appSidebar';
import { GUIDE_TOOL_ID, type GuideToolId } from '@/constants/tour';
import { APP_ROUTE_PATH } from '@/utils/navigation/appRoute';

export interface AppSidebarNavigateItem {
  type: 'navigate';
  key: AppSidebarHeaderNavKey;
  labelKey: string;
  icon: LucideIcon;
  to: string;
  toolId: GuideToolId;
}

interface AppSidebarCreateResourceItem {
  type: 'createResource';
  key: 'create-resource';
  labelKey: string;
  icon: LucideIcon;
  toolId: GuideToolId;
}

export type AppSidebarHeaderItem = AppSidebarNavigateItem | AppSidebarCreateResourceItem;

export const APP_SIDEBAR_HEADER_ITEMS: readonly AppSidebarHeaderItem[] = [
  {
    type: 'navigate',
    key: APP_SIDEBAR_HEADER_NAV_KEY.CHAT,
    labelKey: 'navigation.newChat',
    icon: MessageSquarePlus,
    to: APP_ROUTE_PATH.CHAT,
    toolId: GUIDE_TOOL_ID.sidebarNewChat,
  },
  {
    type: 'createResource',
    key: 'create-resource',
    labelKey: 'navigation.createResource',
    icon: Plus,
    toolId: GUIDE_TOOL_ID.sidebarCreateResource,
  },
  {
    type: 'navigate',
    key: APP_SIDEBAR_HEADER_NAV_KEY.DRIVE,
    labelKey: 'navigation.drive',
    icon: Folder,
    to: APP_ROUTE_PATH.DRIVE_PERSONAL,
    toolId: GUIDE_TOOL_ID.sidebarDrive,
  },
  {
    type: 'navigate',
    key: APP_SIDEBAR_HEADER_NAV_KEY.PUBLIC,
    labelKey: 'navigation.groups',
    icon: Users,
    to: APP_ROUTE_PATH.GROUPS,
    toolId: GUIDE_TOOL_ID.sidebarGroups,
  },
  {
    type: 'navigate',
    key: APP_SIDEBAR_HEADER_NAV_KEY.NOTIFICATIONS,
    labelKey: 'navigation.notifications',
    icon: Bell,
    to: APP_ROUTE_PATH.NOTIFICATIONS,
    toolId: GUIDE_TOOL_ID.sidebarNotifications,
  },
];
