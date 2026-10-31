import type { ResourceItem, ResourceSkillSummary } from '@/domains/Resource';

export const mapResourceItemToResourceSkillSummary = (
  item: ResourceItem,
  group?: { groupId: string; groupName: string }
): ResourceSkillSummary => ({
  skillId: item.resourceId,
  displayName: item.resourceName,
  description: '',
  scopeType: group ? 'GROUP' : 'PERSONAL',
  ...(group ? { groupId: group.groupId, groupName: group.groupName } : {}),
});
