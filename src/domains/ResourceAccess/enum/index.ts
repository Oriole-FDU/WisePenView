import {
  CONFIGURABLE_RESOURCE_ACTIONS,
  RESOURCE_ACTION,
  type ResourceAction,
} from '@/domains/_shared/access';

const NOTE_LIKE_RESOURCE_TYPES = new Set(['note', 'drawio']);
const AI_ASSET_RESOURCE_TYPES = new Set(['skill', 'agent']);
const HTML_RESOURCE_TYPES = new Set(['html', 'single_html_page']);

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

  return CONFIGURABLE_RESOURCE_ACTIONS.filter((action) => !unsupportedActions.has(action));
};
