import {
  areResourcePermissionActionsEqual,
  filterSupportedResourcePermissionActions,
  type ResourceAction,
} from '@/domains/_shared/access';
import {
  type ResourcePermissionActionOption,
  type ResourcePermissionOverview,
  type ResourcePermissionSubject,
} from '@/domains/ResourceAccess';
import { getTagPermissionPresetValues, type TagPermissionPresetKey } from '@/domains/Tag';
import i18n from '@/i18n';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

import { TAG_PERMISSION_PRESETS } from './tagPermissionPreset';

export type ResourcePermissionPresetKey = 'inherit' | TagPermissionPresetKey;

export interface ResourcePermissionPresetOption {
  key: ResourcePermissionPresetKey;
  label: string;
  description: string;
  detail: string;
}

export interface ResourcePermissionPolicy {
  groupSubject?: ResourcePermissionSubject;
  primaryTagId?: string;
  supportedActions: ResourceAction[];
  inheritedActions: ResourceAction[] | undefined;
  activeActions: ResourceAction[];
  isResourceOverride: boolean;
}

export interface ResolveResourcePermissionPolicyParams {
  overview: ResourcePermissionOverview;
  groupId: string;
  fallbackTagId?: string;
  inheritedActions?: ResourceAction[];
}

const createResourcePermissionPresetOption = (
  key: ResourcePermissionPresetKey
): ResourcePermissionPresetOption => ({
  key,
  get label() {
    return i18n.t(`permission.preset.${key}.label`, { ns: 'resource' });
  },
  get description() {
    return i18n.t(`permission.preset.${key}.description`, { ns: 'resource' });
  },
  get detail() {
    return i18n.t(`permission.preset.${key}.detail`, { ns: 'resource' });
  },
});

const RESOURCE_PERMISSION_INHERIT_OPTION = createResourcePermissionPresetOption('inherit');

const RESOURCE_PERMISSION_PRESET_OVERRIDES: Record<
  TagPermissionPresetKey,
  ResourcePermissionPresetOption
> = {
  private: createResourcePermissionPresetOption('private'),
  readonly: createResourcePermissionPresetOption('readonly'),
  shared: createResourcePermissionPresetOption('shared'),
  custom: createResourcePermissionPresetOption('custom'),
};

export const RESOURCE_PERMISSION_PRESETS: ResourcePermissionPresetOption[] = [
  RESOURCE_PERMISSION_INHERIT_OPTION,
  ...TAG_PERMISSION_PRESETS.map((preset) => RESOURCE_PERMISSION_PRESET_OVERRIDES[preset.key]),
];

const TAG_PRESET_KEYS_WITH_VALUES = TAG_PERMISSION_PRESETS.filter((preset) => preset.values).map(
  (preset) => preset.key
) as Array<Exclude<TagPermissionPresetKey, 'custom'>>;

export const getResourcePermissionPresetActions = (
  key: ResourcePermissionPresetKey,
  supportedActions: ResourceAction[]
): ResourceAction[] | undefined => {
  if (key === 'inherit' || key === 'custom') return undefined;
  const presetValues = getTagPermissionPresetValues(key);
  if (!presetValues) return undefined;
  return filterSupportedResourcePermissionActions(presetValues.grantedActions, supportedActions);
};

export const resolveResourcePermissionPresetKey = (
  actions: ResourceAction[] | null | undefined,
  supportedActions: ResourceAction[]
): ResourcePermissionPresetKey => {
  for (const presetKey of TAG_PRESET_KEYS_WITH_VALUES) {
    const presetActions = getResourcePermissionPresetActions(presetKey, supportedActions);
    if (areResourcePermissionActionsEqual(actions, presetActions, supportedActions)) {
      return presetKey;
    }
  }
  return 'custom';
};

export const getResourcePermissionActionLabel = (action: ResourceAction): string => {
  const key = action;
  return key ? i18n.t(`permission.actions.${key}`, { ns: 'resource' }) : String(action);
};

export const buildResourcePermissionActionKeySet = (
  actions: ResourceAction[] | null | undefined,
  actionOptions: ResourcePermissionActionOption[]
): Set<string> => {
  const supportedActions = actionOptions
    .filter((option) => option.supported)
    .map((option) => option.action);
  const actionSet = new Set(filterSupportedResourcePermissionActions(actions, supportedActions));
  return new Set(
    actionOptions.filter((option) => actionSet.has(option.action)).map((option) => option.key)
  );
};

export const filterResourcePermissionActionsByOptions = (
  actions: ResourceAction[] | null | undefined,
  actionOptions: ResourcePermissionActionOption[]
): ResourceAction[] =>
  filterSupportedResourcePermissionActions(
    actions,
    actionOptions.filter((option) => option.supported).map((option) => option.action)
  );

export const areResourcePermissionActionsEqualByOptions = (
  left: ResourceAction[] | null | undefined,
  right: ResourceAction[] | null | undefined,
  actionOptions: ResourcePermissionActionOption[]
): boolean =>
  areResourcePermissionActionsEqual(
    left,
    right,
    actionOptions.filter((option) => option.supported).map((option) => option.action)
  );

const findCurrentGroupSubject = (
  overview: ResourcePermissionOverview,
  groupId: string
): ResourcePermissionSubject | undefined =>
  overview.subjects.find(
    (subject) =>
      subject.kind === 'group' &&
      subject.groupId === groupId &&
      (subject.source === 'tag' || subject.source === 'resourceOverride')
  );

export const resolveResourcePermissionPolicy = ({
  overview,
  groupId,
  fallbackTagId,
  inheritedActions,
}: ResolveResourcePermissionPolicyParams): ResourcePermissionPolicy => {
  const supportedActions = overview.supportedActions;
  const groupSubject = findCurrentGroupSubject(overview, groupId);
  const primaryTagId = groupSubject?.primaryTagId ?? fallbackTagId;
  const knownInheritedActions =
    inheritedActions ??
    (groupSubject?.inheritance?.status === 'ready' ? groupSubject.inheritance.actions : undefined);
  const normalizedInheritedActions =
    knownInheritedActions === undefined
      ? undefined
      : filterSupportedResourcePermissionActions(knownInheritedActions, supportedActions);
  const overrideActions =
    groupSubject?.source === 'resourceOverride'
      ? filterSupportedResourcePermissionActions(groupSubject.editableActions, supportedActions)
      : undefined;
  return {
    groupSubject,
    primaryTagId,
    supportedActions,
    inheritedActions: normalizedInheritedActions,
    activeActions: overrideActions ?? normalizedInheritedActions ?? [],
    isResourceOverride: groupSubject?.source === 'resourceOverride',
  };
};

export const buildResourceOverrideActions = (
  actions: ResourceAction[],
  inheritedActions: ResourceAction[] | undefined,
  supportedActions: ResourceAction[]
): ResourceAction[] | null => {
  if (inheritedActions === undefined) {
    throw createClientError(FRONTEND_CLIENT_ERROR.VALIDATION, { field: 'inheritedActions' });
  }
  const normalizedActions = filterSupportedResourcePermissionActions(actions, supportedActions);
  if (areResourcePermissionActionsEqual(normalizedActions, inheritedActions, supportedActions)) {
    return null;
  }
  return normalizedActions;
};
