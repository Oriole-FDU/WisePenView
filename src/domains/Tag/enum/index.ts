import {
  actionsToPermissionCode,
  coerceResourceActions,
  getResourceActionImpliedActions,
  getResourceActionImpliedMask,
  hasResourceAction,
  normalizeResourceActions,
  permissionCodeToActions,
  RESOURCE_ACTION,
  type ResourceAction,
  updateResourceActionSelection,
} from '@/domains/Resource';
import type { EnumKey, EnumValue } from '@/utils/type/enum';
import { createEnum } from '@/utils/type/enum';

export const TAG_META_SCHEMA = 'wisepen.tag-meta.v1';

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

/** 标签资源策略复用 Resource 领域的动作枚举，避免维护第二套权限位定义。 */
export const TAG_RESOURCE_ACTION = RESOURCE_ACTION;

export type TagResourceAction = ResourceAction;
export type TagResourceActionKey = EnumKey<typeof TAG_RESOURCE_ACTION>;
export type TagPermissionPresetKey = 'private' | 'readonly' | 'shared' | 'custom';
type TagPermissionConcretePresetKey = Exclude<TagPermissionPresetKey, 'custom'>;
export type TagMountPermissionPresetKey = 'all' | 'onlyAdmin' | 'advanced';
type TagMountPermissionConcretePresetKey = Exclude<TagMountPermissionPresetKey, 'advanced'>;

export interface TagPermissionPresetValues {
  taggedResourceAclGrantScope: AccessControlScope;
  grantedActions: TagResourceAction[];
}

export interface TagPermissionActionValues {
  grantedActions?: TagResourceAction[];
}

export interface TagMountPermissionPresetValues {
  tagMountPermissionScope: AccessControlScope;
  tagMountSpecifiedUsers: string[];
}

export interface TagPermissionListAction {
  kind: 'resource';
  key: TagResourceActionKey;
  label: string;
  action: TagResourceAction;
}

/** 标签内资源默认访问策略预设的领域值；UI 文案由调用方自行组合。 */
export const TAG_PERMISSION_PRESET_VALUES: Record<
  TagPermissionConcretePresetKey,
  TagPermissionPresetValues
> = {
  private: {
    taggedResourceAclGrantScope: ACCESS_CONTROL_SCOPE.ONLY_ADMIN,
    grantedActions: [],
  },
  readonly: {
    taggedResourceAclGrantScope: ACCESS_CONTROL_SCOPE.ALL,
    grantedActions: normalizeResourceActions([TAG_RESOURCE_ACTION.VIEW]),
  },
  shared: {
    taggedResourceAclGrantScope: ACCESS_CONTROL_SCOPE.ALL,
    grantedActions: normalizeResourceActions([
      TAG_RESOURCE_ACTION.EDIT,
      TAG_RESOURCE_ACTION.INLINE_COMMENT,
      TAG_RESOURCE_ACTION.DOWNLOAD_WATERMARK,
      TAG_RESOURCE_ACTION.FORK,
      TAG_RESOURCE_ACTION.COMMENT,
    ]),
  },
};

export const getTagPermissionPresetValues = (
  key: TagPermissionPresetKey
): TagPermissionPresetValues | undefined =>
  key === 'custom' ? undefined : TAG_PERMISSION_PRESET_VALUES[key];

/** 文件夹自身挂载策略预设的领域值；高级模式由黑/白名单与指定成员表达。 */
export const TAG_MOUNT_PERMISSION_PRESET_VALUES: Record<
  TagMountPermissionConcretePresetKey,
  TagMountPermissionPresetValues
> = {
  all: {
    tagMountPermissionScope: ACCESS_CONTROL_SCOPE.ALL,
    tagMountSpecifiedUsers: [],
  },
  onlyAdmin: {
    tagMountPermissionScope: ACCESS_CONTROL_SCOPE.ONLY_ADMIN,
    tagMountSpecifiedUsers: [],
  },
};

export const getTagMountPermissionPresetValues = (
  key: TagMountPermissionPresetKey
): TagMountPermissionPresetValues | undefined =>
  key === 'advanced' ? undefined : TAG_MOUNT_PERMISSION_PRESET_VALUES[key];

export const TAG_PERMISSION_LIST_ACTIONS: TagPermissionListAction[] =
  TAG_RESOURCE_ACTION.options.map((item) => ({
    kind: 'resource' as const,
    key: item.key,
    label: item.label,
    action: item.value as TagResourceAction,
  }));

export const isTagPermissionListActionSelected = (
  values: TagPermissionActionValues,
  listAction: TagPermissionListAction
): boolean => {
  return normalizeResourceActions(values.grantedActions).includes(listAction.action);
};

export const buildTagPermissionListActionSelectionPatch = (
  values: TagPermissionActionValues,
  listAction: TagPermissionListAction,
  checked: boolean
): Partial<TagPermissionActionValues> => {
  return {
    grantedActions: updateResourceActionSelection(
      values.grantedActions,
      listAction.action,
      checked
    ),
  };
};

export {
  actionsToPermissionCode,
  coerceResourceActions,
  getResourceActionImpliedActions,
  getResourceActionImpliedMask,
  hasResourceAction,
  normalizeResourceActions,
  permissionCodeToActions,
  updateResourceActionSelection,
};

export const resourceActionsToApiKeys = (
  actions?: TagResourceAction[]
): TagResourceActionKey[] | undefined => {
  if (!actions) return undefined;
  return normalizeResourceActions(actions)
    .map((action) => TAG_RESOURCE_ACTION.getKey(action))
    .filter((key): key is TagResourceActionKey => key != null);
};
