import type { EnumKey, EnumValue } from '@/utils/type/enum';
import { createEnum } from '@/utils/type/enum';

/** 排序字段枚举 */
export const RESOURCE_SORT_BY = createEnum([
  { value: 'UPDATE_TIME', key: 'UPDATE_TIME' },
  { value: 'CREATE_TIME', key: 'CREATE_TIME' },
  { value: 'NAME', key: 'NAME' },
  { value: 'SIZE', key: 'SIZE' },
] as const);

/** 排序方向枚举 */
export const RESOURCE_SORT_DIR = createEnum([
  { value: 'ASC', key: 'ASC' },
  { value: 'DESC', key: 'DESC' },
] as const);

/** 标签查询逻辑：OR=包含任意标签，AND=包含全部标签 */
export const TAG_QUERY_LOGIC_MODE = createEnum([
  { value: 'OR', key: 'OR' },
  { value: 'AND', key: 'AND' },
] as const);

/** 全文搜索范围：与后端 SearchScope 枚举字面值一致 */
export const SEARCH_SCOPE = createEnum([
  { value: 'ALL', key: 'ALL' },
  { value: 'DOCUMENT', key: 'DOCUMENT' },
  { value: 'NOTE', key: 'NOTE' },
] as const);

/** 全文搜索可命中的资源细分类型：仅文档类 + 笔记（Skill/Agent 属 AI 资产，不进搜索）；小写值对齐后端 extension */
const SEARCH_RESOURCE_TYPE = createEnum([
  { value: 'note', key: 'NOTE' },
  { value: 'drawio', key: 'DRAWIO' },
  { value: 'pdf', key: 'PDF' },
  { value: 'doc', key: 'DOC' },
  { value: 'docx', key: 'DOCX' },
  { value: 'ppt', key: 'PPT' },
  { value: 'pptx', key: 'PPTX' },
  { value: 'xls', key: 'XLS' },
  { value: 'xlsx', key: 'XLSX' },
  { value: 'unknown', key: 'UNKNOWN' },
] as const);

/** 资源访问权限（与后端 ResourceAction 对齐） */
export const RESOURCE_ACTION = createEnum([
  { value: 1, key: 'DISCOVER' },
  { value: 2, key: 'VIEW' },
  { value: 4, key: 'LOAD' },
  { value: 8, key: 'EDIT' },
  { value: 16, key: 'INLINE_COMMENT' },
  { value: 32, key: 'DOWNLOAD_WATERMARK' },
  { value: 64, key: 'DOWNLOAD_ORIGINAL' },
  { value: 128, key: 'FORK' },
  { value: 256, key: 'COMMENT' },
] as const);

export type TagQueryLogicMode = EnumValue<typeof TAG_QUERY_LOGIC_MODE>;
export type SearchScope = EnumValue<typeof SEARCH_SCOPE>;
export type SearchResourceType = EnumValue<typeof SEARCH_RESOURCE_TYPE>;

/** 后端 resourceType 大小写不敏感，统一归一化为小写枚举值，未知归 'unknown' */
export const normalizeSearchResourceType = (raw: string): SearchResourceType => {
  const lower = raw.trim().toLowerCase();
  return lower in SEARCH_RESOURCE_TYPE.configs
    ? (lower as SearchResourceType)
    : SEARCH_RESOURCE_TYPE.UNKNOWN;
};

export type ResourceSortBy = EnumValue<typeof RESOURCE_SORT_BY>;
export type ResourceSortDir = EnumValue<typeof RESOURCE_SORT_DIR>;
export type ResourceAction = EnumValue<typeof RESOURCE_ACTION>;
export type ResourceActionKey = EnumKey<typeof RESOURCE_ACTION>;

/** POST 请求体：后端 Jackson 按枚举名（如 VIEW）反序列化，勿传数字 code */
export const resourceActionsToApiKeys = (
  actions?: ResourceAction[] | null
): ResourceActionKey[] | null | undefined => {
  if (actions === null) return null;
  if (actions === undefined) return undefined;
  return normalizeResourceActions(actions)
    .map((action) => RESOURCE_ACTION.getKey(action))
    .filter((key): key is ResourceActionKey => key != null);
};

/** 权限动作的隐含低阶动作位，用常量维护高低权限关系。 */
export const RESOURCE_ACTION_IMPLIED_MASK: Record<ResourceAction, number> = {
  [RESOURCE_ACTION.DISCOVER]: RESOURCE_ACTION.DISCOVER,
  [RESOURCE_ACTION.VIEW]: RESOURCE_ACTION.VIEW | RESOURCE_ACTION.DISCOVER,
  [RESOURCE_ACTION.LOAD]: RESOURCE_ACTION.LOAD | RESOURCE_ACTION.VIEW | RESOURCE_ACTION.DISCOVER,
  [RESOURCE_ACTION.EDIT]: RESOURCE_ACTION.EDIT | RESOURCE_ACTION.VIEW | RESOURCE_ACTION.DISCOVER,
  [RESOURCE_ACTION.INLINE_COMMENT]:
    RESOURCE_ACTION.INLINE_COMMENT | RESOURCE_ACTION.VIEW | RESOURCE_ACTION.DISCOVER,
  [RESOURCE_ACTION.DOWNLOAD_WATERMARK]:
    RESOURCE_ACTION.DOWNLOAD_WATERMARK | RESOURCE_ACTION.VIEW | RESOURCE_ACTION.DISCOVER,
  [RESOURCE_ACTION.DOWNLOAD_ORIGINAL]:
    RESOURCE_ACTION.DOWNLOAD_ORIGINAL |
    RESOURCE_ACTION.DOWNLOAD_WATERMARK |
    RESOURCE_ACTION.VIEW |
    RESOURCE_ACTION.DISCOVER,
  [RESOURCE_ACTION.FORK]:
    RESOURCE_ACTION.FORK |
    RESOURCE_ACTION.DOWNLOAD_WATERMARK |
    RESOURCE_ACTION.VIEW |
    RESOURCE_ACTION.DISCOVER,
  [RESOURCE_ACTION.COMMENT]:
    RESOURCE_ACTION.COMMENT | RESOURCE_ACTION.VIEW | RESOURCE_ACTION.DISCOVER,
};

export const RESOURCE_PERMISSION_ACTION_ORDER = RESOURCE_ACTION.options.map(
  (item) => item.value as ResourceAction
);

const NOTE_LIKE_RESOURCE_TYPES = new Set(['note', 'drawio']);
const AI_ASSET_RESOURCE_TYPES = new Set(['skill', 'agent']);
const HTML_RESOURCE_TYPES = new Set(['html', 'single_html_page']);

export const getResourceActionImpliedMask = (action: ResourceAction): number =>
  RESOURCE_ACTION_IMPLIED_MASK[action] ?? action;

export const permissionCodeToActions = (permissionCode: number): ResourceAction[] =>
  RESOURCE_ACTION.options
    .map((item) => item.value as ResourceAction)
    .filter((action) => (permissionCode & action) !== 0);

export const actionsToPermissionCode = (actions?: ResourceAction[]): number => {
  if (!actions || actions.length === 0) return 0;
  return actions.map((action) => getResourceActionImpliedMask(action)).reduce((a, b) => a | b, 0);
};

export const hasResourceAction = (permissionCode: number, action: ResourceAction): boolean =>
  (permissionCode & action) !== 0;

export const getResourceActionImpliedActions = (action: ResourceAction): ResourceAction[] =>
  permissionCodeToActions(getResourceActionImpliedMask(action)).filter((item) => item !== action);

/** 将接口可能返回的枚举名（如 VIEW）或数字 code 解析为 ResourceAction */
const coerceResourceActionItem = (item: unknown): ResourceAction | null => {
  if (typeof item === 'number' && item in RESOURCE_ACTION.configs) {
    return item as ResourceAction;
  }
  if (typeof item === 'string') {
    const byKey = (RESOURCE_ACTION.values as Record<string, number>)[item];
    if (byKey !== undefined) return byKey as ResourceAction;
    const asNumber = Number(item);
    if (!Number.isNaN(asNumber) && asNumber in RESOURCE_ACTION.configs) {
      return asNumber as ResourceAction;
    }
  }
  return null;
};

/** 解析后端 List<ResourceAction>（JSON 常为枚举名字符串）并归一化隐含权限 */
export const coerceResourceActions = (raw?: unknown[] | null): ResourceAction[] => {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  const resolved = raw
    .map(coerceResourceActionItem)
    .filter((action): action is ResourceAction => action != null);
  return normalizeResourceActions(resolved);
};

export const normalizeResourceActions = (actions?: ResourceAction[]): ResourceAction[] => {
  const normalized = permissionCodeToActions(actionsToPermissionCode(actions));
  return RESOURCE_PERMISSION_ACTION_ORDER.filter((value) => normalized.includes(value));
};

/** 按资源类型过滤配置面板可展示和可写入的权限动作。 */
export const getSupportedResourcePermissionActions = (resourceType?: string): ResourceAction[] => {
  const normalizedType = resourceType?.trim().toLowerCase();
  const unsupportedActions = new Set<ResourceAction>();

  if (NOTE_LIKE_RESOURCE_TYPES.has(normalizedType ?? '')) {
    unsupportedActions.add(RESOURCE_ACTION.LOAD);
    unsupportedActions.add(RESOURCE_ACTION.DOWNLOAD_WATERMARK);
    unsupportedActions.add(RESOURCE_ACTION.DOWNLOAD_ORIGINAL);
  }

  if (normalizedType === 'drawio') {
    unsupportedActions.add(RESOURCE_ACTION.COMMENT);
    unsupportedActions.add(RESOURCE_ACTION.INLINE_COMMENT);
  }

  if (HTML_RESOURCE_TYPES.has(normalizedType ?? '')) {
    unsupportedActions.add(RESOURCE_ACTION.INLINE_COMMENT);
    unsupportedActions.add(RESOURCE_ACTION.DOWNLOAD_WATERMARK);
    unsupportedActions.add(RESOURCE_ACTION.DOWNLOAD_ORIGINAL);
    unsupportedActions.add(RESOURCE_ACTION.FORK);
    unsupportedActions.add(RESOURCE_ACTION.COMMENT);
  }

  if (!AI_ASSET_RESOURCE_TYPES.has(normalizedType ?? '')) {
    unsupportedActions.add(RESOURCE_ACTION.LOAD);
  }

  return RESOURCE_PERMISSION_ACTION_ORDER.filter((action) => !unsupportedActions.has(action));
};

export const filterSupportedResourcePermissionActions = (
  actions: ResourceAction[] | null | undefined,
  supportedActions: ResourceAction[]
): ResourceAction[] => {
  const supportedActionSet = new Set(supportedActions);
  return normalizeResourceActions(actions ?? undefined).filter((action) =>
    supportedActionSet.has(action)
  );
};

/** 根据高低阶权限联动规则更新受控 action 集合。 */
export const updateResourceActionSelection = (
  currentActions: ResourceAction[] | null | undefined,
  action: ResourceAction,
  checked: boolean,
  supportedActions?: ResourceAction[]
): ResourceAction[] => {
  const normalizedCurrentActions = supportedActions
    ? filterSupportedResourcePermissionActions(currentActions, supportedActions)
    : normalizeResourceActions(currentActions ?? undefined);
  const nextActions = checked
    ? normalizeResourceActions([...normalizedCurrentActions, action])
    : normalizeResourceActions(
        normalizedCurrentActions.filter(
          (currentAction) => !hasResourceAction(getResourceActionImpliedMask(currentAction), action)
        )
      );

  return supportedActions
    ? filterSupportedResourcePermissionActions(nextActions, supportedActions)
    : nextActions;
};

export const areResourcePermissionActionsEqual = (
  left: ResourceAction[] | null | undefined,
  right: ResourceAction[] | null | undefined,
  supportedActions?: ResourceAction[]
): boolean => {
  const normalize = (actions: ResourceAction[] | null | undefined): ResourceAction[] =>
    supportedActions
      ? filterSupportedResourcePermissionActions(actions, supportedActions)
      : normalizeResourceActions(actions ?? undefined);
  const leftActions = normalize(left);
  const rightActions = normalize(right);
  if (leftActions.length !== rightActions.length) return false;
  return leftActions.every((action) => rightActions.includes(action));
};

export const resourceActionsInclude = (
  actions: unknown[] | ResourceAction[] | null | undefined,
  action: ResourceAction
): boolean => coerceResourceActions(actions as unknown[] | null | undefined).includes(action);
