/** 小组类型 */
export const GROUP_TYPE = { NORMAL: 1, ADVANCED: 2, PUBLIC: 3 } as const;
export const GROUP_TYPE_LABELS: Record<number, string> = {
  1: '普通组',
  2: '高级组',
  3: '集市组',
};
export const getGroupTypeLabel = (v: number) => GROUP_TYPE_LABELS[v] ?? String(v);

/** 关系类型（我加入的 / 我管理的） */
export const RELATION_TYPE_MAP: Record<string, 1 | 2> = {
  managed: 1,
  joined: 2,
};

/** 身份类型 → 可创建的小组类型列表 */
export const ALLOWED_GROUP_TYPES_MAP: Record<number, number[]> = {
  1: [GROUP_TYPE.NORMAL],
  2: [GROUP_TYPE.NORMAL, GROUP_TYPE.ADVANCED],
  3: [GROUP_TYPE.NORMAL, GROUP_TYPE.ADVANCED, GROUP_TYPE.PUBLIC],
};
