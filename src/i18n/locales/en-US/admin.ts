const enUSAdmin = {
  navigationAria: 'Admin navigation',
  page: {
    users: {
      title: 'Users',
      subtitle: 'Manage accounts, identity information, and account status',
    },
    resources: {
      title: 'Resources',
      subtitle: 'View and maintain documents, notes, and resource data',
    },
    groups: { title: 'Groups', subtitle: 'Manage groups, memberships, and group status' },
    announcements: {
      title: 'Announcements',
      subtitle: 'Publish and maintain announcements for users',
    },
    statistics: {
      title: 'Statistics',
      subtitle: 'Review operations data, usage trends, and key metrics',
    },
    permissions: {
      title: 'Permissions',
      subtitle: 'Configure admin roles, permission scopes, and access policies',
    },
    settings: {
      title: 'System settings',
      subtitle: 'Maintain platform settings, switches, and base parameters',
    },
    logs: {
      title: 'Audit logs',
      subtitle: 'Search operation logs, access records, and audit events',
    },
    tasks: {
      title: 'Task center',
      subtitle: 'Review background tasks, asynchronous jobs, and execution status',
    },
  },
  announcement: {
    tableAria: 'Message list',
    tableTitle: 'Announcements',
    empty: 'No announcements',
    create: 'Create announcement',
    column: {
      title: 'Title',
      type: 'Type',
      scope: 'Scope',
      status: 'Status',
      content: 'Content',
      jumpUrl: 'Destination URL',
      createTime: 'Created at',
    },
    readCount: '{{count}} read',
    total: '{{count}} total',
    pageSizeAria: 'Items per page',
    pageSize: '{{count}} / page',
    type: { SYSTEM: 'System message', NORMAL: 'Standard message', GROUP: 'Group message' },
    scope: { DIRECT: 'Selected users', ALL_USERS: 'All users' },
    publish: {
      title: 'Publish announcement',
      action: 'Publish',
      success: 'Announcement published',
      titleRequired: 'Enter an announcement title',
      contentRequired: 'Enter announcement content',
      receiverRequired: 'Enter at least one recipient user ID',
      titleLabel: 'Title',
      titlePlaceholder: 'Enter announcement title',
      typeLabel: 'Message type',
      scopeLabel: 'Audience',
      contentLabel: 'Content',
      contentPlaceholder: 'Enter announcement content',
      jumpUrlLabel: 'Destination URL',
      jumpUrlPlaceholder: 'Optional, for example /app/group',
      receiverLabel: 'Recipient user IDs',
      receiverPlaceholder: 'Separate multiple IDs with commas, semicolons, or spaces',
    },
  },
};

export default enUSAdmin;
