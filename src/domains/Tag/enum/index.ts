import type { EnumKey, EnumValue } from '@/utils/enum';
import { createEnum } from '@/utils/enum';

/** 与 OpenAPI 文档语义对应的别名，值为接口要求的字符串 */
export const TAG_VISIBILITY_MODE = createEnum([
  { value: '0', key: 'ALL', label: '全部可见' },
  { value: '1', key: 'ONLY_ADMIN', label: '仅管理员' },
  { value: '2', key: 'WHITELIST', label: '白名单' },
  { value: '3', key: 'BLACKLIST', label: '黑名单' },
] as const);

/** OpenAPI TagTreeResponse.visibilityMode / TagCreateRequest / TagUpdateRequest */
export type TagVisibilityModeString = EnumValue<typeof TAG_VISIBILITY_MODE>;

export type TagVisibilityMode = EnumValue<typeof TAG_VISIBILITY_MODE>;

/** 访问控制范围（与 OpenAPI AccessControlScope 对齐） */
export const ACCESS_CONTROL_SCOPE = createEnum([
  { value: 0, key: 'ALL', label: '全部' },
  { value: 1, key: 'ONLY_ADMIN', label: '仅管理员' },
  { value: 2, key: 'WHITELIST', label: '白名单' },
  { value: 3, key: 'BLACKLIST', label: '黑名单' },
] as const);

export type AccessControlScope = EnumValue<typeof ACCESS_CONTROL_SCOPE>;
export type AccessControlScopeKey = EnumKey<typeof ACCESS_CONTROL_SCOPE>;

/** 资源访问权限（与 OpenAPI ResourceAction 对齐） */
export const TAG_RESOURCE_ACTION = createEnum([
  { value: 1, key: 'DISCOVER', label: '查看资源列表' },
  { value: 2, key: 'VIEW', label: '阅读' },
  { value: 4, key: 'EDIT', label: '编辑' },
  { value: 8, key: 'DOWNLOAD_WATERMARK', label: '带水印下载' },
  { value: 16, key: 'DOWNLOAD_ORIGINAL', label: '下载源文件' },
] as const);

export type TagResourceAction = EnumValue<typeof TAG_RESOURCE_ACTION>;
export type TagResourceActionKey = EnumKey<typeof TAG_RESOURCE_ACTION>;

const RESOURCE_ACTION_IMPLIED_MASK: Record<TagResourceAction, number> = {
  [TAG_RESOURCE_ACTION.DISCOVER]: TAG_RESOURCE_ACTION.DISCOVER,
  [TAG_RESOURCE_ACTION.VIEW]: TAG_RESOURCE_ACTION.VIEW | TAG_RESOURCE_ACTION.DISCOVER,
  [TAG_RESOURCE_ACTION.EDIT]:
    TAG_RESOURCE_ACTION.EDIT | TAG_RESOURCE_ACTION.VIEW | TAG_RESOURCE_ACTION.DISCOVER,
  [TAG_RESOURCE_ACTION.DOWNLOAD_WATERMARK]:
    TAG_RESOURCE_ACTION.DOWNLOAD_WATERMARK |
    TAG_RESOURCE_ACTION.VIEW |
    TAG_RESOURCE_ACTION.DISCOVER,
  [TAG_RESOURCE_ACTION.DOWNLOAD_ORIGINAL]:
    TAG_RESOURCE_ACTION.DOWNLOAD_ORIGINAL |
    TAG_RESOURCE_ACTION.DOWNLOAD_WATERMARK |
    TAG_RESOURCE_ACTION.VIEW |
    TAG_RESOURCE_ACTION.DISCOVER,
};

const RESOURCE_ACTION_ORDER = TAG_RESOURCE_ACTION.options.map(
  (item) => item.value as TagResourceAction
);

export const getResourceActionImpliedMask = (action: TagResourceAction): number =>
  RESOURCE_ACTION_IMPLIED_MASK[action] ?? action;

export const permissionCodeToActions = (permissionCode: number): TagResourceAction[] =>
  TAG_RESOURCE_ACTION.options
    .map((item) => item.value as TagResourceAction)
    .filter((action) => (permissionCode & action) !== 0);

export const actionsToPermissionCode = (actions?: TagResourceAction[]): number => {
  if (!actions || actions.length === 0) return 0;
  return actions.map((action) => getResourceActionImpliedMask(action)).reduce((a, b) => a | b, 0);
};

export const hasResourceAction = (permissionCode: number, action: TagResourceAction): boolean =>
  (permissionCode & action) !== 0;

export const getResourceActionImpliedActions = (action: TagResourceAction): TagResourceAction[] =>
  permissionCodeToActions(getResourceActionImpliedMask(action)).filter((item) => item !== action);

export const normalizeResourceActions = (actions?: TagResourceAction[]): TagResourceAction[] => {
  const normalized = permissionCodeToActions(actionsToPermissionCode(actions));
  return RESOURCE_ACTION_ORDER.filter((value) => normalized.includes(value));
};

export const resourceActionsToApiKeys = (
  actions?: TagResourceAction[]
): TagResourceActionKey[] | undefined => {
  if (!actions) return undefined;
  return normalizeResourceActions(actions)
    .map((action) => TAG_RESOURCE_ACTION.getKey(action))
    .filter((key): key is TagResourceActionKey => key != null);
};
