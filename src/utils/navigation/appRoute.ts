// 注意：本文件同时被 electron 工程（无 @/* 别名）引用，此处必须使用相对路径导入
import { normalizeInviteCode } from '../normalize/normalizeInviteCode';

/** 注册邀请链接的查询参数名，与后端注册接口 inviteCode 字段对应 */
export const REGISTER_INVITE_QUERY_KEY = 'invite';

export const APP_ROUTE_PATH = {
  HOME: '/',
  ANONYMOUS: '/anonymous',
  AUTH_LOGIN: '/login',
  AUTH_REGISTER: '/register',
  AUTH_ONBOARDING_BIND: '/onboarding/bind',
  AUTH_PASSWORD_FORGOT: '/password/forgot',
  AUTH_PASSWORD_RESET: '/password/reset',
  AUTH_EMAIL_VERIFY: '/email/verify',
  CHAT: '/chat',
  NOTIFICATIONS: '/notifications',
  DRIVE: '/drive',
  DRIVE_PERSONAL: '/drive/personal',
  DRIVE_UPLOAD_QUEUE: '/drive/upload-queue',
  DRIVE_FAVORITES: '/drive/favorites',
  DRIVE_TRASH: '/drive/trash',
  GROUPS: '/groups',
  COURSES: '/courses',
  INVITE: '/invite',
  RESOURCES: '/resources',
  PROFILE: '/profile',
  PROFILE_ACCOUNT: '/profile/account',
  PROFILE_USAGE: '/profile/usage',
  PROFILE_APPEARANCE: '/profile/appearance',
  PROFILE_AI: '/profile/ai',
  ADMIN: '/admin',
  ADMIN_USERS: '/admin/users',
  ADMIN_RESOURCES: '/admin/resources',
  ADMIN_GROUPS: '/admin/groups',
  ADMIN_ANNOUNCEMENTS: '/admin/announcements',
  ADMIN_STATISTICS: '/admin/statistics',
  ADMIN_PERMISSIONS: '/admin/permissions',
  ADMIN_SETTINGS: '/admin/settings',
  ADMIN_LOGS: '/admin/logs',
  ADMIN_TASKS: '/admin/tasks',
} as const;

const AUTH_ROUTE_PATHS = [
  APP_ROUTE_PATH.AUTH_LOGIN,
  APP_ROUTE_PATH.AUTH_REGISTER,
  APP_ROUTE_PATH.AUTH_ONBOARDING_BIND,
  APP_ROUTE_PATH.AUTH_PASSWORD_FORGOT,
  APP_ROUTE_PATH.AUTH_PASSWORD_RESET,
  APP_ROUTE_PATH.AUTH_EMAIL_VERIFY,
] as const;

export const isAuthRoutePath = (pathname: string): boolean => {
  const normalizedPathname = pathname.replace(/\/+$/, '');
  return AUTH_ROUTE_PATHS.some((routePath) => normalizedPathname === routePath);
};

const AUTHENTICATED_APP_ROUTE_ROOTS = [
  APP_ROUTE_PATH.CHAT,
  APP_ROUTE_PATH.NOTIFICATIONS,
  APP_ROUTE_PATH.DRIVE,
  APP_ROUTE_PATH.GROUPS,
  APP_ROUTE_PATH.COURSES,
  APP_ROUTE_PATH.INVITE,
  APP_ROUTE_PATH.RESOURCES,
  APP_ROUTE_PATH.PROFILE,
] as const;

export const isAuthenticatedAppRoutePath = (pathname: string): boolean =>
  AUTHENTICATED_APP_ROUTE_ROOTS.some(
    (rootPath) => pathname === rootPath || pathname.startsWith(`${rootPath}/`)
  );

export type GroupListRole = 'all' | 'joined' | 'managed';

export interface GroupListRouteQuery {
  role: GroupListRole;
  page: number;
  size: number;
}

export interface CourseListRouteQuery {
  page: number;
  size: number;
}

export const LIST_ROUTE_DEFAULTS = {
  page: 1,
  size: 8,
} as const;

const GROUP_LIST_ROLES: readonly GroupListRole[] = ['all', 'joined', 'managed'];

const encodePathSegment = (value: string): string => encodeURIComponent(value.trim());

const parsePositiveInteger = (value: string | null, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const normalizePositiveInteger = (value: number | undefined, fallback: number): number =>
  Number.isInteger(value) && Number(value) > 0 ? Number(value) : fallback;

const appendListPagination = (
  search: URLSearchParams,
  query: Pick<CourseListRouteQuery, 'page' | 'size'>
): void => {
  if (query.page !== LIST_ROUTE_DEFAULTS.page) search.set('page', String(query.page));
  if (query.size !== LIST_ROUTE_DEFAULTS.size) search.set('size', String(query.size));
};

const appendSearch = (path: string, search: URLSearchParams): string => {
  const query = search.toString();
  return query ? `${path}?${query}` : path;
};

export const parseGroupListRouteQuery = (search: URLSearchParams): GroupListRouteQuery => {
  const rawRole = search.get('role');
  const role = GROUP_LIST_ROLES.includes(rawRole as GroupListRole)
    ? (rawRole as GroupListRole)
    : 'all';
  return {
    role,
    page: parsePositiveInteger(search.get('page'), LIST_ROUTE_DEFAULTS.page),
    size: parsePositiveInteger(search.get('size'), LIST_ROUTE_DEFAULTS.size),
  };
};

export const parseCourseListRouteQuery = (search: URLSearchParams): CourseListRouteQuery => ({
  page: parsePositiveInteger(search.get('page'), LIST_ROUTE_DEFAULTS.page),
  size: parsePositiveInteger(search.get('size'), LIST_ROUTE_DEFAULTS.size),
});

export const buildGroupListPath = (query?: Partial<GroupListRouteQuery>): string => {
  const requestedRole = query?.role;
  const normalized: GroupListRouteQuery = {
    role: requestedRole && GROUP_LIST_ROLES.includes(requestedRole) ? requestedRole : 'all',
    page: normalizePositiveInteger(query?.page, LIST_ROUTE_DEFAULTS.page),
    size: normalizePositiveInteger(query?.size, LIST_ROUTE_DEFAULTS.size),
  };
  const search = new URLSearchParams();
  if (normalized.role !== 'all') search.set('role', normalized.role);
  appendListPagination(search, normalized);
  return appendSearch(APP_ROUTE_PATH.GROUPS, search);
};

export const buildInvitePath = (inviteCode?: string): string => {
  const search = new URLSearchParams();
  const normalizedInviteCode = normalizeInviteCode(inviteCode);
  if (normalizedInviteCode) search.set('code', normalizedInviteCode);
  return appendSearch(APP_ROUTE_PATH.INVITE, search);
};

/** 用户邀请链接地址：注册页读取 invite 参数自动填入邀请码 */
export const buildRegisterInvitePath = (inviteCode?: string): string => {
  const search = new URLSearchParams();
  const normalizedInviteCode = normalizeInviteCode(inviteCode);
  if (normalizedInviteCode) search.set(REGISTER_INVITE_QUERY_KEY, normalizedInviteCode);
  return appendSearch(APP_ROUTE_PATH.AUTH_REGISTER, search);
};

/** 从地址查询串中读取用户邀请码，非法或缺失时返回空串 */
export const readRegisterInviteCode = (search: string): string =>
  normalizeInviteCode(new URLSearchParams(search).get(REGISTER_INVITE_QUERY_KEY));

export const buildCourseListPath = (query?: Partial<CourseListRouteQuery>): string => {
  const normalized: CourseListRouteQuery = {
    page: normalizePositiveInteger(query?.page, LIST_ROUTE_DEFAULTS.page),
    size: normalizePositiveInteger(query?.size, LIST_ROUTE_DEFAULTS.size),
  };
  const search = new URLSearchParams();
  appendListPagination(search, normalized);
  return appendSearch(APP_ROUTE_PATH.COURSES, search);
};

export const buildChatPath = (sessionId?: string): string =>
  sessionId?.trim()
    ? `${APP_ROUTE_PATH.CHAT}/${encodePathSegment(sessionId)}`
    : APP_ROUTE_PATH.CHAT;

export const buildNotificationPath = (messageId?: string): string =>
  messageId?.trim()
    ? `${APP_ROUTE_PATH.NOTIFICATIONS}/${encodePathSegment(messageId)}`
    : APP_ROUTE_PATH.NOTIFICATIONS;

export type GroupRoutePage = 'files' | 'members' | 'wallet' | 'token-transfer' | 'settings';

export const buildGroupPath = (groupId: string, page: GroupRoutePage): string =>
  `${APP_ROUTE_PATH.GROUPS}/${encodePathSegment(groupId)}/${page}`;

export const buildGroupFilesPath = (groupId: string, folderId?: string): string => {
  const basePath = buildGroupPath(groupId, 'files');
  return folderId?.trim() ? `${basePath}/folder/${encodePathSegment(folderId)}` : basePath;
};

export type CourseRoutePage =
  | 'home'
  | 'info'
  | 'assignments'
  | 'materials'
  | 'announcements'
  | 'members'
  | 'learning'
  | 'settings';

export const buildCoursePath = (courseId: string, page: CourseRoutePage): string =>
  `${APP_ROUTE_PATH.COURSES}/${encodePathSegment(courseId)}/${page}`;

export const buildCourseAssignmentPath = (courseId: string, assignmentId?: string): string => {
  const basePath = buildCoursePath(courseId, 'assignments');
  return assignmentId?.trim() ? `${basePath}/${encodePathSegment(assignmentId)}` : basePath;
};

export const buildCourseLearningPath = (courseId: string, outlineNodeId?: string): string => {
  const basePath = buildCoursePath(courseId, 'learning');
  return outlineNodeId?.trim() ? `${basePath}/${encodePathSegment(outlineNodeId)}` : basePath;
};
