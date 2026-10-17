import { GUIDE_ACTION_ID } from './actions';
import { step } from './step';
import { GUIDE_TOOL_ID } from './toolId';
import type { GuideTourConfig } from './types';

/** 工具栏横向铺满侧栏内容区，四周都不外扩，避免高亮越过侧栏边界。 */
const SIDEBAR_TOOLBAR_SPOTLIGHT_PADDING = { top: 0, right: 0, bottom: 0, left: 0 } as const;

export const sidebarTour: GuideTourConfig = {
  steps: [
    step(
      'navigation',
      GUIDE_TOOL_ID.sidebarNavigation,
      'sidebar.navigation.title',
      'sidebar.navigation.content',
      'right',
      undefined,
      // 菜单横向铺满侧栏，左右不再外扩；上下收紧，避开 logo 和分割线。
      { spotlightPadding: { top: 8, right: 0, bottom: 6, left: 0 } }
    ),
    step(
      'sessions',
      GUIDE_TOOL_ID.sidebarContentToolbar,
      'sidebar.sessions.title',
      'sidebar.sessions.content',
      'right-start',
      GUIDE_ACTION_ID.showSidebarSessions,
      { spotlightPadding: SIDEBAR_TOOLBAR_SPOTLIGHT_PADDING }
    ),
    step(
      'drive',
      GUIDE_TOOL_ID.sidebarContentToolbar,
      'sidebar.drive.title',
      'sidebar.drive.content',
      'right-start',
      GUIDE_ACTION_ID.showSidebarDrive,
      { spotlightPadding: SIDEBAR_TOOLBAR_SPOTLIGHT_PADDING }
    ),
    step(
      'courses',
      GUIDE_TOOL_ID.sidebarContentToolbar,
      'sidebar.courses.title',
      'sidebar.courses.content',
      'right-start',
      GUIDE_ACTION_ID.showSidebarCourses,
      { spotlightPadding: SIDEBAR_TOOLBAR_SPOTLIGHT_PADDING }
    ),
    step(
      'account',
      GUIDE_TOOL_ID.sidebarAccount,
      'sidebar.account.title',
      'sidebar.account.content',
      'right'
    ),
  ],
};
