import { Bell, Folder, type LucideIcon, MessageSquarePlus, NotebookPen, Users } from 'lucide-react';

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

interface AppSidebarCreateNoteItem {
  type: 'createNote';
  key: 'create-note';
  labelKey: string;
  icon: LucideIcon;
  toolId: GuideToolId;
}

export type AppSidebarHeaderItem = AppSidebarNavigateItem | AppSidebarCreateNoteItem;

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
    type: 'createNote',
    key: 'create-note',
    labelKey: 'navigation.newNote',
    icon: NotebookPen,
    toolId: GUIDE_TOOL_ID.sidebarNewNote,
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
    to: APP_ROUTE_PATH.COURSES,
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
