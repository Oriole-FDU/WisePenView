/** 业务上，以 `p_` 开头的 groupId 为个人tag的groupId，不应传给后端，按无 groupId 处理 */
export const normalizeTagGroupId = (groupId?: string): string | undefined =>
  groupId !== undefined && groupId.startsWith('p_') ? undefined : groupId;
