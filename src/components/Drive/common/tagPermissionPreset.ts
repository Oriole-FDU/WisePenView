import {
  ACCESS_CONTROL_SCOPE,
  getTagMountPermissionPresetValues,
  getTagPermissionPresetValues,
  normalizeResourceActions,
  TAG_PERMISSION_LIST_ACTIONS,
  TAG_RESOURCE_ACTION,
  type AccessControlScope,
  type TagMountPermissionPresetKey,
  type TagMountPermissionPresetValues,
  type TagPermissionListAction,
  type TagPermissionPresetKey,
  type TagPermissionPresetValues,
  type TagResourceAction,
  type TagTreeNode,
} from '@/domains/Tag';
import i18n from '@/i18n';

export type TagPermissionResourceStrategyKey = 'note' | 'file' | 'drawio' | 'aiAsset';

export interface TagPermissionPresetOption {
  key: TagPermissionPresetKey;
  label: string;
  description: string;
  detail: string;
  values?: TagPermissionPresetValues;
}

export interface TagMountPermissionPresetOption {
  key: TagMountPermissionPresetKey;
  label: string;
  description: string;
  detail: string;
  values?: TagMountPermissionPresetValues;
}

export interface TagPermissionResourceStrategy {
  key: TagPermissionResourceStrategyKey;
  label: string;
  supportedActions: TagResourceAction[];
}

export interface TagPermissionActionPresetOption {
  key: Exclude<TagPermissionPresetKey, 'custom'>;
  label: string;
  values: TagPermissionPresetValues;
}

export interface TagPermissionActionRow {
  action: TagPermissionListAction;
  key: string;
  label: string;
  supportedStrategyKeys: TagPermissionResourceStrategyKey[];
}

const ALL_RESOURCE_ACTIONS = TAG_RESOURCE_ACTION.options.map(
  (item) => item.value as TagResourceAction
);

export const TAG_PERMISSION_RESOURCE_STRATEGIES: TagPermissionResourceStrategy[] = [
  {
    key: 'note',
    get label() {
      return i18n.t('permission.tag.strategies.note', { ns: 'resource' });
    },
    supportedActions: [
      TAG_RESOURCE_ACTION.DISCOVER,
      TAG_RESOURCE_ACTION.VIEW,
      TAG_RESOURCE_ACTION.EDIT,
      TAG_RESOURCE_ACTION.INLINE_COMMENT,
      TAG_RESOURCE_ACTION.FORK,
      TAG_RESOURCE_ACTION.COMMENT,
    ],
  },
  {
    key: 'file',
    get label() {
      return i18n.t('permission.tag.strategies.file', { ns: 'resource' });
    },
    supportedActions: ALL_RESOURCE_ACTIONS.filter((action) => action !== TAG_RESOURCE_ACTION.LOAD),
  },
  {
    key: 'drawio',
    get label() {
      return i18n.t('permission.tag.strategies.drawio', { ns: 'resource' });
    },
    supportedActions: [
      TAG_RESOURCE_ACTION.DISCOVER,
      TAG_RESOURCE_ACTION.VIEW,
      TAG_RESOURCE_ACTION.EDIT,
      TAG_RESOURCE_ACTION.FORK,
    ],
  },
  {
    key: 'aiAsset',
    get label() {
      return i18n.t('permission.tag.strategies.aiAsset', { ns: 'resource' });
    },
    supportedActions: ALL_RESOURCE_ACTIONS,
  },
];

export const TAG_PERMISSION_ACTION_ROWS: TagPermissionActionRow[] = TAG_PERMISSION_LIST_ACTIONS.map(
  (action) => ({
    action,
    key: action.key,
    get label() {
      return i18n.t(`permission.actions.${action.key}`, { ns: 'resource' });
    },
    supportedStrategyKeys: TAG_PERMISSION_RESOURCE_STRATEGIES.filter((strategy) =>
      strategy.supportedActions.includes(action.action)
    ).map((strategy) => strategy.key),
  })
);

const createTagPermissionPresetOption = (
  key: TagPermissionPresetKey
): TagPermissionPresetOption => ({
  key,
  get label() {
    return i18n.t(`permission.tag.preset.${key}.label`, { ns: 'resource' });
  },
  get description() {
    return i18n.t(`permission.tag.preset.${key}.description`, { ns: 'resource' });
  },
  get detail() {
    return i18n.t(`permission.tag.preset.${key}.detail`, { ns: 'resource' });
  },
  values: getTagPermissionPresetValues(key),
});

export const TAG_PERMISSION_PRESETS: TagPermissionPresetOption[] = [
  createTagPermissionPresetOption('private'),
  createTagPermissionPresetOption('readonly'),
  createTagPermissionPresetOption('shared'),
  createTagPermissionPresetOption('custom'),
];

const createTagMountPermissionPresetOption = (
  key: TagMountPermissionPresetKey
): TagMountPermissionPresetOption => ({
  key,
  get label() {
    return i18n.t(`permission.tag.mountPreset.${key}.label`, { ns: 'resource' });
  },
  get description() {
    return i18n.t(`permission.tag.mountPreset.${key}.description`, { ns: 'resource' });
  },
  get detail() {
    return i18n.t(`permission.tag.mountPreset.${key}.detail`, { ns: 'resource' });
  },
  values: getTagMountPermissionPresetValues(key),
});

export const TAG_MOUNT_PERMISSION_PRESETS: TagMountPermissionPresetOption[] = [
  createTagMountPermissionPresetOption('all'),
  createTagMountPermissionPresetOption('onlyAdmin'),
  createTagMountPermissionPresetOption('advanced'),
];

export const TAG_PERMISSION_ACTION_PRESET_OPTIONS: TagPermissionActionPresetOption[] =
  TAG_PERMISSION_PRESETS.filter(
    (
      preset
    ): preset is TagPermissionPresetOption & {
      key: Exclude<TagPermissionPresetKey, 'custom'>;
      values: TagPermissionPresetValues;
    } => Boolean(preset.values)
  ).map((preset) => ({
    key: preset.key,
    get label() {
      return preset.label;
    },
    values: preset.values,
  }));

const createActionSet = (actions: TagResourceAction[] | undefined): Set<TagResourceAction> =>
  new Set(normalizeResourceActions(actions));

const isSameActionSet = (
  left: TagResourceAction[] | undefined,
  right: TagResourceAction[] | undefined
): boolean => {
  const leftSet = createActionSet(left);
  const rightSet = createActionSet(right);
  if (leftSet.size !== rightSet.size) return false;
  return [...leftSet].every((action) => rightSet.has(action));
};

const isPresetValuesMatched = (
  presetValues: TagPermissionPresetValues,
  values: Partial<TagPermissionPresetValues>
): boolean =>
  presetValues.taggedResourceAclGrantScope === values.taggedResourceAclGrantScope &&
  isSameActionSet(presetValues.grantedActions, values.grantedActions);

export const getTagPermissionPresetOption = (
  key: TagPermissionPresetKey
): TagPermissionPresetOption => TAG_PERMISSION_PRESETS.find((preset) => preset.key === key)!;

export const getTagMountPermissionPresetOption = (
  key: TagMountPermissionPresetKey
): TagMountPermissionPresetOption =>
  TAG_MOUNT_PERMISSION_PRESETS.find((preset) => preset.key === key)!;

export const resolveTagPermissionPresetKey = (
  values: Partial<TagPermissionPresetValues>
): TagPermissionPresetKey => {
  const matchedPreset = TAG_PERMISSION_PRESETS.find((preset) => {
    if (!preset.values) return false;
    return isPresetValuesMatched(preset.values, values);
  });
  return matchedPreset?.key ?? 'custom';
};

export const resolveTagPermissionPresetKeyFromTag = (
  tag: TagTreeNode | undefined
): TagPermissionPresetKey => {
  if (!tag) return 'custom';
  return resolveTagPermissionPresetKey({
    taggedResourceAclGrantScope: tag.taggedResourceAclGrantScope,
    grantedActions: tag.grantedActions,
  });
};

export const resolveTagMountPermissionPresetKey = (values: {
  tagMountPermissionScope?: AccessControlScope;
  tagMountSpecifiedUsers?: string[];
}): TagMountPermissionPresetKey => {
  const scope = values.tagMountPermissionScope ?? ACCESS_CONTROL_SCOPE.ALL;
  if (scope === ACCESS_CONTROL_SCOPE.ALL) return 'all';
  if (scope === ACCESS_CONTROL_SCOPE.ONLY_ADMIN) return 'onlyAdmin';
  return 'advanced';
};

export const resolveTagMountPermissionPresetKeyFromTag = (
  tag: TagTreeNode | undefined
): TagMountPermissionPresetKey => {
  if (!tag) return 'advanced';
  return resolveTagMountPermissionPresetKey({
    tagMountPermissionScope: tag.tagMountPermissionScope,
    tagMountSpecifiedUsers: tag.tagMountSpecifiedUsers,
  });
};
