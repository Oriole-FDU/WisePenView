import {
  actionsToPermissionCode,
  getResourceActionImpliedActions,
  getResourceActionImpliedMask,
  hasResourceAction,
  normalizeResourceActions,
  permissionCodeToActions,
  RESOURCE_ACTION,
  type ResourceAction,
} from '@/domains/Resource';
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

/** 资源访问权限（兼容旧 Tag 导出名，根定义位于 Resource domain） */
export const TAG_RESOURCE_ACTION = RESOURCE_ACTION;

export type TagResourceAction = ResourceAction;

export {
  actionsToPermissionCode,
  getResourceActionImpliedActions,
  getResourceActionImpliedMask,
  hasResourceAction,
  normalizeResourceActions,
  permissionCodeToActions,
};

export const resourceActionsToApiKeys = (
  actions?: TagResourceAction[]
): TagResourceActionKey[] | undefined => {
  if (!actions) return undefined;
  return normalizeResourceActions(actions)
    .map((action) => TAG_RESOURCE_ACTION.getKey(action))
    .filter((key): key is TagResourceActionKey => key != null);
};
