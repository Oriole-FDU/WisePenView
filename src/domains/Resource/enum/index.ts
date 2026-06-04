import type { EnumKey, EnumValue } from '@/utils/enum';
import { createEnum } from '@/utils/enum';

/** 资源类型 */
export const RESOURCE_TYPE = createEnum([
  { value: 'note', key: 'NOTE', label: '笔记' },
  { value: 'file', key: 'FILE', label: '文件' },
] as const);

/** 排序字段枚举 */
export const RESOURCE_SORT_BY = createEnum([
  { value: 'UPDATE_TIME', key: 'UPDATE_TIME', label: '更新时间' },
  { value: 'CREATE_TIME', key: 'CREATE_TIME', label: '创建时间' },
  { value: 'NAME', key: 'NAME', label: '名称' },
  { value: 'SIZE', key: 'SIZE', label: '大小' },
] as const);

/** 排序方向枚举 */
export const RESOURCE_SORT_DIR = createEnum([
  { value: 'ASC', key: 'ASC', label: '升序' },
  { value: 'DESC', key: 'DESC', label: '降序' },
] as const);

/** 标签查询逻辑：OR=包含任意标签，AND=包含全部标签 */
export const TAG_QUERY_LOGIC_MODE = createEnum([
  { value: 'OR', key: 'OR', label: '包含任意' },
  { value: 'AND', key: 'AND', label: '包含全部' },
] as const);

/** 资源访问权限（与后端 ResourceAction 对齐） */
export const RESOURCE_ACTION = createEnum([
  { value: 1, key: 'DISCOVER', label: '列表可见' },
  { value: 2, key: 'VIEW', label: '在线阅读' },
  { value: 4, key: 'EDIT', label: '协同编辑' },
  { value: 8, key: 'DOWNLOAD_WATERMARK', label: '导出/下载带水印' },
  { value: 16, key: 'DOWNLOAD_ORIGINAL', label: '下载源文件' },
] as const);

export type TagQueryLogicMode = EnumValue<typeof TAG_QUERY_LOGIC_MODE>;

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

const RESOURCE_ACTION_IMPLIED_MASK: Record<ResourceAction, number> = {
  [RESOURCE_ACTION.DISCOVER]: RESOURCE_ACTION.DISCOVER,
  [RESOURCE_ACTION.VIEW]: RESOURCE_ACTION.VIEW | RESOURCE_ACTION.DISCOVER,
  [RESOURCE_ACTION.EDIT]: RESOURCE_ACTION.EDIT | RESOURCE_ACTION.VIEW | RESOURCE_ACTION.DISCOVER,
  [RESOURCE_ACTION.DOWNLOAD_WATERMARK]:
    RESOURCE_ACTION.DOWNLOAD_WATERMARK | RESOURCE_ACTION.VIEW | RESOURCE_ACTION.DISCOVER,
  [RESOURCE_ACTION.DOWNLOAD_ORIGINAL]:
    RESOURCE_ACTION.DOWNLOAD_ORIGINAL |
    RESOURCE_ACTION.DOWNLOAD_WATERMARK |
    RESOURCE_ACTION.VIEW |
    RESOURCE_ACTION.DISCOVER,
};

const RESOURCE_ACTION_ORDER = RESOURCE_ACTION.options.map((item) => item.value as ResourceAction);

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
  if (!raw?.length) return [];
  const resolved = raw
    .map(coerceResourceActionItem)
    .filter((action): action is ResourceAction => action != null);
  return normalizeResourceActions(resolved);
};

export const normalizeResourceActions = (actions?: ResourceAction[]): ResourceAction[] => {
  const normalized = permissionCodeToActions(actionsToPermissionCode(actions));
  return RESOURCE_ACTION_ORDER.filter((value) => normalized.includes(value));
};

export const resourceActionsInclude = (
  actions: unknown[] | ResourceAction[] | null | undefined,
  action: ResourceAction
): boolean => coerceResourceActions(actions as unknown[] | null | undefined).includes(action);

/** Note 不参与下载类权限的配置与展示 */
const NOTE_NON_CONFIGURABLE_RESOURCE_ACTIONS = new Set<ResourceAction>([
  RESOURCE_ACTION.DOWNLOAD_WATERMARK,
  RESOURCE_ACTION.DOWNLOAD_ORIGINAL,
]);

export const isNoteConfigurableResourceAction = (action: ResourceAction): boolean =>
  !NOTE_NON_CONFIGURABLE_RESOURCE_ACTIONS.has(action);

/** 去掉下载类动作，用于 Note 权限配置读写 */
export const maskNoteConfigurableResourceActions = (
  actions?: ResourceAction[] | null
): ResourceAction[] =>
  normalizeResourceActions(actions ?? undefined).filter(isNoteConfigurableResourceAction);

/** Note 权限弹窗可选项（不含导出/下载） */
export const NOTE_CONFIGURABLE_RESOURCE_ACTION_OPTIONS = RESOURCE_ACTION.options.filter((item) =>
  isNoteConfigurableResourceAction(item.value as ResourceAction)
);
