export const ADMIN_PAGE_CONFIGS = {
  users: {
    path: '/admin/users',
    titleKey: 'page.users.title',
    subtitleKey: 'page.users.subtitle',
  },
  resources: {
    path: '/admin/resources',
    titleKey: 'page.resources.title',
    subtitleKey: 'page.resources.subtitle',
  },
  groups: {
    path: '/admin/groups',
    titleKey: 'page.groups.title',
    subtitleKey: 'page.groups.subtitle',
  },
  announcements: {
    path: '/admin/announcements',
    titleKey: 'page.announcements.title',
    subtitleKey: 'page.announcements.subtitle',
  },
  statistics: {
    path: '/admin/statistics',
    titleKey: 'page.statistics.title',
    subtitleKey: 'page.statistics.subtitle',
  },
  permissions: {
    path: '/admin/permissions',
    titleKey: 'page.permissions.title',
    subtitleKey: 'page.permissions.subtitle',
  },
  settings: {
    path: '/admin/settings',
    titleKey: 'page.settings.title',
    subtitleKey: 'page.settings.subtitle',
  },
  logs: {
    path: '/admin/logs',
    titleKey: 'page.logs.title',
    subtitleKey: 'page.logs.subtitle',
  },
  tasks: {
    path: '/admin/tasks',
    titleKey: 'page.tasks.title',
    subtitleKey: 'page.tasks.subtitle',
  },
} as const;

export type AdminPageKey = keyof typeof ADMIN_PAGE_CONFIGS;
