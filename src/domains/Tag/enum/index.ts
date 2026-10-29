import {
  ACCESS_CONTROL_SCOPE,
  type AccessControlScope,
  CONFIGURABLE_RESOURCE_ACTIONS,
  normalizeResourceActions,
  RESOURCE_ACTION,
  type ResourceAction,
  updateResourceActionSelection,
} from '@/domains/_shared/access';
import type { EnumValue } from '@/utils/type/enum';
import { defineEnum } from '@/utils/type/enum';

export const TAG_META_SCHEMA = 'wisepen.tag-meta.v1';

/** 与 OpenAPI 文档语义对应的别名，值为接口要求的字符串 */
export const TAG_VISIBILITY_MODE = defineEnum({
  ALL: '0',
  ONLY_ADMIN: '1',
  WHITELIST: '2',
  BLACKLIST: '3',
} as const);

/** OpenAPI TagTreeResponse.visibilityMode / TagCreateRequest / TagUpdateRequest */
export type TagVisibilityModeString = EnumValue<typeof TAG_VISIBILITY_MODE>;

export type TagVisibilityMode = EnumValue<typeof TAG_VISIBILITY_MODE>;

export type TagPermissionPresetKey = 'private' | 'readonly' | 'shared' | 'custom';
type TagPermissionConcretePresetKey = Exclude<TagPermissionPresetKey, 'custom'>;
export type TagMountPermissionPresetKey = 'all' | 'onlyAdmin' | 'advanced';
type TagMountPermissionConcretePresetKey = Exclude<TagMountPermissionPresetKey, 'advanced'>;

export interface TagPermissionPresetValues {
  taggedResourceAclGrantScope: AccessControlScope;
  grantedActions: ResourceAction[];
}

export interface TagPermissionActionValues {
  grantedActions?: ResourceAction[];
}

export interface TagMountPermissionPresetValues {
  tagMountPermissionScope: AccessControlScope;
  tagMountSpecifiedUsers: string[];
}

/** 标签内资源默认访问策略对应的预设领域值；UI 文案由调用方自行组合。 */
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
    grantedActions: normalizeResourceActions([RESOURCE_ACTION.VIEW]),
  },
  shared: {
    taggedResourceAclGrantScope: ACCESS_CONTROL_SCOPE.ALL,
    grantedActions: normalizeResourceActions([
      RESOURCE_ACTION.EDIT,
      RESOURCE_ACTION.INLINE_COMMENT,
      RESOURCE_ACTION.DOWNLOAD_WATERMARK,
      RESOURCE_ACTION.FORK,
      RESOURCE_ACTION.COMMENT,
    ]),
  },
};

export const getTagPermissionPresetValues = (
  key: TagPermissionPresetKey
): TagPermissionPresetValues | undefined =>
  key === 'custom' ? undefined : TAG_PERMISSION_PRESET_VALUES[key];

/** 文件夹自身挂载策略对应的预设领域值；高级模式由黑/白名单与指定成员表达。 */
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

export const TAG_PERMISSION_LIST_ACTIONS: ResourceAction[] = CONFIGURABLE_RESOURCE_ACTIONS;

export const isTagPermissionListActionSelected = (
  values: TagPermissionActionValues,
  action: ResourceAction
): boolean => {
  return normalizeResourceActions(values.grantedActions).includes(action);
};

export const buildTagPermissionListActionSelectionPatch = (
  values: TagPermissionActionValues,
  action: ResourceAction,
  checked: boolean
): Partial<TagPermissionActionValues> => {
  return {
    grantedActions: updateResourceActionSelection(values.grantedActions, action, checked),
  };
};
