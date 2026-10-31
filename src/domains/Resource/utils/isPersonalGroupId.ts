const PERSONAL_GROUP_PREFIX = 'p_';

export const isPersonalGroupId = (groupId?: string): boolean =>
  groupId?.startsWith(PERSONAL_GROUP_PREFIX) ?? false;
