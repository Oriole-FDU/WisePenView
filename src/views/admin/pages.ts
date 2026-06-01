export const ADMIN_PAGE_CONFIGS = {
  users: {
    path: '/admin/users',
    title: '用户管理',
    subtitle: '管理用户账号、身份信息与账号状态',
  },
  resources: {
    path: '/admin/resources',
    title: '资源管理',
    subtitle: '查看与维护平台内的文档、笔记和资源数据',
  },
  groups: {
    path: '/admin/groups',
    title: '小组管理',
    subtitle: '管理小组信息、成员关系与小组运行状态',
  },
  announcements: {
    path: '/admin/announcements',
    title: '公告管理',
    subtitle: '发布、编辑和维护面向用户的公告内容',
  },
  statistics: {
    path: '/admin/statistics',
    title: '数据统计',
    subtitle: '查看业务运营数据、使用趋势与关键指标',
  },
  permissions: {
    path: '/admin/permissions',
    title: '权限管理',
    subtitle: '配置后台角色、权限范围与访问控制策略',
  },
  settings: {
    path: '/admin/settings',
    title: '系统配置',
    subtitle: '维护平台级配置项、开关和基础参数',
  },
  logs: {
    path: '/admin/logs',
    title: '日志审计',
    subtitle: '查询操作日志、访问记录与审计事件',
  },
  tasks: {
    path: '/admin/tasks',
    title: '任务中心',
    subtitle: '查看后台任务、异步作业和执行状态',
  },
} as const;

export type AdminPageKey = keyof typeof ADMIN_PAGE_CONFIGS;
