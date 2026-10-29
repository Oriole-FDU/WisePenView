import { ResourceActionListSchema } from './AccessPolicy.schema';
import { normalizeResourceActions, type ResourceAction } from './ResourceAction';

/**
 * 临时兼容入口：为尚未接入 Zod Contract 的 actions 响应提供运行时校验。
 *
 * TODO(access-policy-schema): 所有 actions 响应完成 Contract 化后删除，
 * 由 Contract 校验 wire shape，mapper 只负责 normalizeResourceActions。
 */
export const parseResourceActions = (
  values: readonly unknown[] | null | undefined
): ResourceAction[] => normalizeResourceActions(ResourceActionListSchema.parse(values ?? []));
