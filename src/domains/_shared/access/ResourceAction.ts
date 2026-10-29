import type { EnumValue } from '@/utils/type/enum';
import { defineEnum } from '@/utils/type/enum';

/** 资源访问权限；值与后端 JSON 中的枚举名称一致。 */
export const RESOURCE_ACTION = defineEnum([
  'DISCOVER',
  'VIEW',
  'LOAD',
  'EDIT',
  'INLINE_COMMENT',
  'DOWNLOAD_WATERMARK',
  'DOWNLOAD_ORIGINAL',
  'FORK',
  'COMMENT',
  'MARKET_VIEW',
] as const);

export type ResourceAction = EnumValue<typeof RESOURCE_ACTION>;

/** 权限动作隐含的低阶动作；每个动作维护完整传递依赖。 */
export const RESOURCE_ACTION_IMPLIED_ACTIONS: Record<ResourceAction, readonly ResourceAction[]> = {
  [RESOURCE_ACTION.DISCOVER]: [],
  [RESOURCE_ACTION.VIEW]: [RESOURCE_ACTION.DISCOVER],
  [RESOURCE_ACTION.LOAD]: [RESOURCE_ACTION.VIEW, RESOURCE_ACTION.DISCOVER],
  [RESOURCE_ACTION.EDIT]: [RESOURCE_ACTION.VIEW, RESOURCE_ACTION.DISCOVER],
  [RESOURCE_ACTION.INLINE_COMMENT]: [RESOURCE_ACTION.VIEW, RESOURCE_ACTION.DISCOVER],
  [RESOURCE_ACTION.DOWNLOAD_WATERMARK]: [RESOURCE_ACTION.VIEW, RESOURCE_ACTION.DISCOVER],
  [RESOURCE_ACTION.DOWNLOAD_ORIGINAL]: [
    RESOURCE_ACTION.DOWNLOAD_WATERMARK,
    RESOURCE_ACTION.VIEW,
    RESOURCE_ACTION.DISCOVER,
  ],
  [RESOURCE_ACTION.FORK]: [
    RESOURCE_ACTION.DOWNLOAD_WATERMARK,
    RESOURCE_ACTION.VIEW,
    RESOURCE_ACTION.DISCOVER,
  ],
  [RESOURCE_ACTION.COMMENT]: [RESOURCE_ACTION.VIEW, RESOURCE_ACTION.DISCOVER],
  [RESOURCE_ACTION.MARKET_VIEW]: [RESOURCE_ACTION.DISCOVER],
};

export const RESOURCE_PERMISSION_ACTION_ORDER = RESOURCE_ACTION.options.map(
  (item) => item.value as ResourceAction
);

export const getResourceActionImpliedActions = (action: ResourceAction): ResourceAction[] => [
  ...RESOURCE_ACTION_IMPLIED_ACTIONS[action],
];

/** 展开隐含动作、去重，并按后端枚举顺序返回。 */
export const normalizeResourceActions = (
  actions: readonly ResourceAction[] | null | undefined
): ResourceAction[] => {
  const includedActions = new Set<ResourceAction>();
  for (const action of actions ?? []) {
    includedActions.add(action);
    for (const impliedAction of RESOURCE_ACTION_IMPLIED_ACTIONS[action]) {
      includedActions.add(impliedAction);
    }
  }
  return RESOURCE_PERMISSION_ACTION_ORDER.filter((action) => includedActions.has(action));
};

export const resourceActionsInclude = (
  actions: readonly ResourceAction[] | null | undefined,
  action: ResourceAction
): boolean => normalizeResourceActions(actions).includes(action);
