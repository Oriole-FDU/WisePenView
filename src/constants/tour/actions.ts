/** 引导步骤展示前可以请求宿主执行的界面动作。 */
export const GUIDE_ACTION_ID = {
  openChat: 'open-chat',
  openOutline: 'open-outline',
  openModelMenu: 'open-model-menu',
  openUploadMenu: 'open-upload-menu',
  openAgentMenu: 'open-agent-menu',
  openSkillMenu: 'open-skill-menu',
  openAccountMenu: 'open-account-menu',
  showSidebarSessions: 'show-sidebar-sessions',
  showSidebarDrive: 'show-sidebar-drive',
  showSidebarCourses: 'show-sidebar-courses',
  openCourseHome: 'open-course-home',
  openCourseMaterials: 'open-course-materials',
  openCourseMembers: 'open-course-members',
  showDriveFiles: 'show-drive-files',
  showDriveUploadQueue: 'show-drive-upload-queue',
  showDriveFavorites: 'show-drive-favorites',
  showDriveTrash: 'show-drive-trash',
  openResourceMenu: 'open-resource-menu',
  openDetails: 'open-details',
} as const;

export type GuideActionId = (typeof GUIDE_ACTION_ID)[keyof typeof GUIDE_ACTION_ID];
