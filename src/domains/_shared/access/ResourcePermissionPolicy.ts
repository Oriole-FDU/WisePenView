import {
  getResourceActionImpliedActions,
  normalizeResourceActions,
  RESOURCE_ACTION,
  RESOURCE_PERMISSION_ACTION_ORDER,
  type ResourceAction,
} from './ResourceAction';

/**
 * 负责权限编辑器中的动作过滤、高低阶联动与集合比较。
 * 后端动作名称由各领域 API Contract 校验。
 */
export type ConfigurableResourceAction = Exclude<
  ResourceAction,
  typeof RESOURCE_ACTION.MARKET_VIEW
>;

/** 普通权限编辑器可选动作；MARKET_VIEW 只能由市场授予。 */
export const CONFIGURABLE_RESOURCE_ACTIONS = RESOURCE_PERMISSION_ACTION_ORDER.filter(
  (action): action is ConfigurableResourceAction => action !== RESOURCE_ACTION.MARKET_VIEW
);

export const filterSupportedResourcePermissionActions = (
  actions: readonly ResourceAction[] | null | undefined,
  supportedActions: readonly ResourceAction[]
): ResourceAction[] => {
  const supportedActionSet = new Set(supportedActions);
  return normalizeResourceActions(actions).filter((action) => supportedActionSet.has(action));
};

const resourceActionImplies = (candidate: ResourceAction, required: ResourceAction): boolean =>
  candidate === required || getResourceActionImpliedActions(candidate).includes(required);

/** 根据高低阶权限联动规则更新受控 action 集合。 */
export const updateResourceActionSelection = (
  currentActions: readonly ResourceAction[] | null | undefined,
  action: ResourceAction,
  checked: boolean,
  supportedActions?: readonly ResourceAction[]
): ResourceAction[] => {
  const normalizedCurrentActions = supportedActions
    ? filterSupportedResourcePermissionActions(currentActions, supportedActions)
    : normalizeResourceActions(currentActions);

  if (checked) {
    const nextActions = normalizeResourceActions([...normalizedCurrentActions, action]);
    return supportedActions
      ? filterSupportedResourcePermissionActions(nextActions, supportedActions)
      : nextActions;
  }

  const nextActions = normalizedCurrentActions.filter(
    (currentAction) => !resourceActionImplies(currentAction, action)
  );
  return supportedActions
    ? filterSupportedResourcePermissionActions(nextActions, supportedActions)
    : normalizeResourceActions(nextActions);
};

export const areResourcePermissionActionsEqual = (
  left: readonly ResourceAction[] | null | undefined,
  right: readonly ResourceAction[] | null | undefined,
  supportedActions?: readonly ResourceAction[]
): boolean => {
  const normalize = (actions: readonly ResourceAction[] | null | undefined): ResourceAction[] =>
    supportedActions
      ? filterSupportedResourcePermissionActions(actions, supportedActions)
      : normalizeResourceActions(actions);
  const leftActions = normalize(left);
  const rightActions = normalize(right);
  return (
    leftActions.length === rightActions.length &&
    leftActions.every((action) => rightActions.includes(action))
  );
};
